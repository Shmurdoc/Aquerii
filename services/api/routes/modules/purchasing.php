<?php

use App\Modules\Purchasing\Http\Controllers\PurchaseOrderController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {

    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {

        Route::apiResource('purchases/orders', PurchaseOrderController::class)->middleware('idempotent');

    });

});
