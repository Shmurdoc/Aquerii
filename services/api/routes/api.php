<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\OAuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\BoardColumnController;
use App\Http\Controllers\BoardGroupController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\Api\WorkspaceController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Api\AutomationController;
use App\Http\Controllers\Api\AIController;
use App\Http\Controllers\Api\CRM\PipelineController;
use App\Http\Controllers\Api\CRM\DealController;
use App\Http\Controllers\Api\CRM\ContactController;
use App\Http\Controllers\Api\CRM\CompanyController;
use App\Http\Controllers\Api\CRM\StageController;

// ── Health check (public) ─────────────────────────────────────────────────────
Route::get('healthz', fn() => response()->json(['status' => 'ok', 'service' => 'api']));

// ── Public auth ───────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('register',                         [AuthController::class, 'register'])->middleware('idempotent');
    Route::post('login',                            [AuthController::class, 'login']);
    Route::post('forgot-password',                  [AuthController::class, 'forgotPassword']);
    Route::post('reset-password',                   [AuthController::class, 'resetPassword'])->middleware('idempotent');
    Route::post('verify-email/{id}/{hash}',         [AuthController::class, 'verifyEmail']);
    Route::post('refresh',                          [AuthController::class, 'refresh']);
    Route::get('oauth/{provider}',                  [OAuthController::class, 'redirect']);
    Route::get('oauth/{provider}/callback',         [OAuthController::class, 'callback']);
});

// ── Billing webhooks (raw body — bypass idempotency & auth) ──────────────────
Route::post('webhooks/stripe',  [WebhookController::class, 'stripe']);
Route::post('webhooks/payfast', [WebhookController::class, 'payfast']);

// ── Authenticated ─────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth actions
    Route::post('auth/logout',      [AuthController::class, 'logout']);
    Route::post('auth/mfa/enable',  [AuthController::class, 'enableMfa'])->middleware('idempotent');
    Route::post('auth/mfa/verify',  [AuthController::class, 'verifyMfa']);

    // Current user
    Route::get('me',                              [UserController::class, 'me']);
    Route::put('me',                              [UserController::class, 'update'])->middleware('idempotent');
    Route::get('me/notifications',                [NotificationController::class, 'index']);
    Route::patch('me/notifications/{id}/read',    [NotificationController::class, 'markRead']);
    Route::post('me/notifications/read-all',      [NotificationController::class, 'markAllRead']);

    // Workspace creation (no workspace middleware yet — creates workspace)
    Route::post('workspaces', [WorkspaceController::class, 'store'])->middleware('idempotent');

    // All workspace-scoped routes
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {

        Route::get('',  [WorkspaceController::class, 'show']);
        Route::patch('', [WorkspaceController::class, 'update'])->middleware('idempotent');

        // Members
        Route::get('members',                      [WorkspaceController::class, 'members']);
        Route::post('members',                     [WorkspaceController::class, 'inviteMember'])->middleware('idempotent');
        Route::patch('members/{userId}',           [WorkspaceController::class, 'updateMemberRole'])->middleware('idempotent');
        Route::delete('members/{userId}',          [WorkspaceController::class, 'removeMember'])->middleware('idempotent');

        // Billing
        Route::prefix('billing')->group(function () {
            Route::get('',                         [BillingController::class, 'show']);
            Route::post('checkout',                [BillingController::class, 'createCheckout'])->middleware('idempotent');
            Route::post('portal',                  [BillingController::class, 'createPortal']);
            Route::delete('subscription',          [BillingController::class, 'cancelSubscription'])->middleware('idempotent');
            Route::post('payfast/checkout',        [BillingController::class, 'payfastCheckout'])->middleware('idempotent');
        });

        // Boards
        Route::apiResource('boards', BoardController::class)->except(['index'])->middleware('idempotent');
        Route::get('boards',                       [BoardController::class, 'index']);

        Route::prefix('boards/{board}')->group(function () {
            Route::apiResource('columns', BoardColumnController::class)->middleware('idempotent');
            Route::apiResource('groups',  BoardGroupController::class)->middleware('idempotent');
            Route::apiResource('items',   ItemController::class)->middleware('idempotent');

            Route::get('items/{item}/activity',    [ItemController::class, 'activity']);
            Route::get('items/{item}/subitems',    [ItemController::class, 'subitems']);
            Route::post('items/{item}/subitems',   [ItemController::class, 'storeSubitem'])->middleware('idempotent');
            Route::post('items/{item}/duplicate',  [ItemController::class, 'duplicate'])->middleware('idempotent');
            Route::post('items/{item}/move',       [ItemController::class, 'move'])->middleware('idempotent');

            // Item assignees
            Route::post('items/{item}/assignees',           [ItemController::class, 'addAssignee'])->middleware('idempotent');
            Route::delete('items/{item}/assignees/{userId}',[ItemController::class, 'removeAssignee'])->middleware('idempotent');
        });

        // Comments (item-scoped)
        Route::get('items/{item}/comments',        [CommentController::class, 'index']);
        Route::post('items/{item}/comments',       [CommentController::class, 'store'])->middleware('idempotent');
        Route::patch('items/{item}/comments/{comment}', [CommentController::class, 'update'])->middleware('idempotent');
        Route::delete('items/{item}/comments/{comment}',[CommentController::class, 'destroy'])->middleware('idempotent');

        // Files (item-scoped)
        Route::get('items/{item}/files',           [FileController::class, 'index']);
        Route::post('items/{item}/files',          [FileController::class, 'store'])->middleware('idempotent');
        Route::delete('files/{file}',              [FileController::class, 'destroy'])->middleware('idempotent');

        // Documents
        Route::apiResource('documents', DocumentController::class)->middleware('idempotent');

        // Notifications
        Route::get('notifications',                [NotificationController::class, 'index']);
        Route::patch('notifications/{id}/read',    [NotificationController::class, 'markRead']);
        Route::post('notifications/read-all',      [NotificationController::class, 'markAllRead']);

        // CRM
        Route::get('crm/pipelines',                [PipelineController::class, 'index']);
        Route::post('crm/pipelines',               [PipelineController::class, 'store'])->middleware('idempotent');
        Route::apiResource('crm/deals',            DealController::class)->middleware('idempotent');
        Route::apiResource('crm/contacts',         ContactController::class)->middleware('idempotent');
        Route::apiResource('crm/companies',        CompanyController::class)->middleware('idempotent');

        // Automations
        Route::apiResource('automations',          AutomationController::class)->middleware('idempotent');
        Route::get('automations/{automation}/runs',[AutomationController::class, 'runs']);

        // AI
        Route::prefix('ai')->middleware('idempotent')->group(function () {
            Route::post('chat',                      [AIController::class, 'chat']);
            Route::post('summarize',                 [AIController::class, 'summarize']);
            Route::post('score-deal',                [AIController::class, 'scoreDeal']);
            Route::get('credits',                    [AIController::class, 'credits']);
            Route::post('task/generate-description', [AIController::class, 'generateTaskDescription']);
            Route::post('document/generate',         [AIController::class, 'generateDocument']);
            Route::post('automation/generate',       [AIController::class, 'generateAutomation']);
        });
    });
});
