# CDEK Order, Label, and Tracking Return Flow

Date: 2026-04-28
Provider: CDEK
Status: `review`

## Requested Business Outcomes

The current API key must support three return flows:

1. After a user places an order, the system creates an internal order number and sends it to the admin backend for manual review. After admin approval, the backend calls CDEK to create the carrier order, then returns the carrier result to both the user side and admin side.
2. The same approved order flow should return a shipping label if CDEK supports label return.
3. The API should return tail-end logistics tracking and keep it updated automatically.

## PM / CEO Review

### Core Value

The valuable product loop is not "call CDEK as soon as the customer clicks submit". The right loop is:

1. Customer submits logistics order.
2. Platform creates an internal order and holds it for admin review.
3. Admin approves/rejects.
4. Only approved orders are submitted to CDEK.
5. CDEK carrier identifiers, label status, and tracking events are returned to the customer and admin surfaces through our own backend.

This protects operations from bad addresses, missing customs data, wrong tariff selection, and accidental carrier-side order creation.

### Customer Path

- User submits order and sees platform order number immediately.
- Before approval, user sees an internal status like `审核中`.
- After approval and CDEK submission, user sees CDEK waybill/tracking number once available.
- Label visibility should be role-based. Admin definitely needs it; user visibility depends on business policy.
- User sees normalized tracking timeline, not raw carrier internals.

### Admin Path

- Admin sees newly submitted internal order.
- Admin reviews address, package, recipient, tariff, and customs/item fields.
- Admin approves release to CDEK.
- Backend calls CDEK order creation.
- Admin sees CDEK `entity.uuid`, `cdek_number`, request state, label generation state, and latest tracking sync result.

### Edge Cases

- User order created internally but admin rejects it.
- Admin approves but CDEK order creation returns validation errors.
- CDEK accepts creation but `cdek_number` is not immediately available.
- Label generation is accepted but PDF is still processing.
- Label PDF link expires.
- Tracking auth is unavailable or separate credentials are missing.
- CDEK tracking returns raw events that should not be shown directly to customers.

## Eng Review

### Flow 1: Internal Order Then CDEK Order

Relevant CDEK docs:

- Create order: `POST /v2/orders`
- Get order info: `GET /v2/orders/{entity_uuid}`

Important behavior:

- CDEK create order returns HTTP `202` when accepted for processing.
- The create response gives `entity.uuid`.
- The create response does not directly return the final CDEK waybill number.
- Use `GET /v2/orders/{entity_uuid}` to retrieve the CDEK result and `cdek_number`.
- The docs state `cdek_number` is available when request state is successful.

Recommended internal state machine:

| State | Owner | Meaning |
| --- | --- | --- |
| `draft_submitted` | User/backend | User submitted order; internal order number created |
| `pending_admin_review` | Admin | Waiting for manual review |
| `admin_rejected` | Admin | Stopped before CDEK submission |
| `approved_for_carrier` | Admin | Ready to call CDEK |
| `carrier_create_submitted` | Backend | `POST /v2/orders` accepted; `entity.uuid` stored |
| `carrier_create_failed` | Backend | CDEK rejected or validation failed |
| `carrier_number_ready` | Backend | `cdek_number` resolved via order info |
| `tracking_active` | Backend | Tracking sync can start |

Return targets:

- User side: internal order number, display status, CDEK tracking number when ready, normalized timeline.
- Admin side: full review data, provider request state, provider ids, raw error messages, label status, tracking sync status.

### Flow 2: Shipping Label Return

Manual check result: CDEK API 2.0 does support label generation and label retrieval.

Relevant CDEK docs:

- Generate label: `POST /v2/print/barcodes`
- Get label metadata: `GET /v2/print/barcodes/{uuid}`
- Download PDF: `GET /v2/print/barcodes/{uuid}.pdf`

Important behavior:

- Label generation is a separate request after order creation.
- Label generation accepts `orders[]`.
- Each order can be identified by `order_uuid` or `cdek_number`.
- The generate call returns label task `entity.uuid`.
- `GET /v2/print/barcodes/{uuid}` returns label metadata, statuses, and `url`.
- The PDF `url` exists only when label status is `READY`.
- The label PDF link can expire.
- The docs say the label `entity.uuid` is valid for 60 minutes after order creation.
- Downloading the PDF requires an authenticated `GET` request with headers.

