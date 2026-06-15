# Phase 1.1: Fatigue Management & GPS Tracking

**Date**: 2026-06-14
**Status**: Approved
**Builds on**: Existing PTW module (PermitWorkflowService), EmployeeController (clockIn/clockOut), attendance_logs

---

## 1. FatigueService

Located at `app/Services/FatigueService.php`. Single responsibility: calculate hours worked in the last 24 hours from attendance_logs.

### API

```php
class FatigueResult
{
    public float $hours_worked;       // decimal hours in last 24h
    public bool $soft_blocked;        // >= 12h → clock-in warning
    public bool $hard_blocked;        // >= 16h → cannot activate PTW
}

class FatigueService
{
    public function check(string $userId, ?string $workspaceId = null): FatigueResult;
}
```

### Implementation

- Queries `attendance_logs` where `user_id = $userId` and `clocked_in_at >= now() - 24 hours`
- Sums `COALESCE(clocked_out_at, NOW()) - clocked_in_at` for each session
- Returns result (no exception — caller decides action)

### Tests (FatigueServiceTest)

- `it returns zero hours for no attendance`
- `it calculates partial shift correctly`
- `it crosses soft threshold at 12 hours`
- `it crosses hard threshold at 16 hours`
- `it treats active (not clocked-out) shift as ongoing`

---

## 2. EmployeeController Changes

### Clock-in flow

1. Call `FatigueService::check($userId, $workspaceId)`
2. If `soft_blocked`: include `{ fatigue_warning: "12+ hours worked in last 24h", fatigue: { hours_worked, soft_blocked: true } }` in response (still clocks in)
3. Accept optional `lat` and `lng` body params
4. Store `clocked_in_lat`, `clocked_in_lng` in attendance_logs

### Clock-out flow

1. Accept optional `lat` and `lng` body params
2. Store `clocked_out_lat`, `clocked_out_lng` in attendance_logs

---

## 3. Migrations

### `add_gps_to_attendance_logs`

```php
Schema::table('attendance_logs', function (Blueprint $table) {
    $table->decimal('clocked_in_lat', 10, 7)->nullable()->after('clocked_in_at');
    $table->decimal('clocked_in_lng', 10, 7)->nullable()->after('clocked_in_lat');
    $table->decimal('clocked_out_lat', 10, 7)->nullable()->after('clocked_out_at');
    $table->decimal('clocked_out_lng', 10, 7)->nullable()->after('clocked_out_lat');
});
```

### `create_alerts_table`

```php
Schema::create('alerts', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
    $table->uuid('workspace_id');
    $table->uuid('user_id');           // who the alert is about
    $table->uuid('assigned_to')->nullable(); // supervisor/assignee
    $table->string('type', 50);        // 'fatigue', 'geofence', 'safety'
    $table->string('severity', 20);    // 'info', 'warning', 'critical'
    $table->string('title');
    $table->text('message')->nullable();
    $table->timestampTz('acknowledged_at')->nullable();
    $table->timestampsTz();
    $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
    $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
    $table->index(['workspace_id', 'acknowledged_at']);
});
```

---

## 4. PTW Fatigue Gating

In `PermitWorkflowService::transition()`:

- Before processing `TRANSITION_ACTIVATE`, check `FatigueService::check($permit->holder_id)`
- If `hard_blocked`: throw `ValidationException` with `['fatigue' => 'Holder has worked 16+ hours in the last 24h and cannot activate this permit.']`
- The existing `assertTransitionAllowed` / `assertRoleAllowed` pattern is reused

Also gated in `PermitWorkflowController::activate()` via middleware or direct call.

---

## 5. AlertService

Located at `app/Services/AlertService.php`.

```php
class AlertService
{
    public function create(
        string $workspaceId,
        string $userId,
        string $type,
        string $severity,
        string $title,
        ?string $message = null,
        ?string $assignedTo = null  // supervisor user ID
    ): Alert;
}
```

- Inserts into `alerts` table
- If `assignedTo` is provided, could optionally fire a real-time event or notification (out of scope for Phase 1.1 — just DB insert)

Test: `AlertServiceTest` with create and acknowledge flows.

---

## 6. Alert Routes

In `routes/modules/hr.php` (alerts are HR module scope):

```php
Route::get('alerts', [AlertController::class, 'index']);
Route::patch('alerts/{alert}/acknowledge', [AlertController::class, 'acknowledge']);
```

Controller: `app/Core/Http/Controllers/Api/AlertController.php` (HR routes load from core, not a dedicated HR module)

---

## 7. Test Plan

| Suite | Status | Notes |
|-------|--------|-------|
| FatigueServiceTest | New | 5 test cases (see above) |
| AlertServiceTest | New | Create, acknowledge, list |
| HrTest (clock-in) | Updated | Add fatigue expectation + GPS fields |
| PermitWorkflowTest | Updated | Verify activation blocked when holder fatigued |

---

## Out of Scope

- Geofence CRUD endpoints (geofence validation logic only, can be added)
- Real-time supervisor notifications (email/push)
- Geofence table and proximity check (phase 1.2 candidate)
- Frontend UI for alerts

---

## File Manifest

| File | Action |
|------|--------|
| `app/Services/FatigueService.php` | Create |
| `app/Services/AlertService.php` | Create |
| `app/Modules/HR/Http/Controllers/AlertController.php` | Create |
| `database/migrations/2026_06_14_000001_add_gps_to_attendance_logs.php` | Create |
| `database/migrations/2026_06_14_000002_create_alerts_table.php` | Create |
| `app/Core/Http/Controllers/Api/EmployeeController.php` | Edit |
| `app/Modules/PTW/Services/PermitWorkflowService.php` | Edit |
| `routes/modules/hr.php` | Edit |
| `tests/Feature/HR/FatigueServiceTest.php` | Create |
| `tests/Feature/HR/AlertServiceTest.php` | Create |
