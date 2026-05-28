<?php

use App\Core\Http\Controllers\Api\EmployeeController;
use App\Core\Http\Controllers\Api\TeamCapacityController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {

        // Employee directory
        Route::get('hr/employees', [EmployeeController::class, 'directory']);
        Route::patch('hr/employees/{userId}', [EmployeeController::class, 'updateMember'])->middleware('idempotent');

        // Attendance (clock-in / clock-out)
        Route::post('hr/attendance/clock-in', [EmployeeController::class, 'clockIn'])->middleware('idempotent');
        Route::post('hr/attendance/clock-out', [EmployeeController::class, 'clockOut'])->middleware('idempotent');
        Route::get('hr/attendance', [EmployeeController::class, 'attendanceHistory']);

        // Leave requests
        Route::get('hr/leave', [EmployeeController::class, 'leaveIndex']);
        Route::post('hr/leave', [EmployeeController::class, 'leaveStore'])->middleware('idempotent');
        Route::patch('hr/leave/{leaveId}/action', [EmployeeController::class, 'leaveApprove'])->middleware('idempotent');
        Route::get('hr/leave/balance', [EmployeeController::class, 'leaveBalance']);

        // Expense claims
        Route::get('hr/expenses', [EmployeeController::class, 'expenseIndex']);
        Route::post('hr/expenses', [EmployeeController::class, 'expenseStore'])->middleware('idempotent');
        Route::patch('hr/expenses/{expenseId}/action', [EmployeeController::class, 'expenseApprove'])->middleware('idempotent');

        // Team capacity
        Route::get('hr/capacity', [TeamCapacityController::class, 'index']);
        Route::patch('hr/capacity/{userId}', [TeamCapacityController::class, 'update'])->middleware('idempotent');
    });
});
