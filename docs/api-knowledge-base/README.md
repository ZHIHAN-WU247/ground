# API Knowledge Base

## Purpose

This knowledge base is the project-level memory for third-party and internal APIs that may be integrated into the product.

It is designed for three goals:

1. Keep raw provider knowledge in one place.
2. Preserve business-facing decisions separately from vendor docs.
3. Make future API intake fast: provider, capability, auth, risk, and adapter boundary should all have fixed slots.

## Structure

- [registry.md](D:/GROUND/docs/api-knowledge-base/registry.md): master index of all APIs and capabilities
- [intake-checklist.md](D:/GROUND/docs/api-knowledge-base/intake-checklist.md): what to confirm before implementation
- [decision-log.md](D:/GROUND/docs/api-knowledge-base/decision-log.md): cross-provider decisions and open questions
- `capabilities/`: business capability notes that connect provider APIs to product flows
- [templates/provider-template.md](D:/GROUND/docs/api-knowledge-base/templates/provider-template.md): provider page template
- [templates/capability-template.md](D:/GROUND/docs/api-knowledge-base/templates/capability-template.md): capability note template
- [providers/cdek.md](D:/GROUND/docs/api-knowledge-base/providers/cdek.md): current seeded provider page

## Working Rules

- Do not mix vendor raw facts with product assumptions.
- Record auth flow, environments, rate/risk notes, and adapter boundary before coding.
- Link to raw source material instead of duplicating long vendor docs.
- Prefer one provider page per API vendor and one capability subsection per real use case.
- Keep frontend isolated from third-party APIs; integration should flow through backend-owned adapters.

## Intake Flow

When a new API is introduced, add or update in this order:

1. Add one row in [registry.md](D:/GROUND/docs/api-knowledge-base/registry.md).
2. Create or update the provider page under `providers/`.
3. Add a capability note under `capabilities/` when the API supports a business flow.
4. Add any unresolved questions to [decision-log.md](D:/GROUND/docs/api-knowledge-base/decision-log.md).
5. Only then move into adapter design or implementation planning.
