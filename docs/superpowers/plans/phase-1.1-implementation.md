# Implementation Plan: Phase 1.1 — Fatigue Management & GPS

**Based on**: `docs/superpowers/specs/2026-06-14-fatigue-management-gps-design.md`

## Architecture Decisions

- FatigueService is a standalone service (no model), queries attendance_logs directly
- Soft block (=12h) returns warning in response but does NOT prevent clock-in
- Hard block (=16h) throws ValidationException in PTW workflow (cannot activate)
- AlertController lives in Core (HR routes load from `routes/api.php`, not a separate module)
- Tests use `RefreshDatabase` trait with pre-seeded workspaces/users

## Task List

### Phase 1: Foundation

- [ ] **Task 1: Database migrations** — Add GPS columns to attendance_logs, create alerts table
- [ ] **Task 2: FatigueService** — Standalone service + FatigueResult DTO + unit tests
- [ ] **Task 3: AlertService** — Alert creation + tests

### Checkpoint: Foundation
- [ ] All 7 new migration tests pass (up + rollback)
- [ ] FatigueServiceTest: 5 cases green
- [ ] AlertServiceTest: 3 cases green

### Phase 2: Integration

- [ ] **Task 4: EmployeeController GPS + fatigue soft-block** — GPS capture on clock-in/out, fatigue warning on clock-in
- [ ] **Task 5: PTW fatigue hard-block** — Gate TRANSITION_ACTIVATE in PermitWorkflowService
- [ ] **Task 6: Alert routes + controller** — GET alerts, PATCH acknowledge

### Checkpoint: Core Features
- [ ] Full test suite: 192+ pass, no regressions
- [ ] Manual: clock-in with 12h history returns fatigue_warning
- [ ] Manual: PTW activate with 16h history throws 422

## Dependencies

```
Task 1 (migrations)
  ├── Task 2 (FatigueService) — needs GPS/alert tables? No, uses only attendance_logs
  ├── Task 3 (AlertService) — needs alerts table
  ├── Task 4 (EmployeeController) — needs Task 2 + Task 1
  └── Task 6 (AlertController) — needs Task 3 + Task 1
Task 5 (PTW gating) — needs Task 2
```

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Test DB setup fails with new tables | Med | Run `migrate:fresh` before test suite, set `RefreshDatabaseState::$migrated = false` temporarily or ensure new migrations are included |
| PTW test fatigue gating conflicts with existing workflow tests | Low | Existing tests don't seed recent attendance_logs, so fatigue will always be 0h — no conflict |
| Route registration order affects alert routes | Low | Alert routes go in same hr.php file alongside existing HR routes |

## File Manifest

| Task | Files |
|------|-------|
| 1 | `database/migrations/2026_06_14_000001_add_gps_to_attendance_logs.php`, `database/migrations/2026_06_14_000002_create_alerts_table.php` |
| 2 | `app/Services/FatigueService.php`, `tests/Feature/FatigueServiceTest.php` |
| 3 | `app/Services/AlertService.php`, `tests/Feature/AlertServiceTest.php` |
| 4 | `app/Core/Http/Controllers/Api/EmployeeController.php`, `tests/Feature/HR/HrTest.php` (update) |
| 5 | `app/Modules/PTW/Services/PermitWorkflowService.php`, `tests/Feature/PTW/PermitWorkflowTest.php` (update) |
| 6 | `app/Core/Http/Controllers/Api/AlertController.php`, `routes/modules/hr.php` |
