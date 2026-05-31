<?php

use App\Modules\JobCards\Http\Controllers\JobCardController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {
        Route::get('job-cards/templates', [JobCardController::class, 'templates']);
        Route::post('job-cards/templates', [JobCardController::class, 'storeTemplate']);
        Route::post('job-cards/{job_card}/sign-off', [JobCardController::class, 'signOff'])->middleware('idempotent');
        Route::post('job-cards/{job_card}/reject', [JobCardController::class, 'reject'])->middleware('idempotent');
        Route::apiResource('job-cards', JobCardController::class)->middleware('idempotent');
    });
});
