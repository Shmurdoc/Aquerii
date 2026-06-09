<?php

use App\Http\Controllers\Internal\DocumentYdocController;
use App\Http\Controllers\Internal\RealtimeEventController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => view('welcome'));

// Internal routes called by services (protected by X-Internal-Secret header)
Route::prefix('internal')->middleware(['internal.secret'])->group(function () {
    Route::get('documents/{id}/ydoc', [DocumentYdocController::class, 'show']);
    Route::patch('documents/{id}/ydoc', [DocumentYdocController::class, 'update']);
    Route::get('realtime/events', [RealtimeEventController::class, 'index']);
});
