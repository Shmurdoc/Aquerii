<?php

use App\Core\Models\AttendanceLog;
use App\Core\Models\LeaveRequest;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\TeamCapacityController;
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
        ->whereBetween('clock_in', [$from, $to])
        ->get()
        ->groupBy('user_id')
        ->map(function ($entries) {
            $totalMinutes = $entries->sum(function ($entry) {
                if ($entry->clock_out) {
                    return Carbon::parse($entry->clock_in)->diffInMinutes(Carbon::parse($entry->clock_out));
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
        ->whereBetween('clock_in', [$from, $to])
        ->selectRaw('user_id, COUNT(*) as total_entries, SUM(CASE WHEN clock_out IS NOT NULL THEN 1 ELSE 0 END) as completed_shifts')
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

// Shift management
Route::get('hr/shifts', [ShiftController::class, 'indexShifts']);
Route::post('hr/shifts', [ShiftController::class, 'storeShift'])->middleware('idempotent');

// Shift assignments (MUST be before {shift} routes so "assignments" isn't matched as a shift UUID)
Route::get('hr/shifts/assignments', [ShiftController::class, 'indexAssignments']);
Route::post('hr/shifts/assignments', [ShiftController::class, 'storeAssignment'])->middleware('idempotent');
Route::post('hr/shifts/assignments/bulk', [ShiftController::class, 'storeAssignmentsBulk'])->middleware('idempotent');
Route::patch('hr/shifts/assignments/{assignment}', [ShiftController::class, 'updateAssignment'])->middleware('idempotent');
Route::delete('hr/shifts/assignments/{assignment}', [ShiftController::class, 'destroyAssignment'])->middleware('idempotent');

// Shift handovers (MUST be before {shift} routes so "handovers" isn't matched as a shift UUID)
Route::get('hr/shifts/handovers', [ShiftController::class, 'indexHandovers']);
Route::post('hr/shifts/handovers', [ShiftController::class, 'storeHandover'])->middleware('idempotent');
Route::get('hr/shifts/handovers/{handover}', [ShiftController::class, 'showHandover']);
Route::post('hr/shifts/handovers/{handover}/acknowledge', [ShiftController::class, 'acknowledgeHandover'])->middleware('idempotent');

Route::get('hr/shifts/{shift}', [ShiftController::class, 'showShift'])->whereUuid('shift');
Route::patch('hr/shifts/{shift}', [ShiftController::class, 'updateShift'])->whereUuid('shift')->middleware('idempotent');
Route::delete('hr/shifts/{shift}', [ShiftController::class, 'destroyShift'])->whereUuid('shift')->middleware('idempotent');
