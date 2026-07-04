# CDEK

## Snapshot

- Domain: logistics tail-end carrier / fulfillment provider
- Business module: logistics
- Current status: `intake`
- Official docs: [Yuque API 2.0](https://www.yuque.com/cdek/api2)
- Environments:
  - OAuth/API test: `https://api.edu.cdek.ru`
  - OAuth/API prod: `https://api.cdek.ru`
  - Tracing auth/query use separate hosts

## Why We Need It

- Primary use case: tail-end quote lookup, order creation, and tracking for logistics orders.
- Secondary use cases: admin label printing and courier intake request.
- Not in scope yet: exposing internal first-leg / last-mile mechanics directly to customers.

## Existing Source Material In Repo

- Raw doc manifest: [cdek-api2-crawl-manifest.json](D:/GROUND/docs/cdek-api2-crawl-manifest.json)
- Readable directory map: [cdek-api2-crawl-map.md](D:/GROUND/docs/cdek-api2-crawl-map.md)
- Full text cache: [cdek-api2-fulltext.md](D:/GROUND/docs/cdek-api2-fulltext.md)
- Read-through summary: [cdek-api2-integration-readthrough.md](D:/GROUND/docs/cdek-api2-integration-readthrough.md)

## Auth

### Standard API 2.0

- Method: OAuth client credentials
- Token URL test: `POST https://api.edu.cdek.ru/v2/oauth/token?parameters`
- Token URL prod: `POST https://api.cdek.ru/v2/oauth/token?parameters`
- Content type: `application/x-www-form-urlencoded`
- Required fields:
  - `grant_type=client_credentials`
  - `client_id`
  - `client_secret`
- Token lifetime: about 3599 seconds according to the docs

### Tracking

- Separate auth flow from standard OAuth
- Auth URL: `POST https://auth.api.cdek.ru/web/simpleauth/authorize`
- Tracking URL: `POST https://tracing.api.cdek.ru/web/tracing/v2/order/find`
- Must be implemented as a separate client/config path

## Capability Map

| Capability | Endpoint Group | Needed Now | Notes |
| --- | --- | --- | --- |
| Quote lookup | `/v2/calculator/tarifflist`, `/v2/calculator/tariff` | Yes | Basis for service selection and price/time estimate |
| Admin-approved order release | `/v2/orders` | Yes | Create CDEK order only after internal admin approval |
| Order lookup | `/v2/orders/{entity_uuid}` | Yes | Needed to obtain `cdek_number` after create |
| Tracking | tracing API | Yes | Must map vendor statuses to product timeline |
| City search | `/v2/location/cities` | Yes | Needed for address normalization |
| Service point lookup | `/v2/deliverypoints` | Yes | Needed for pickup point / postamat flows |
| Label generation | `/v2/print/barcodes` | Yes | Required for current return flow; PDF only when label status is `READY` |
| Courier intake | `/v2/intakes*` | Later | Only if pickup workflow is enabled |

## Core Integration Notes

### Quote Lookup

- Discover available services with `POST /v2/calculator/tarifflist`
- Calculate a selected tariff with `POST /v2/calculator/tariff`
- Inputs include:
  - `from_location`
  - `to_location`
  - `packages`
  - optional `type`, `currency`, `lang`, `services`

### Order Creation

- Create order: `POST /v2/orders`
- Important caveat: create does not directly return CDEK waybill number
- Follow-up required: use returned `entity.uuid` with `GET /v2/orders/{entity_uuid}`
- This means our internal state machine should separate:
  - submitted
  - accepted / rejected
  - `cdek_number` resolved

Current business requirement: the frontend order should first create an internal platform order and send it to admin review. CDEK order creation should happen only after admin approval, then the carrier result should be returned to both the user side and admin side.

### Label Return

- Generate label: `POST /v2/print/barcodes`
- Get label state and metadata: `GET /v2/print/barcodes/{uuid}`
- Download PDF: `GET /v2/print/barcodes/{uuid}.pdf`
- The generate request accepts orders identified by `order_uuid` or `cdek_number`.
- The label metadata response can include `url`, but the docs say the PDF link exists only when status is `READY`.
- The PDF link can expire, so durable access may require saving the downloaded PDF into project-controlled storage.

### Tracking

- Tracking returns grouped and detailed statuses
- We should store raw provider events but expose normalized customer-facing statuses
- Do not leak internal logistics decomposition directly to the frontend
- Tracking uses separate credentials and `X-Auth-Token`, not the standard OAuth bearer token.

## Adapter Boundary

- Proposed clients:
  - `CdekAuthClient`
  - `CdekLocationClient`
  - `CdekQuoteClient`
  - `CdekOrderClient`
  - `CdekLabelClient`
  - `CdekTrackingClient`
- Proposed normalized outputs:
  - quote options
  - provider order submission result
  - provider tracking events
  - service point records

## Known Risks

- Credentials are still missing from the repo.
- Tracking auth differs from standard OAuth.
- Service availability depends on contract permissions, so static tariff tables are not enough.
- Some doc URLs contain formatting noise; implementation should use canonical normalized endpoints only.
- Label PDFs are asynchronous and may expire if not downloaded/stored while ready.

## Current Recommendation

When implementation starts, build CDEK as a backend-owned provider adapter with typed DTOs and raw payload retention. Do not call it directly from the frontend.

Detailed current return-flow plan: [CDEK Order, Label, and Tracking Return Flow](D:/GROUND/docs/api-knowledge-base/capabilities/cdek-order-label-tracking.md).
