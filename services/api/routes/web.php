<?php

use App\Core\Http\Controllers\Api\DmrExportController;
use App\Core\Http\Controllers\Internal\RealtimeEventController;
use App\Core\Models\PortalToken;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => view('welcome'));

// ── Client Portal SPA (read-only web view for mine operators) ─────────────
Route::get('/portal/{token}', function (string $token) {
    $hash = hash('sha256', $token);
    $record = PortalToken::where('token_hash', $hash)->first();

    if ($record === null) {
        abort(404);
    }

    if (! $record->isValid()) {
        return view('portal-expired');
    }

    $workspace = $record->workspace;

    return view('portal', [
        'token' => $token,
        'workspaceName' => $workspace->name,
        'expiresAt' => $record->expires_at->toIso8601String(),
    ]);
});

// Internal routes called by services (protected by short-lived JWT)
Route::prefix('internal')->middleware(['internal.jwt'])->group(function () {
    Route::get('realtime/events', [RealtimeEventController::class, 'index']);
});

// HSSE incident export routes (authenticated via api.php auth:sanctum middleware)
Route::prefix('workspaces/{workspace}/hsse/incidents/{incident}/export')->middleware(['auth:sanctum', 'workspace'])->group(function () {
    Route::get('dmr', [DmrExportController::class, 'dmr'])->name('hsse.incidents.export.dmr');
    Route::get('coida', [DmrExportController::class, 'coida'])->name('hsse.incidents.export.coida');
});
