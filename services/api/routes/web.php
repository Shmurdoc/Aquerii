<?php

use App\Core\Http\Controllers\Internal\RealtimeEventController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => view('welcome'));

// Internal routes called by services (protected by X-Internal-Secret header)
Route::prefix('internal')->middleware(['internal.secret'])->group(function () {
    Route::get('realtime/events', [RealtimeEventController::class, 'index']);
});