Recommended label states:

| State | Meaning |
| --- | --- |
| `not_requested` | Label has not been requested |
| `label_create_submitted` | `POST /v2/print/barcodes` accepted |
| `label_processing` | CDEK is generating PDF |
| `label_ready` | PDF link/file is available |
| `label_expired` | Download link expired |
| `label_failed` | CDEK returned an error |

Implementation note:

- Store `label_uuid`, `label_status`, `label_url`, and raw label metadata.
- Prefer storing the downloaded PDF in project-controlled storage if business policy requires durable access, because CDEK PDF links may expire.

### Flow 3: Tail-End Tracking Auto Update

Relevant CDEK docs:

- Tracking auth: `POST https://auth.api.cdek.ru/web/simpleauth/authorize`
- Tracking query: `POST https://tracing.api.cdek.ru/web/tracing/v2/order/find`

Important behavior:

- Tracking does not use the standard `/v2/oauth/token` bearer token.
- Tracking requires `user` and `hashedPass`.
- `hashedPass` is an MD5 hash of the tracing password according to the manual.
- The tracking query uses `X-Auth-Token`.
- Request body uses `orderNumber`, which is the CDEK order number.
- Response includes `result.order`, `statusGroups`, and fine-grained `statuses`.

Recommended sync model:

- Start tracking only after `cdek_number` is known.
- Poll on a backend schedule or worker.
- Store raw CDEK events.
- Map raw events into product statuses before showing them to customers.
- Admin can see provider diagnostics; customer sees clean logistics timeline.

Suggested customer-facing status groups:

| Internal Status | Example CDEK Codes |
| --- | --- |
| `created` | `CREATED` |
| `accepted` | `ACCEPTED_FOR_DELIVERY` |
| `in_transit` | `SENT_TO_SORTING_CENTER`, `ACCEPTED_AT_SORTING_CENTER`, `SENT_TO_NEXT_CITY`, `SENT_TO_RECEIVER_COUNTRY` |
| `customs` | `SENDER_COUNTRY_CUSTOM_CLEARANCE`, `RECEIVER_COUNTRY_CUSTOM_CLEARANCE`, `CUSTOM_CLEARANCE_COMPLETED` |
| `ready_for_pickup` | `READY_FOR_PICK_UP`, `POSTAMAT_READY_FOR_PICK_UP` |
| `out_for_delivery` | `PICKED_UP_BY_COURIER` |
| `delivery_failed` | `COURIER_DELIVERY_FAILED`, `NOT_DELIVERED` |
| `delivered` | `DELIVERED` |

## Required Backend Components

- `CdekAuthClient`: standard API token.
- `CdekOrderClient`: create and query CDEK order.
- `CdekLabelClient`: generate label, poll label state, download PDF.
- `CdekTrackingClient`: separate tracing auth and tracking query.
- `CarrierOrderReleaseService`: triggered by admin approval, orchestrates CDEK order creation and follow-up query.
- `CarrierTrackingSyncService`: scheduled or queued tracking refresh.
- `CarrierLabelService`: label creation and durable PDF handling.

## Data Contract Draft

### User-Facing Order Return

- `internalOrderNumber`
- `status`
- `carrier`
- `carrierTrackingNumber`
- `labelAvailable`
- `trackingEvents[]`

### Admin-Facing Order Return

- `internalOrderNumber`
- `reviewStatus`
- `carrierCreateState`
- `providerEntityUuid`
- `cdekNumber`
- `labelUuid`
- `labelStatus`
- `labelUrl`
- `trackingSyncStatus`
- `providerRawErrors[]`

## Blockers Before Coding

- Confirm whether the label PDF should be shown to the user or only to admins.
- Confirm tracing credentials. The production OAuth key that was tested is valid for standard CDEK API, but the manual describes tracking as a separate auth flow.
- Confirm whether label PDFs must be stored in Supabase Storage or fetched on demand.
- Confirm exact admin approval statuses and audit requirements.

## Recommended Build Order

1. Internal order review state machine.
2. CDEK order release after admin approval.
3. Poll/fetch CDEK order info until `cdek_number` is available.
4. CDEK label generation and PDF retrieval.
5. Tracking credential setup and sync worker.
6. Customer/admin normalized return surfaces.
