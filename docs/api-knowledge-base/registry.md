# API Registry

## Status Legend

- `watching`: known provider, not yet selected for build
- `intake`: collecting docs and constraints
- `ready-for-adapter`: enough knowledge to design backend adapter
- `in-build`: adapter or integration in progress
- `live`: running in production
- `blocked`: missing credentials, docs, pricing, or business confirmation

## Providers

| Provider | Domain | Planned Capabilities | Auth | Environments | Adapter Status | Source of Truth | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CDEK | Logistics tail-end fulfillment | Quote lookup, admin-approved order release, label return, tracking sync, optional intake | OAuth client credentials + separate tracing auth | Production confirmed; test rejected current key | `review` | [cdek.md](D:/GROUND/docs/api-knowledge-base/providers/cdek.md) | Current key works for prod standard API; tracking credentials still need confirmation |

## Capability Intake Queue

| Capability | Provider | Business Module | User-Facing or Internal | Priority | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Tail-end quote lookup | CDEK | Logistics | User-facing via backend | High | `intake` | Depends on location mapping and tariff selection |
| Admin-approved carrier order release | CDEK | Logistics | Internal orchestration | High | `review` | Internal order first; CDEK order only after admin approval |
| Tail-end tracking sync | CDEK | Logistics | User-facing timeline via backend | High | `review` | Needs separate tracing auth and internal status mapping |
| Label generation and return | CDEK | Logistics admin | Admin/internal, user visibility TBD | High | `review` | Manual confirms `POST /v2/print/barcodes` and PDF retrieval |
| Courier intake request | CDEK | Logistics admin | Internal | Medium | `watching` | Only needed if pickup workflow is enabled |

## Capability Notes

| Capability Note | Provider | Status |
| --- | --- | --- |
| [CDEK Order, Label, and Tracking Return Flow](D:/GROUND/docs/api-knowledge-base/capabilities/cdek-order-label-tracking.md) | CDEK | `review` |

## Next Additions

Add new providers here as soon as you tell me:

- provider name
- intended features
- source docs or console access
- whether it is customer-facing, admin-facing, or purely backend
