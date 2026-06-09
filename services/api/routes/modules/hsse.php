<?php

use App\Modules\HSSE\Http\Controllers\CorrectiveActionController;
use App\Modules\HSSE\Http\Controllers\HazardController;
use App\Modules\HSSE\Http\Controllers\HSSEController;
use App\Modules\HSSE\Http\Controllers\IncidentController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {
        Route::get('hsse/dashboard', [HSSEController::class, 'dashboard']);
        Route::get('hsse/coida/summary', [HSSEController::class, 'coidaSummary']);
        Route::get('hsse/mhsa/report', [HSSEController::class, 'mhsaReport']);
        Route::get('hsse/incidents/{incident}/coida-wcl2', [HSSEController::class, 'coidaIncident']);

        Route::apiResource('hsse/incidents', IncidentController::class);
        Route::apiResource('hsse/hazards', HazardController::class);
        Route::apiResource('hsse/corrective-actions', CorrectiveActionController::class);
    });
});
