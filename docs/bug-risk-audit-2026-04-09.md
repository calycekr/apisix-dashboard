# Bug Risk Audit (2026-04-09)

This document summarizes runtime-risk hotspots reviewed in the dashboard codebase, focused on Route/Service detail UX and save reliability.

## High risk

1. **ResourceSelect option truncation**
   - Prior behavior fetched a single page (`page=1&page_size=300`), which silently omitted resources when total count exceeded 300.
   - Impact: users cannot find existing resources in dropdowns, causing apparent "missing data" and wrong manual IDs.
   - Mitigation applied: paginated fetch loop with dedupe by id and bounded max page count.

2. **Route vars payload shape drift (`in` / `not_in` / `has` operators)**
   - Current form UI models value as plain string for all operators.
   - Potential impact: operator-specific server validation mismatch for list-oriented operators.
   - Recommendation: add operator-aware value editor and serializer with explicit tuple schema.

## Medium risk

3. **Detail pages still carry inert readOnly state**
   - After removing Edit/View mode, many pages still pass `readOnly`/`setReadOnly` plumbing while value is always `false`.
   - Impact: higher maintenance burden and easier accidental regressions when touching form disable logic.
   - Recommendation: remove readOnly state and props entirely from always-edit detail pages.

4. **Route payload cleanup policy drift risk**
   - Cleanup logic has grown and now mixes trim/delete/mutual-exclusion concerns.
   - Impact: future edits may reintroduce destructive cleanup bugs.
   - Recommendation: isolate cleanup into composable validators and add fixture-based unit tests.

## Low risk

5. **Large UI bundles/chunks warning**
   - Build output repeatedly warns about large chunks.
   - Impact: slower first-load on low-end devices.
   - Recommendation: incremental route-level code splitting of heavy editors and schema-driven forms.

## Next suggested actions

- Add tests for `produceVarsToAPI` with operator-specific fixtures.
- Remove stale readOnly plumbing from detail pages.
- Add optional server-side search mode for ResourceSelect when resource count is huge.
