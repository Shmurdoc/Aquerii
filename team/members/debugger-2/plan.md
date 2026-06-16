---
ticket: PROD-FIX-AUTH-403
priority: high
est_hours: 1
state: assigned
---

# debugger-2 — Fix Auth to Return 403 Instead of 422

## Objective
Fix the authorization check in PTW and HSSE controllers — non-HSSE-role users should get 403 Forbidden, not 422 Validation Error.

## Acceptance Criteria
1. Find where PTW permit approval returns 422 for non-owner/admin users
2. Find where HSSE incident operations have similar issues
3. Change to throw AuthorizationException or return 403 response
4. Verify correct status code returned

## Context Files
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Modules\PTW\Http\Controllers\
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Modules\PTW\Policies\
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Modules\HSSE\Http\Controllers\
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Modules\HSSE\Policies\

## Quality Gates
- Non-HSSE role gets 403 on permit approval
- Non-HSSE role gets 403 on incident management
- Owner/admin role still works (200)
