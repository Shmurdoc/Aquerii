<?php

use App\Modules\Inventory\Http\Controllers\InventoryCategoryController;
use App\Modules\Inventory\Http\Controllers\ProductController;
use App\Modules\Inventory\Http\Controllers\StockItemController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {

    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {

        Route::apiResource('inventory/categories', InventoryCategoryController::class)->middleware('idempotent');
        Route::apiResource('inventory/products', ProductController::class)->middleware('idempotent');

        Route::get('inventory/stock-items', [StockItemController::class, 'index']);
        Route::post('inventory/stock-items', [StockItemController::class, 'store'])->middleware('idempotent');
        Route::put('inventory/stock-items/{id}', [StockItemController::class, 'update'])->middleware('idempotent');
        Route::delete('inventory/stock-items/{id}', [StockItemController::class, 'destroy'])->middleware('idempotent');

        // Stock items for a specific product
        Route::get('inventory/products/{product}/stock-items', [StockItemController::class, 'byProduct']);
    });

});
