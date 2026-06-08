---
ticket: PROD-FIX-PERMIT-COMPLIANCE
priority: high
est_hours: 2
state: assigned
---

# debugger-1 — Fix Compliance Check in PermitWorkflowService

## Objective
Add compliance gate to PermitWorkflowService — prevent permit submission/issuance when assigned workers are non-compliant. Currently returns 422 but doesn't check worker compliance status.

## Acceptance Criteria
1. Find PermitWorkflowService (check app/Modules/PTW/Services/ or app/Services/)
2. Add worker compliance check before permit transitions: submitted, issued, active
3. If ANY assigned worker has overall_compliance_status != 'compliant', return validation error listing non-compliant workers
4. Add to the compliance check: medical fitness, site induction, role-required certs, worker status
5. Update existing tests or add new test for this specific validation

## Context Files
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Modules\PTW\ (directory)
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Services\ComplianceService.php
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Core\Models\WorkspaceMember.php

## Quality Gates
- Pest tests pass
- Permit with non-compliant worker returns proper validation error
- Error message lists which workers are non-compliant and why
