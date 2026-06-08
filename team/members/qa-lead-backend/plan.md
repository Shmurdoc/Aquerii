---
ticket: PROD-PEST-PTW-001
priority: high
est_hours: 5
state: assigned
---

# qa-lead-backend — Pest Tests for Existing Modules

## Objective
Write comprehensive Pest tests for the existing PTW module (Permit lifecycle), HSSE module (Incidents), and the new Compliance endpoints.

## Acceptance Criteria
1. **PTW Permit lifecycle tests** (minimum 12 tests):
   - Create permit with all required fields
   - Submit permit (draft -> submitted)
   - Approve permit (submitted -> approved)
   - Reject permit with reason
   - Activate permit (approved -> active)
   - Close permit (active -> closed)
   - Cannot submit with non-compliant worker (validation)
   - Cannot skip required fields (work description < 100 chars, no hazards, etc.)
   - Permit list filtered by status
   - Permit types (hot_work, confined_space, etc.) all creatable
2. **HSSE Incident lifecycle tests** (minimum 8 tests):
   - Create incident (all types: fatality, LTI, MTC, near_miss, etc.)
   - Assign investigator
   - Add corrective actions
   - Close incident
   - DMR reportable flag set correctly
3. **Compliance API tests** (minimum 5 tests):
   - GET /workspaces/{id}/compliance returns valid response
   - GET /workspaces/{id}/compliance/dashboard returns stats
   - Worker correctly shows compliant/non_compliant
4. **Site Access Log tests** (minimum 5 tests):
   - POST /workspaces/{id}/gate/scan returns compliance result
   - GET /workspaces/{id}/gate/logs returns paginated results
   - Non-compliant scan returns correct error

## Context Files
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Modules\PTW\ (directory)
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Modules\HSSE\ (directory)
- C:\Users\madoc\source\repos\Aquerii\services\api\routes\api.php
- C:\Users\madoc\source\repos\Aquerii\services\api\tests\ (directory)
- C:\Users\madoc\source\repos\Aquerii\ALIGNED-PLAN.md

## Quality Gates
- All tests pass (or pre-existing failures documented)
- Minimum 30 new tests
- Tests cover happy path + error cases
- Tests use factories where possible
