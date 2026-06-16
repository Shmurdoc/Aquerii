---
ticket: PROD-REVIEW-WAVE1+2
priority: high
est_hours: 2
state: assigned
---

# reviewer — Review All Wave 1+2 Output

## Objective
Review all code from Wave 1 (Compliance Engine, Site Access Log, Worker Model) and Wave 2 (PTW frontend, Pest tests, DMR exports, JWT auth).

## Acceptance Criteria
1. Review ComplianceService for correctness and edge cases
2. Review GateController for security (auth, input validation)
3. Review SaIdNumber rule for correctness
4. Review PTW frontend components for adherence to design system
5. Review Pest tests for completeness and correct assertions
6. Review DMR/COIDA templates for regulatory accuracy
7. Review JWT auth middleware for security
8. Generate review verdict with score and any issues found

## Context Files
- C:\Users\madoc\source\repos\Aquerii\team\members\builder-1\plan.md
- C:\Users\madoc\source\repos\Aquerii\team\members\builder-2\plan.md
- C:\Users\madoc\source\repos\Aquerii\team\members\builder-3\plan.md
- C:\Users\madoc\source\repos\Aquerii\team\members\designer\plan.md
- C:\Users\madoc\source\repos\Aquerii\team\members\qa-lead-backend\plan.md
- C:\Users\madoc\source\repos\Aquerii\team\members\release-engineer\plan.md

## Quality Gates
- Review verdict includes: score, issues found, recommendations
- No security issues pass review
- No data integrity issues pass review
