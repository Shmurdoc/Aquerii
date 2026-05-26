<?php

use App\Modules\Email\Http\Controllers\EmailController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {
        // Accounts
        Route::get('email/accounts',             [EmailController::class, 'indexAccounts']);
        Route::post('email/accounts',            [EmailController::class, 'storeAccount'])->middleware('idempotent');
        Route::delete('email/accounts/{id}',     [EmailController::class, 'destroyAccount'])->middleware('idempotent');

        // Threads
        Route::get('email/threads',              [EmailController::class, 'indexThreads']);
        Route::get('email/threads/{id}',         [EmailController::class, 'showThread']);
        Route::patch('email/threads/{id}',       [EmailController::class, 'updateThread'])->middleware('idempotent');

        // Send
        Route::post('email/send',                [EmailController::class, 'send'])->middleware('idempotent');

        // AI suggestions
        Route::post('email/suggestions/{id}/approve', [EmailController::class, 'approveSuggestion'])->middleware('idempotent');
        Route::post('email/suggestions/{id}/reject',  [EmailController::class, 'rejectSuggestion'])->middleware('idempotent');
    });
});
