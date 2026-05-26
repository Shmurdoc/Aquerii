<?php

use App\Core\Http\Controllers\Api\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {

        Route::get('reports/dashboard',          [ReportController::class, 'dashboard']);
        Route::get('reports/invoices',           [ReportController::class, 'invoices']);
        Route::get('reports/expenses',           [ReportController::class, 'expenses']);
        Route::get('reports/procurement',        [ReportController::class, 'procurement']);
        Route::get('reports/inventory',          [ReportController::class, 'inventory']);
        Route::get('reports/export/{type}',      [ReportController::class, 'export']);
    });
});
