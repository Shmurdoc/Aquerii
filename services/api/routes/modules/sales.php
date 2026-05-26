<?php

use App\Modules\Sales\Http\Controllers\SalesOrderController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {

    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {

        Route::apiResource('sales/orders', SalesOrderController::class)->middleware('idempotent');

    });

});
