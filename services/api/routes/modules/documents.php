<?php

use App\Modules\Documents\Http\Controllers\DocumentController;
use App\Modules\Documents\Http\Controllers\ScannedDocumentController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {

    // Collaborative documents (notes)
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {
        Route::apiResource('documents', DocumentController::class)->middleware('idempotent');

        // Scanned documents (paperless-ngx replacement)
        Route::get('scanned-documents', [ScannedDocumentController::class, 'index']);
        Route::post('scanned-documents', [ScannedDocumentController::class, 'store'])->middleware('idempotent');
        Route::get('scanned-documents/{id}', [ScannedDocumentController::class, 'show']);
        Route::delete('scanned-documents/{id}', [ScannedDocumentController::class, 'destroy'])->middleware('idempotent');
        Route::patch('scanned-documents/{id}', [ScannedDocumentController::class, 'update'])->middleware('idempotent');
        Route::get('scanned-documents/{id}/download', [ScannedDocumentController::class, 'download']);
    });

});
