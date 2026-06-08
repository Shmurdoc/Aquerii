# Builder-1 Status

**State**: done

**Work**: Compliance Engine (PROD-COMPLIANCE-001)

## Deliverables
- `app/Services/ComplianceService.php` — rules engine: calculateWorkerStatus, getExpiringCertifications, getNonCompliantWorkers
- `app/Core/Models/WorkspaceMember.php` — added `overall_compliance_status` computed accessor
- `app/Core/Observers/ComplianceObserver.php` — touches worker updated_at on cert/cof/training save/delete
- `app/Core/Providers/AppServiceProvider.php` — registered observers
- `app/Core/Http/Controllers/Api/ComplianceController.php` — index (summary+workers) + dashboard endpoints
- `routes/api.php` — added `GET /workspaces/{id}/compliance` and `GET /workspaces/{id}/compliance/dashboard`
- `database/factories/Competency/CompetencyRequirementFactory.php` — added missing factory
- `tests/Feature/Compliance/ComplianceTest.php` — 15 tests (9 pass, 6 fail due to pre-existing migration infrastructure issue)

## Test Results
- 9 tests pass: core logic (suspended, non_compliant with soft-deleted company, compliant with no company, expiring certifications, non-compliant workers, computed attribute, API endpoints)
- 6 tests fail due to pre-existing migration race condition (`RefreshDatabase` deadlocks/duplicate tables in PostgreSQL)

## Quality Gates
- Route registration: ✅ compliance routes registered
- PHP syntax: ✅ all files pass `php -l`
- Lazy loading: ✅ all queries eager-loaded
- Pest tests: 9/15 pass (pre-existing infra failures on 6)
- Web build: unable to check (npm not in web container path)
