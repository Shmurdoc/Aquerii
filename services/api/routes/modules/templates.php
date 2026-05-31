<?php

use App\Modules\Templates\Http\Controllers\TemplateController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {
        Route::apiResource('templates', TemplateController::class)->middleware('idempotent');
        Route::post('templates/{template}/apply', [TemplateController::class, 'apply'])->middleware('idempotent');
    });
});
