# API Decision Log

## Open

### 2026-04-22 - Knowledge base initialized

- We will keep API knowledge in `docs/api-knowledge-base/` instead of scattering vendor notes across feature plans.
- Provider docs remain the raw source; implementation decisions live here.
- Third-party integrations should terminate in backend-owned adapters, not frontend direct calls.

### 2026-04-22 - CDEK integration boundary

- CDEK should be modeled as a logistics provider adapter, not embedded in business services directly.
- Tracking auth is separate from standard API 2.0 OAuth and must remain an independent client/config path.
- Customer-facing tracking must use normalized logistics statuses instead of exposing internal first-leg / last-mile details.

### 2026-04-28 - CDEK order, label, and tracking return requirements

- The internal platform order must be created before CDEK submission.
- CDEK carrier order creation must be gated by admin approval.
- CDEK order creation is asynchronous: store `entity.uuid`, then query `GET /v2/orders/{entity_uuid}` for `cdek_number`.
- CDEK supports label return through `POST /v2/print/barcodes`, `GET /v2/print/barcodes/{uuid}`, and `GET /v2/print/barcodes/{uuid}.pdf`.
- Label PDF links are only available when status is `READY` and may expire.
- Tail-end tracking requires the separate tracing auth flow described in the manual.

## Pending Questions

- Which API vendor should be prioritized after CDEK?
- Do we want one shared adapter contract for all carriers now, or only after the second provider is introduced?
- Which credentials will be available first: CDEK test, production, or tracing-only?
- Should the generated CDEK label be visible to customers, admins only, or both?
- Should label PDFs be stored durably in Supabase Storage once generated?
- Are the current CDEK production OAuth credentials also valid for tracing, or do we need a separate tracing username/password?
