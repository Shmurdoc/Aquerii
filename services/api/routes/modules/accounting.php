<?php

use App\Modules\Accounting\Http\Controllers\AccountController;
use App\Modules\Accounting\Http\Controllers\JournalEntryController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {
        Route::apiResource('accounts', AccountController::class)->middleware('idempotent');
        Route::post('journal-entries', [JournalEntryController::class, 'store'])->middleware('idempotent');
        Route::get('journal-entries', [JournalEntryController::class, 'index']);
    });
});
