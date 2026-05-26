<?php

use App\Modules\Invoicing\Http\Controllers\InvoiceController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {
        Route::apiResource('invoices', InvoiceController::class)->middleware('idempotent');
    });
});
