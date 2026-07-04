# API Intake Checklist

Use this before calling any new API "ready".

## Product

- What user or operator problem does this API solve?
- Is it customer-facing, admin-facing, or internal only?
- What is the minimum business flow we actually need first?
- What data must be visible to customers, and what must remain internal?

## Engineering

- Official docs URL
- Sandbox/test environment
- Production environment
- Auth method
- Credential owner
- Rate limit / quota / pricing notes
- Request idempotency support
- Retry safety
- Webhook support or polling only
- Error model shape
- Pagination model
- Timezone / currency / locale behavior
- File or binary payload requirements

## Adapter Boundary

- Backend adapter name
- Normalized request DTOs
- Normalized response DTOs
- Raw payload retention requirements
- Internal status mapping needed
- What should never leak to frontend directly?

## Readiness Gate

Do not mark a provider `ready-for-adapter` until these are known:

- auth flow
- core endpoints
- required business fields
- main failure cases
- environment separation
- test strategy
