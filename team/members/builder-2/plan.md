---
ticket: PROD-FIX-COMPLIANCE-ISSUES
priority: high
est_hours: 3
state: assigned
---

# builder-2 — Fix High-Severity Compliance Issues

## Objective
Fix 4 high-severity issues from reviewer:
1. COF record verified_at not checked in ComplianceService
2. N+1 queries in getNonCompliantWorkers
3. No PTW/HSSE/SiteAccessLog tests exist (as planned)
4. Add the missing tests

## Acceptance Criteria
1. Add `->whereNotNull('verified_at')` to CofRecord query in ComplianceService::calculateWorkerStatus
2. Optimize getNonCompliantWorkers: preload all competency records per workspace, compute in-memory
3. Write the missing PTW lifecycle tests (12 tests):
   - Create, submit, approve, reject, activate, close permit
   - Cannot submit with non-compliant worker
   - Cannot skip required fields
   - Authorization check
4. Write HSSE incident tests (8 tests):
   - Create all incident types
   - Assign investigator, add corrective actions, close
   - DMR reportable flag
5. Write SiteAccessLog tests (5 tests):
   - Create scan, list logs, stats, kiosk auth, non-compliant scan

## Context Files
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Services\ComplianceService.php
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Modules\PTW\
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Modules\HSSE\
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Http\Controllers\Api\GateController.php

## Quality Gates
- ComplianceService checks verified_at on COF records
- getNonCompliantWorkers fires < 10 queries for 100 workers
- Minimum 25 new tests across PTW (12) + HSSE (8) + Gate (5)
- All tests follow existing patterns
