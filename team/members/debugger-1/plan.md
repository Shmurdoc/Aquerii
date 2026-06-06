---
member_id: "debugger-1"
type: "debugger"
ticket: "GAP-TEST-001"
owner: "Root-cause analysis #1 (on-call) Agent"
status: running
lock: true
priority: high
review_required: true
reviews_by: ["reviewer"]
time_estimate: "1h"
time_spent: ""
context_files:
  - "services/web/src/pages/boards/BoardPage.tsx"
  - "services/web/tests/e2e/boards.spec.ts"
  - "services/web/tests/e2e/pages/BoardPage.ts"
strict_scope: true
artifact_refs:
  - "services/web/src/pages/boards/BoardPage.tsx"
  - "services/web/tests/e2e/pages/BoardPage.ts"
created_at: "2026-06-06T14:00:00Z"
updated_by: "Leader"
updated_at: "2026-06-06T14:00:00Z"
---

# Plan — debugger-1 (GAP-TEST-001)

## Ticket Summary
Playwright test `boards.spec.ts` expects `BoardsPage.heading` to match a single `<h1>But first, let's set up a board...</h1>` but a UI change added a second `<h1>Boards</h1>`. Strict mode violation causes 8 test failures.

## Deliverables
- [ ] Read `BoardPage.tsx` — find the duplicate `<h1>`
- [ ] Read `BoardPage.ts` (Playwright POM) — check the `heading` locator
- [ ] Fix: either remove the duplicate h1 or update the locator to use `first()` or `nth(0)`
- [ ] Verify fix: `cd services/web && npx vitest run` (unit tests) and `cd services/web && npx playwright test --config=playwright.config.ts boards.spec.ts`

## Acceptance Criteria
- [ ] All 8 failing Playwright tests pass
- [ ] No regressions in boards page rendering
- [ ] `npm run build` passes

## Quality Gates
- [ ] `node team/scripts/validate.mjs` passes
- [ ] `npm run build` passes (or `npx tsc --noEmit`)

## Return Format
- **Status**: done | blocked
- **Summary**: what was the root cause and how was it fixed
- **Files changed**: list
- **Quality gates**: pass/fail
- **Issues found**: any concerns
- **Next step**: ready for review
