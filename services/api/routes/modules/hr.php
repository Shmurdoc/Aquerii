<?php

use App\Core\Http\Controllers\Api\AlertController;
use App\Core\Http\Controllers\Api\EmployeeController;
use App\Core\Http\Controllers\Api\GeofenceController;
use App\Core\Http\Controllers\Api\TeamCapacityController;
use App\Core\Models\AttendanceLog;
use App\Core\Models\LeaveRequest;
use App\Modules\HSSE\Http\Controllers\ComplianceController;
use App\Modules\HSSE\Http\Controllers\GateController;
use App\Modules\HSSE\Http\Controllers\ROIController;
use App\Modules\HSSE\Http\Controllers\ShiftReadinessController;
use App\Modules\HSSE\Http\Controllers\VisitorController;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Employee directory
Route::get('hr/employees', [EmployeeController::class, 'directory']);
Route::patch('hr/employees/{userId}', [EmployeeController::class, 'updateMember'])->middleware('idempotent');

// Attendance (clock-in / clock-out)
Route::post('hr/attendance/clock-in', [EmployeeController::class, 'clockIn'])->middleware('idempotent');
Route::post('hr/attendance/clock-out', [EmployeeController::class, 'clockOut'])->middleware('idempotent');
Route::get('hr/attendance', [EmployeeController::class, 'attendanceHistory']);

// Timesheet (aggregated)
Route::get('hr/timesheet', function (Request $request, string $workspace) {
    $from = $request->query('from', now()->startOfWeek()->toDateString());
    $to = $request->query('to', now()->endOfWeek()->toDateString());

    $logs = AttendanceLog::where('workspace_id', $workspace)
        ->whereBetween('clocked_in_at', [$from, $to])
        ->get()
        ->groupBy('user_id')
        ->map(function ($entries) {
            $totalMinutes = $entries->sum(function ($entry) {
                if ($entry->clocked_out_at) {
                    return Carbon::parse($entry->clocked_in_at)->diffInMinutes(Carbon::parse($entry->clocked_out_at));
                }

                return 0;
            });

            return [
                'user_id' => $entries->first()->user_id,
                'total_hours' => round($totalMinutes / 60, 2),
                'entries' => $entries->count(),
            ];
        });

    return response()->json(['data' => $logs]);
});

// Attendance report (org-wide)
Route::get('hr/attendance/report', function (Request $request, string $workspace) {
    $from = $request->query('from', now()->startOfMonth()->toDateString());
    $to = $request->query('to', now()->endOfMonth()->toDateString());

    $report = AttendanceLog::where('workspace_id', $workspace)
        ->whereBetween('clocked_in_at', [$from, $to])
        ->selectRaw('user_id, COUNT(*) as total_entries, SUM(CASE WHEN clocked_out_at IS NOT NULL THEN 1 ELSE 0 END) as completed_shifts')
        ->groupBy('user_id')
        ->get();

    return response()->json(['data' => $report]);
});

// Leave requests
Route::get('hr/leave', [EmployeeController::class, 'leaveIndex']);
Route::post('hr/leave', [EmployeeController::class, 'leaveStore'])->middleware('idempotent');
Route::patch('hr/leave/{leaveId}/action', [EmployeeController::class, 'leaveApprove'])->middleware('idempotent');
Route::get('hr/leave/balance', [EmployeeController::class, 'leaveBalance']);

// Leave calendar (team view)
Route::get('hr/leave/calendar', function (Request $request, string $workspace) {
    $from = $request->query('from', now()->startOfMonth()->toDateString());
    $to = $request->query('to', now()->endOfMonth()->toDateString());

    $leaves = LeaveRequest::where('workspace_id', $workspace)
        ->where('status', 'approved')
        ->where(function ($q) use ($from, $to) {
            $q->whereBetween('start_date', [$from, $to])
                ->orWhereBetween('end_date', [$from, $to])
                ->orWhere(function ($q2) use ($from, $to) {
                    $q2->where('start_date', '<=', $from)->where('end_date', '>=', $to);
                });
        })
        ->with('user:id,name,email')
        ->get();

    return response()->json(['data' => $leaves]);
});

// Expense claims
Route::get('hr/expenses', [EmployeeController::class, 'expenseIndex']);
Route::post('hr/expenses', [EmployeeController::class, 'expenseStore'])->middleware('idempotent');
Route::patch('hr/expenses/{expenseId}/action', [EmployeeController::class, 'expenseApprove'])->middleware('idempotent');

// Team capacity
Route::get('hr/capacity', [TeamCapacityController::class, 'index']);
Route::patch('hr/capacity/{userId}', [TeamCapacityController::class, 'update'])->middleware('idempotent');

// Alerts
Route::get('hr/alerts', [AlertController::class, 'index']);
Route::patch('hr/alerts/{alertId}/acknowledge', [AlertController::class, 'acknowledge'])->middleware('idempotent');

// Geofences
Route::get('hr/geofences', [GeofenceController::class, 'index']);
Route::post('hr/geofences', [GeofenceController::class, 'store'])->middleware('idempotent');
Route::patch('hr/geofences/{geofenceId}', [GeofenceController::class, 'update'])->middleware('idempotent');
Route::delete('hr/geofences/{geofenceId}', [GeofenceController::class, 'destroy'])->middleware('idempotent');

// Compliance
Route::prefix('hr/compliance')->group(function () {
    Route::get('dashboard', [ComplianceController::class, 'dashboard']);
    Route::get('/', [ComplianceController::class, 'workers']);
});

// ROI
Route::get('hr/roi/dashboard', [ROIController::class, 'dashboard']);

// Shift Readiness
Route::get('hr/shift-readiness', [ShiftReadinessController::class, 'readiness']);

// Shift Plans
Route::apiResource('hr/shift-plans', ShiftReadinessController::class)->only(['index', 'store']);
Route::prefix('hr/shift-plans')->group(function () {
    Route::post('{shiftPlan}/assign', [ShiftReadinessController::class, 'assignWorker']);
    Route::post('{shiftPlan}/publish', [ShiftReadinessController::class, 'publish']);
    Route::post('{shiftPlan}/complete', [ShiftReadinessController::class, 'complete']);
});

// Gate scanning
Route::prefix('gate')->group(function () {
    Route::post('scan', [GateController::class, 'scan']);
    Route::post('scan-equipment', [GateController::class, 'scanEquipment']);
});

// Gate visitor management
Route::prefix('gate/visitors')->group(function () {
    Route::get('active', [VisitorController::class, 'activeVisitors']);
    Route::post('sign-in', [VisitorController::class, 'signIn']);
    Route::post('{visitor}', [VisitorController::class, 'signOut'])->name('gate.visitors.sign-out');
    Route::post('{visitor}/badge-printed', [VisitorController::class, 'markBadgePrinted']);
});
