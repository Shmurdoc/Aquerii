<?php

use App\Modules\PTW\Http\Controllers\PermitController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {
        Route::get('ptw/register', [PermitController::class, 'register']);

        Route::get('ptw/permits/{permit}/transitions', [PermitController::class, 'transitions']);
        Route::post('ptw/permits/{permit}/request', [PermitController::class, 'request']);
        Route::post('ptw/permits/{permit}/approve', [PermitController::class, 'approve']);
        Route::post('ptw/permits/{permit}/reject', [PermitController::class, 'reject']);
        Route::post('ptw/permits/{permit}/issue', [PermitController::class, 'issue']);
        Route::post('ptw/permits/{permit}/activate', [PermitController::class, 'activate']);
        Route::post('ptw/permits/{permit}/suspend', [PermitController::class, 'suspend']);
        Route::post('ptw/permits/{permit}/resume', [PermitController::class, 'resume']);
        Route::post('ptw/permits/{permit}/close', [PermitController::class, 'close']);

        Route::post('ptw/permits/{permit}/hazards', [PermitController::class, 'addHazard']);
        Route::post('ptw/permits/{permit}/hazards/{hazardId}/verify', [PermitController::class, 'verifyHazard']);
        Route::post('ptw/permits/{permit}/isolations', [PermitController::class, 'addIsolation']);
        Route::post('ptw/permits/{permit}/isolations/{isolationId}/remove', [PermitController::class, 'removeIsolation']);

        Route::apiResource('ptw/permits', PermitController::class);
    });
});
