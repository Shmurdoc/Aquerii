<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\OAuthController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\BoardColumnController;
use App\Http\Controllers\BoardGroupController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CRM\ContactController;
use App\Http\Controllers\CRM\CompanyController;
use App\Http\Controllers\CRM\DealController;
use App\Http\Controllers\AutomationController;
use App\Http\Controllers\AI\AIController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\WebhookController;

// ── Public ────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('register',         [AuthController::class, 'register'])->middleware('idempotent');
    Route::post('login',            [AuthController::class, 'login']);
    Route::post('forgot-password',  [AuthController::class, 'forgotPassword']);
    Route::post('reset-password',   [AuthController::class, 'resetPassword'])->middleware('idempotent');
    Route::post('verify-email/{id}/{hash}', [AuthController::class, 'verifyEmail']);
    Route::post('refresh',          [AuthController::class, 'refresh']);
    Route::get('oauth/{provider}',  [OAuthController::class, 'redirect']);
    Route::get('oauth/{provider}/callback', [OAuthController::class, 'callback']);
});

// Billing webhooks (raw body — no middleware)
Route::post('webhooks/stripe',  [WebhookController::class, 'stripe']);
Route::post('webhooks/payfast', [WebhookController::class, 'payfast']);

// ── Authenticated ─────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('auth/logout',      [AuthController::class, 'logout']);
    Route::post('auth/mfa/enable',  [AuthController::class, 'enableMfa'])->middleware('idempotent');
    Route::post('auth/mfa/verify',  [AuthController::class, 'verifyMfa']);

    // Current user
    Route::get('me',                [UserController::class, 'me']);
    Route::put('me',                [UserController::class, 'update'])->middleware('idempotent');
    Route::get('me/notifications',  [NotificationController::class, 'index']);
    Route::patch('me/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('me/notifications/read-all',   [NotificationController::class, 'markAllRead']);

    // Workspaces
    Route::post('workspaces',                   [WorkspaceController::class, 'store'])->middleware('idempotent');
    Route::get('workspaces/{workspace}',        [WorkspaceController::class, 'show'])->middleware('workspace');
    Route::put('workspaces/{workspace}',        [WorkspaceController::class, 'update'])->middleware(['workspace','idempotent']);
    Route::get('workspaces/{workspace}/members',[WorkspaceController::class, 'members'])->middleware('workspace');
    Route::post('workspaces/{workspace}/invite',[WorkspaceController::class, 'invite'])->middleware(['workspace','idempotent']);
    Route::delete('workspaces/{workspace}/members/{user}', [WorkspaceController::class, 'removeMember'])->middleware(['workspace','idempotent']);

    // Billing
    Route::prefix('workspaces/{workspace}/billing')->middleware('workspace')->group(function () {
        Route::get('',                  [BillingController::class, 'show']);
        Route::post('checkout',         [BillingController::class, 'checkout'])->middleware('idempotent');
        Route::post('portal',           [BillingController::class, 'portal']);
        Route::post('cancel',           [BillingController::class, 'cancel'])->middleware('idempotent');
    });

    // Boards
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {

        Route::apiResource('boards', BoardController::class)->middleware('idempotent');

        Route::prefix('boards/{board}')->group(function () {
            Route::apiResource('columns', BoardColumnController::class)->middleware('idempotent');
            Route::apiResource('groups',  BoardGroupController::class)->middleware('idempotent');
            Route::apiResource('items',   ItemController::class)->middleware('idempotent');

            Route::get('items/{item}/activity',   [ItemController::class, 'activity']);
            Route::get('items/{item}/subitems',   [ItemController::class, 'subitems']);
            Route::post('items/{item}/duplicate', [ItemController::class, 'duplicate'])->middleware('idempotent');
            Route::post('items/{item}/move',      [ItemController::class, 'move'])->middleware('idempotent');
        });

        // Comments
        Route::post('items/{item}/comments',          [CommentController::class, 'store'])->middleware('idempotent');
        Route::put('comments/{comment}',              [CommentController::class, 'update'])->middleware('idempotent');
        Route::delete('comments/{comment}',           [CommentController::class, 'destroy'])->middleware('idempotent');

        // Documents
        Route::apiResource('documents', DocumentController::class)->middleware('idempotent');
        Route::post('documents/{document}/publish',   [DocumentController::class, 'publish'])->middleware('idempotent');

        // Files
        Route::post('files',              [FileController::class, 'store'])->middleware('idempotent');
        Route::delete('files/{file}',     [FileController::class, 'destroy'])->middleware('idempotent');

        // CRM
        Route::apiResource('crm/contacts',  ContactController::class)->middleware('idempotent');
        Route::apiResource('crm/companies', CompanyController::class)->middleware('idempotent');
        Route::apiResource('crm/deals',     DealController::class)->middleware('idempotent');

        // Automations
        Route::apiResource('automations',  AutomationController::class)->middleware('idempotent');
        Route::post('automations/{automation}/toggle', [AutomationController::class, 'toggle'])->middleware('idempotent');
        Route::get('automations/{automation}/runs',    [AutomationController::class, 'runs']);

        // AI
        Route::post('ai/task-assist',    [AIController::class, 'taskAssist'])->middleware('idempotent');
        Route::post('ai/document',       [AIController::class, 'documentAssist'])->middleware('idempotent');
        Route::post('ai/crm-score',      [AIController::class, 'crmScore'])->middleware('idempotent');
        Route::post('ai/summarise',      [AIController::class, 'summarise'])->middleware('idempotent');
        Route::post('ai/chat',           [AIController::class, 'chat'])->middleware('idempotent');
    });
});
