---
ticket: PROD-FIX-GATE-CRITICAL
priority: critical
est_hours: 2
state: assigned
---

# builder-1 — Fix Critical GateController Issues

## Objective
Fix 3 critical issues found by reviewer in GateController:
1. Missing auth middleware — endpoints accessible without authentication
2. computeComplianceSnapshot diverges from ComplianceService — use the real service
3. emptyCompliance() defaults to is_compliant: true — should default to false

## Acceptance Criteria
1. Add `auth:sanctum` middleware to GateController (__construct or route group)
2. Replace `computeComplianceSnapshot()` with calls to `ComplianceService::calculateWorkerStatus()` and `ComplianceService::getWorkerComplianceFailures()`
3. Store the full compliance data (not just is_compliant) in the snapshot JSON
4. Change `emptyCompliance()` to return `is_compliant: false` with an error flag
5. Fix JSON boolean comparison in logs/stats filters (use proper PostgreSQL boolean casting)

## Context Files
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Http\Controllers\Api\GateController.php
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Services\ComplianceService.php

## Quality Gates
- Gate endpoints return 401 without auth token
- Gate scan uses ComplianceService for compliance checking
- Empty/default data returns is_compliant: false
- All Pest tests pass
