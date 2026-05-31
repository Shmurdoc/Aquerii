<?php

use App\Modules\Delegation\Http\Controllers\DelegationController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {
        Route::get('delegations', [DelegationController::class, 'index']);
        Route::post('boards/{board}/items/{item}/delegate', [DelegationController::class, 'store'])->middleware('idempotent');
        Route::delete('boards/{board}/items/{item}/delegate', [DelegationController::class, 'revoke']);
        Route::post('boards/{board}/items/{item}/delegate/accept', [DelegationController::class, 'accept'])->middleware('idempotent');
    });
});
