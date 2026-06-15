# Phase 1.2: Geofence Boundaries & Supervisor Notifications

**Date**: 2026-06-14
**Builds on**: Phase 1.1 (FatigueService, AlertService, GPS columns, alerts table)

---

## Components

### 1. Migration: `create_workspace_geofences_table`

```php
Schema::create('workspace_geofences', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
    $table->uuid('workspace_id');
    $table->string('name');
    $table->decimal('lat', 10, 7);
    $table->decimal('lng', 10, 7);
    $table->decimal('radius_meters', 10, 2)->default(100);
    $table->boolean('active')->default(true);
    $table->timestampsTz();
    $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
    $table->index('workspace_id');
});
```

### 2. WorkspaceGeofence Model + Alias

Eloquent model at `App\Core\Models\WorkspaceGeofence`, alias at `App\Models\WorkspaceGeofence`.

### 3. Geofence CRUD Controller & Routes

`App\Core\Http\Controllers\Api\GeofenceController` with:
- `index` — list geofences for workspace
- `store` — create with `name`, `lat`, `lng`, `radius_meters`
- `update` — modify
- `destroy` — delete

Routes in `routes/modules/hr.php`:
- `GET hr/geofences`
- `POST hr/geofences`
- `PATCH hr/geofences/{geofenceId}`
- `DELETE hr/geofences/{geofenceId}`

### 4. Geofence Proximity Check on Clock-In

In `EmployeeController::clockIn`:
- If GPS coords (`lat`, `lng`) provided, query active `workspace_geofences` for the workspace
- For each geofence, calculate `haversine_distance(clocked_in_lat, clocked_in_lng, geofence.lat, geofence.lng)`
- If outside all geofences (distance > radius), create geofence alert via AlertService
- Response includes `{ geofence_status: 'inside' | 'outside' }`

### 5. Supervisor Notification in AlertService

When creating an alert with no explicit `assignedTo`:
- Look up `workspace_members.reports_to` for the subject user
- If found, set `assigned_to` to the supervisor's user ID
- This works automatically for all AlertService consumers (fatigue, geofence)

### 6. Tests

| Suite | New / Updated | Cases |
|-------|---------------|-------|
| GeofenceTest | New | CRUD operations |
| HrTest GPS test | Updated | proximity check |
| AlertServiceTest | Updated | supervisor assignment |

---

## File Manifest

| Action | File |
|--------|------|
| Create | `database/migrations/2026_06_14_000003_create_workspace_geofences_table.php` |
| Create | `app/Core/Models/WorkspaceGeofence.php` |
| Create | `app/Models/WorkspaceGeofence.php` |
| Create | `app/Core/Http/Controllers/Api/GeofenceController.php` |
| Create | `tests/Feature/HR/GeofenceTest.php` |
| Edit | `routes/modules/hr.php` |
| Edit | `app/Core/Http/Controllers/Api/EmployeeController.php` |
| Edit | `app/Services/AlertService.php` |
| Edit | `tests/Feature/HR/AlertServiceTest.php` |
| Edit | `tests/Feature/HR/HrTest.php` |
