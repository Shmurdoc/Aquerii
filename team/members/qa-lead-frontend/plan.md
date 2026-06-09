---
ticket: PROD-E2E-PTW
priority: high
est_hours: 4
state: assigned
---

# qa-lead-frontend — Playwright E2E Tests

## Objective
Write Playwright E2E tests for PTW permit lifecycle, compliance dashboard, gate scan kiosk, and worker model features.

## Acceptance Criteria
1. **PTW permit E2E tests** (minimum 3 specs):
   - Create permit via wizard (fill all 4 steps, submit)
   - Approval queue: login as HSSE lead, view pending permits, approve one
   - Permit register: filter by type, verify results
2. **Compliance dashboard E2E tests** (minimum 2 specs):
   - Dashboard loads with summary cards
   - Worker list shows compliance badges
   - Clicking worker expands compliance breakdown
3. **Gate kiosk E2E test** (1 spec):
   - Enter worker ID, click scan, see result (green or red)
4. **Follow existing Playwright patterns** in `services/web/tests/e2e/`

## Context Files
- C:\Users\madoc\source\repos\Aquerii\services\web\tests\e2e\ (directory — see existing patterns)
- C:\Users\madoc\source\repos\Aquerii\services\web\src\pages\ptw\
- C:\Users\madoc\source\repos\Aquerii\services\web\src\pages\compliance\
- C:\Users\madoc\source\repos\Aquerii\services\web\src\pages\gate\

## Quality Gates
- Follow existing Playwright patterns (page object model, data-testid selectors)
- Tests are idempotent (can run multiple times)
- No hardcoded timeouts (use Playwright auto-waiting)
