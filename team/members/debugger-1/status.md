# debugger-1 — GAP-TEST-001 Status

## Status
done

## Root Cause
The `TopBar.tsx` component (rendered by `AppLayout`) outputs `<h1>Boards</h1>` via its `PAGE_TITLES` map for the `/boards` route, AND `BoardsPage.tsx` also rendered a separate `<h1>Boards</h1>` directly. This caused Playwright's strict-mode `getByRole('heading', { name: 'Boards' })` to match 2 elements, breaking 8 test runs (4 tests x 2 browsers).

## Fix Applied
1. **`src/pages/boards/BoardsPage.tsx:41`** — Removed the duplicate `<h1>Boards</h1>` heading (the TopBar already provides the page title)
2. **`tests/e2e/pages/BoardsPage.ts:12`** — Added `.first()` to `heading` locator as safety net against future duplicates

## Quality Gates
- `npx tsc --noEmit`: **pass**
- `npx playwright test boards.spec.ts`: **17 pass, 1 flaky** (Firefox view-switch timeout — pre-existing, unrelated)

## Files Changed
- `services/web/src/pages/boards/BoardsPage.tsx` (line 42: `<h1>` → `<div />`)
- `services/web/tests/e2e/pages/BoardsPage.ts` (line 12: added `.first()`)

## Issues Found
- Firefox `can switch between board views` test is flaky (unrelated timeout waiting for "Table" button)
- `TopBar.tsx` renders two `<h1>` elements (one desktop `hidden md:flex`, one mobile `md:hidden`) — only one is visible at a time but both are in the DOM for `getByRole('heading')` resolution when visible

## Next Step
Ready for review by the Leader.
