<?php

use App\Core\Http\Controllers\Api\AuditLogController;
use App\Core\Http\Controllers\Api\BillingController;
use App\Core\Http\Controllers\Api\BrandingController;
use App\Core\Http\Controllers\Api\BulkActionController;
use App\Core\Http\Controllers\Api\ClientPortalController;
use App\Core\Http\Controllers\Api\CommentController;
use App\Core\Http\Controllers\Api\ComplianceController;
use App\Core\Http\Controllers\Api\DocumentPdfController;
use App\Core\Http\Controllers\Api\EmployeeGroupController;
use App\Core\Http\Controllers\Api\EquipmentCertRecordController;
use App\Core\Http\Controllers\Api\EquipmentCertTypeController;
use App\Core\Http\Controllers\Api\ExportController;
use App\Core\Http\Controllers\Api\FieldPermissionController;
use App\Core\Http\Controllers\Api\FileController;
use App\Core\Http\Controllers\Api\FinancialApprovalController;
use App\Core\Http\Controllers\Api\GoalController;
use App\Core\Http\Controllers\Api\IntegrationReliabilityController;
use App\Core\Http\Controllers\Api\InvoicePdfController;
use App\Core\Http\Controllers\Api\InvoiceWorkflowController;
use App\Core\Http\Controllers\Api\MeetingOutcomeController;
use App\Core\Http\Controllers\Api\NotificationController;
use App\Core\Http\Controllers\Api\OfflineSyncController;
use App\Core\Http\Controllers\Api\PluginController;
use App\Core\Http\Controllers\Api\ReportController;
use App\Core\Http\Controllers\Api\ReportScheduleController;
use App\Core\Http\Controllers\Api\ROIController;
use App\Core\Http\Controllers\Api\ScenarioController;
use App\Core\Http\Controllers\Api\ScimController;
use App\Core\Http\Controllers\Api\SentimentController;
use App\Core\Http\Controllers\Api\ShiftReadinessController;
use App\Core\Http\Controllers\Api\UserSettingsController;
use App\Core\Http\Controllers\Api\VisitorController;
use App\Core\Http\Controllers\Api\WebhookController;
use App\Core\Http\Controllers\Api\WorkspaceController;
use App\Core\Http\Controllers\Api\WorkspaceLogoController;
use App\Core\Http\Controllers\Auth\AuthController;
use App\Core\Http\Controllers\Auth\OAuthController;
use App\Core\Http\Controllers\BoardColumnController;
use App\Core\Http\Controllers\BoardController;
use App\Core\Http\Controllers\BoardGroupController;
use App\Core\Http\Controllers\ItemController;
use App\Core\Http\Controllers\PermissionController;
use App\Core\Http\Controllers\PersonalAccessTokenController;
use App\Core\Http\Controllers\PushSubscriptionController;
use App\Core\Http\Controllers\SavedViewController;
use App\Core\Http\Controllers\StorageController;
use App\Core\Http\Controllers\UserController;
use App\Core\Http\Controllers\WebhookEndpointController;
use App\Core\Models\Item;
use App\Http\Controllers\Api\CalendarItemController;
use App\Http\Controllers\Api\GateController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\WorkspaceInvitationController;
use App\Modules\AI\Http\Controllers\AIController;
use App\Modules\Automation\Http\Controllers\AutomationController;
use App\Modules\Automation\Http\Controllers\RecommendationController;
use App\Modules\CRM\Http\Controllers\CalendarSyncController;
use App\Modules\CRM\Http\Controllers\CallLogController;
use App\Modules\CRM\Http\Controllers\CompanyController;
use App\Modules\CRM\Http\Controllers\ConsentController;
use App\Modules\CRM\Http\Controllers\ContactController;
use App\Modules\CRM\Http\Controllers\ContactImportController;
use App\Modules\CRM\Http\Controllers\ContractMilestoneController;
use App\Modules\CRM\Http\Controllers\CrmActivityController;
use App\Modules\CRM\Http\Controllers\CrmAnalyticsController;
use App\Modules\CRM\Http\Controllers\CrmAutomationRuleController;
use App\Modules\CRM\Http\Controllers\CrmReportController;
use App\Modules\CRM\Http\Controllers\DealApprovalController;
use App\Modules\CRM\Http\Controllers\DealController;
use App\Modules\CRM\Http\Controllers\ForecastController;
use App\Modules\CRM\Http\Controllers\LeadController;
use App\Modules\CRM\Http\Controllers\PipelineController;
use App\Modules\CRM\Http\Controllers\ProductController as CrmProductController;
use App\Modules\CRM\Http\Controllers\QuotaController;
use App\Modules\CRM\Http\Controllers\QuoteController;
use App\Modules\CRM\Http\Controllers\SequenceController;
use App\Modules\CRM\Http\Controllers\StageController;
use App\Modules\CRM\Http\Controllers\WorkOrderController;
use App\Modules\Email\Http\Controllers\InboundEmailController;
use App\Modules\Email\Http\Controllers\ProjectEmailAddressController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// ── Health check (public) ─────────────────────────────────────────────────────
Route::get('healthz', fn () => response()->json(['status' => 'ok', 'service' => 'api']));
Route::get('health', fn () => response()->json(['status' => 'ok', 'service' => 'api']));

// ── Branding (public — used by login page to load workspace theme) ────────────
Route::get('branding', [BrandingController::class, 'show']);

// ── Public auth ───────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    $isTest = app()->environment('testing');

    $env = app()->environment();
    $loginLimit = $env === 'production' ? '5,1' : ($env === 'testing' ? '600,1' : '600,1');
    $registerLimit = $env === 'production' ? '10,1' : '600,1';
    $forgotLimit = $env === 'production' ? '3,1' : '600,1';
    $resetLimit = $env === 'production' ? '5,1' : '600,1';
    $refreshLimit = $env === 'production' ? '10,1' : '600,1';
    $resendLimit = $env === 'production' ? '3,1' : '600,1';
    $oauthLimit = $env === 'production' ? '10,1' : '600,1';

    Route::post('register', [AuthController::class, 'register'])->middleware($isTest ? ['idempotent'] : ["throttle:$registerLimit", 'idempotent']);
    Route::post('login', [AuthController::class, 'login'])->middleware($isTest ? [] : ["throttle:$loginLimit"]);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware($isTest ? [] : ["throttle:$forgotLimit"]);
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware($isTest ? ['idempotent'] : ["throttle:$resetLimit", 'idempotent']);
    Route::post('refresh', [AuthController::class, 'refresh'])->middleware($isTest ? [] : ["throttle:$refreshLimit"]);
    Route::post('verify-email/resend', [AuthController::class, 'resendVerification'])->middleware($isTest ? [] : ["throttle:$resendLimit"]);
    Route::post('verify-email/{id}/{hash}', [AuthController::class, 'verifyEmail'])->name('verification.verify');
    Route::get('oauth/{provider}', [OAuthController::class, 'redirect'])->middleware($isTest ? [] : ["throttle:$oauthLimit"]);
    Route::get('oauth/{provider}/callback', [OAuthController::class, 'callback'])->middleware($isTest ? [] : ["throttle:$oauthLimit"]);
});

// ── Workspace invitation accept (signed URL — no auth required) ──────────────
Route::get('invitations/{token}/accept', [WorkspaceInvitationController::class, 'accept'])
    ->middleware('throttle:20,1')
    ->name('invitations.accept');

// ── Invite accept via token (auth required — links token to logged-in user) ──
Route::middleware('auth:sanctum')->group(function () {
    Route::post('invites/{token}/accept', [WorkspaceController::class, 'acceptInvite'])->middleware('idempotent');
});

// ── Billing webhooks (raw body — bypass idempotency & auth) ──────────────────
Route::post('webhooks/stripe', [WebhookController::class, 'stripe']);
Route::post('webhooks/payfast', [WebhookController::class, 'payfast']);

// ── Authenticated ─────────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {

    // Auth actions
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::post('auth/mfa/enable', [AuthController::class, 'enableMfa'])->middleware(['idempotent', 'verified']);
    Route::post('auth/mfa/verify', [AuthController::class, 'verifyMfa'])->middleware('throttle:5,1');
    Route::post('auth/mfa/verify-token', [AuthController::class, 'verifyMfaWithToken'])->middleware('throttle:5,1');
    Route::post('auth/mfa/disable', [AuthController::class, 'disableMfa']);

    // Current user
    Route::get('me', [UserController::class, 'me']);
    Route::put('me', [UserController::class, 'update'])->middleware('idempotent');
    Route::post('me/avatar', [UserController::class, 'uploadAvatar']);
    Route::get('me/permissions', [PermissionController::class, 'me']);

    // Web Push subscriptions (user-scoped, not workspace-scoped — a user
    // gets the same browser push across every workspace they belong to).
    Route::get('me/push-subscriptions', [PushSubscriptionController::class, 'index']);
    Route::post('me/push-subscriptions', [PushSubscriptionController::class, 'store'])->middleware('idempotent');
    Route::delete('me/push-subscriptions/{id}', [PushSubscriptionController::class, 'destroy'])->middleware('idempotent');

    // Personal access tokens (CLI / script access). The plaintext is only
    // ever returned at creation — subsequent GETs expose nothing
    // reconstructible.
    Route::get('me/personal-access-tokens', [PersonalAccessTokenController::class, 'index']);
    Route::post('me/personal-access-tokens', [PersonalAccessTokenController::class, 'store'])->middleware('idempotent');
    Route::delete('me/personal-access-tokens/{id}', [PersonalAccessTokenController::class, 'destroy'])->middleware('idempotent');

    // User settings (Fortify-style routes)
    Route::post('user/two-factor-authentication', [UserSettingsController::class, 'enableTwoFactor']);
    Route::post('user/confirmed-two-factor-authentication', [UserSettingsController::class, 'confirmTwoFactor']);
    Route::delete('user/two-factor-authentication', [UserSettingsController::class, 'disableTwoFactor']);
    Route::get('user/two-factor-qr-code', [UserSettingsController::class, 'getTwoFactorQrCode']);
    Route::get('user/two-factor-recovery-codes', [UserSettingsController::class, 'getTwoFactorRecoveryCodes']);
    Route::get('user/sessions', [UserSettingsController::class, 'getSessions']);
    Route::delete('user/sessions/{sessionId}', [UserSettingsController::class, 'revokeSession']);
    Route::get('user/notifications/preferences', [UserSettingsController::class, 'getNotificationPreferences']);
    Route::put('user/notifications/preferences', [UserSettingsController::class, 'updateNotificationPreferences']);
    Route::post('user/password', [UserSettingsController::class, 'changePassword']);
    Route::get('me/notifications', [NotificationController::class, 'index']);
    Route::patch('me/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('me/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::get('me/notification-preferences', [UserSettingsController::class, 'getNotificationPreferences']);
    Route::put('me/notification-preferences', [UserSettingsController::class, 'updateNotificationPreferences']);

    // Workspace creation
    Route::get('workspaces', [WorkspaceController::class, 'index']);
    Route::post('workspaces', [WorkspaceController::class, 'store'])->middleware('idempotent');

    // All workspace-scoped routes
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {

        // Chat module (higher throttle limit for real-time usage)
        Route::middleware('throttle:120,1')->group(function () {
            require __DIR__.'/modules/chat.php';
        });

        Route::get('', [WorkspaceController::class, 'show'])->name('workspaces.show');
        Route::patch('', [WorkspaceController::class, 'update'])->middleware('idempotent');
        Route::delete('', [WorkspaceController::class, 'destroy'])->middleware('idempotent');

        // Logo
        Route::post('logo', [WorkspaceLogoController::class, 'store'])->middleware('idempotent');
        Route::delete('logo', [WorkspaceLogoController::class, 'destroy'])->middleware('idempotent');

        // Search
        Route::get('search', [WorkspaceController::class, 'search']);

        // Members
        Route::get('members', [WorkspaceController::class, 'members']);
        Route::post('members', [WorkspaceController::class, 'inviteMember'])->middleware('idempotent');
        Route::patch('members/{userId}', [WorkspaceController::class, 'updateMemberRole'])->middleware('idempotent');
        Route::delete('members/{userId}', [WorkspaceController::class, 'removeMember'])->middleware('idempotent');

        // Invitations
        Route::post('invitations', [WorkspaceInvitationController::class, 'store'])->middleware('idempotent');

        // Employee Groups (org chart / role hierarchy)
        Route::get('employee-groups/org-chart', [EmployeeGroupController::class, 'orgChart']);
        Route::apiResource('employee-groups', EmployeeGroupController::class)->middleware('idempotent');
        Route::get('invitations', [WorkspaceInvitationController::class, 'index']);
        Route::delete('invitations/{token}', [WorkspaceInvitationController::class, 'destroy'])->middleware('idempotent');

        // Compliance engine
        Route::get('compliance', [ComplianceController::class, 'index']);
        Route::get('compliance/dashboard', [ComplianceController::class, 'dashboard']);
        Route::get('compliance/equipment', [ComplianceController::class, 'equipmentIndex']);
        Route::get('compliance/equipment/{equipment}', [ComplianceController::class, 'equipmentShow']);

        // ROI Dashboard
        Route::get('roi/dashboard', [ROIController::class, 'dashboard']);

        // Shift planning / workforce readiness
        Route::prefix('shift-readiness')->group(function () {
            Route::get('', [ShiftReadinessController::class, 'readiness']);
            Route::get('plans', [ShiftReadinessController::class, 'plans']);
            Route::post('plans', [ShiftReadinessController::class, 'storePlan'])->middleware('idempotent');
            Route::post('plans/{plan}/assign', [ShiftReadinessController::class, 'assign'])->middleware('idempotent');
            Route::post('plans/{plan}/publish', [ShiftReadinessController::class, 'publish'])->middleware('idempotent');
            Route::post('plans/{plan}/complete', [ShiftReadinessController::class, 'complete'])->middleware('idempotent');
        });

        // Billing
        Route::prefix('billing')->group(function () {
            Route::get('', [BillingController::class, 'show']);
            Route::post('checkout', [BillingController::class, 'createCheckout'])->middleware('idempotent');
            Route::post('portal', [BillingController::class, 'createPortal']);
            Route::delete('subscription', [BillingController::class, 'cancelSubscription'])->middleware('idempotent');
            Route::post('payfast/checkout', [BillingController::class, 'payfastCheckout'])->middleware('idempotent');
        });

        // Storage usage + breakdown
        Route::get('storage', [StorageController::class, 'show']);

        // Boards
        Route::apiResource('boards', BoardController::class)->except(['index'])->middleware('idempotent');
        Route::get('boards', [BoardController::class, 'index']);

        // My Day — aggregate view across all boards
        Route::get('my-day', [ItemController::class, 'myDay']);

        // Calendar — items with due_dates in a custom date range
        Route::get('calendar-items', [CalendarItemController::class, 'index']);

        Route::prefix('boards/{board}')->group(function () {
            Route::apiResource('columns', BoardColumnController::class)->middleware('idempotent');
            Route::apiResource('groups', BoardGroupController::class)->middleware('idempotent');
            Route::apiResource('items', ItemController::class)->middleware('idempotent');

            Route::get('items/{item}/activity', [ItemController::class, 'activity']);
            Route::get('items/{item}/linked-documents', function (Item $item) {
                return response()->json(['data' => $item->linkedDocuments]);
            });
            Route::get('items/{item}/linked-deals', function (Item $item) {
                return response()->json(['data' => $item->linkedDeals]);
            });
            Route::get('items/{item}/subitems', [ItemController::class, 'subitems']);
            Route::post('items/{item}/subitems', [ItemController::class, 'storeSubitem'])->middleware('idempotent');
            Route::post('items/{item}/duplicate', [ItemController::class, 'duplicate'])->middleware('idempotent');
            Route::post('items/{item}/move', [ItemController::class, 'move'])->middleware('idempotent');

            // Item assignees
            Route::post('items/{item}/assignees', [ItemController::class, 'addAssignee'])->middleware('idempotent');
            Route::delete('items/{item}/assignees/{userId}', [ItemController::class, 'removeAssignee'])->middleware('idempotent');
        });

        // Bulk actions
        Route::post('bulk', [BulkActionController::class, 'handle'])->middleware('idempotent');

        // Saved views (per-user filter/sort/column presets, optionally shared workspace-wide)
        Route::get('saved-views', [SavedViewController::class, 'index']);
        Route::post('saved-views', [SavedViewController::class, 'store'])->middleware('idempotent');
        Route::get('saved-views/{view}', [SavedViewController::class, 'show']);
        Route::put('saved-views/{view}', [SavedViewController::class, 'update'])->middleware('idempotent');
        Route::delete('saved-views/{view}', [SavedViewController::class, 'destroy'])->middleware('idempotent');
        Route::post('saved-views/{view}/share', [SavedViewController::class, 'share'])->middleware('idempotent');

        // Comments
        Route::get('items/{item}/comments', [CommentController::class, 'index']);
        Route::post('items/{item}/comments', [CommentController::class, 'store'])->middleware('idempotent');
        Route::patch('items/{item}/comments/{comment}', [CommentController::class, 'update'])->middleware('idempotent');
        Route::delete('items/{item}/comments/{comment}', [CommentController::class, 'destroy'])->middleware('idempotent');

        // Files
        Route::get('items/{item}/files', [FileController::class, 'index']);
        Route::post('items/{item}/files', [FileController::class, 'store'])->middleware('idempotent');
        Route::delete('files/{file}', [FileController::class, 'destroy'])->middleware('idempotent');

        // Notifications (workspace-scoped)
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::patch('notifications/{id}/read', [NotificationController::class, 'markRead']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);

        // Reports
        Route::get('reports/dashboard', [ReportController::class, 'dashboard']);
        Route::get('reports/invoices', [ReportController::class, 'invoices']);
        Route::get('reports/expenses', [ReportController::class, 'expenses']);
        Route::get('reports/procurement', [ReportController::class, 'procurement']);
        Route::get('reports/inventory', [ReportController::class, 'inventory']);
        Route::get('reports/export/{type}', [ReportController::class, 'export']);

        // Scheduled report delivery (workspace admin)
        Route::get('reports/schedules', [ReportScheduleController::class, 'index'])->middleware('workspace.role:owner,admin');
        Route::post('reports/schedules', [ReportScheduleController::class, 'store'])->middleware(['idempotent', 'workspace.role:owner,admin']);
        Route::patch('reports/schedules/{schedule}', [ReportScheduleController::class, 'update'])->middleware(['idempotent', 'workspace.role:owner,admin']);
        Route::delete('reports/schedules/{schedule}', [ReportScheduleController::class, 'destroy'])->middleware('workspace.role:owner,admin');
        Route::post('reports/schedules/{schedule}/run-now', [ReportScheduleController::class, 'runNow'])->middleware(['idempotent', 'workspace.role:owner,admin']);
        Route::get('reports/schedules/exceptions', [ReportScheduleController::class, 'exceptions'])->middleware('workspace.role:owner,admin');

        // Integration reliability control plane (workspace admin)
        Route::get('integrations/webhook-events', [IntegrationReliabilityController::class, 'index'])->middleware('workspace.role:owner,admin');
        Route::post('integrations/webhook-events/{event}/retry', [IntegrationReliabilityController::class, 'retry'])->middleware(['idempotent', 'workspace.role:owner,admin']);
        Route::post('integrations/webhook-events/{event}/replay-now', [IntegrationReliabilityController::class, 'replayNow'])->middleware(['idempotent', 'workspace.role:owner,admin']);

        // Entity exports (xlsx, csv, json)
        Route::get('exports/{entity}/{format}', [ExportController::class, 'export']);

        // Audit logs (workspace admin)
        Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware('workspace.role:owner,admin');

        // Workspace activity feed (used by DashboardPage)
        Route::get('activity', function (Request $request, string $workspace) {
            $limit = min((int) $request->query('limit', 20), 100); // cap at 100
            $activity = DB::table('activity_log')
                ->where('workspace_id', $workspace) // workspace-scoped only, no cross-tenant orWhere
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();

            return response()->json(['data' => $activity]);
        });

        // Audit log export (owner/admin only, paginated, CSV-injection-safe)
        Route::get('audit-logs/export', function (Request $request, string $workspace) {
            $format = $request->query('format', 'csv');
            $logs = DB::table('activity_log')
                ->where('workspace_id', $workspace)
                ->orderBy('created_at', 'desc')
                ->limit(10000) // hard cap — no full-table dumps
                ->get();

            if ($format === 'json') {
                return response()->json(['data' => $logs])
                    ->header('Content-Disposition', 'attachment; filename="audit-logs.json"');
            }

            // CSV — sanitize every field to prevent formula injection
            $sanitize = function ($value): string {
                $value = (string) ($value ?? '');
                // Strip leading =, +, -, @ which Excel treats as formulas
                if (in_array(substr($value, 0, 1), ['=', '+', '-', '@'], true)) {
                    $value = "'".$value;
                }

                return '"'.str_replace('"', '""', $value).'"';
            };

            $csv = "ID,Action,Entity Type,Entity ID,Actor ID,Created At\n";
            foreach ($logs as $log) {
                $csv .= implode(',', [
                    $sanitize($log->id),
                    $sanitize($log->action),
                    $sanitize($log->entity_type),
                    $sanitize($log->entity_id),
                    $sanitize($log->actor_id),
                    $sanitize($log->created_at),
                ])."\n";
            }

            return response($csv)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', 'attachment; filename="audit-logs.csv"');
        })->middleware('workspace.role:owner,admin');

        // Field-level permissions (workspace admin)
        Route::get('field-permissions', [FieldPermissionController::class, 'index'])->middleware('workspace.role:owner,admin');
        Route::post('field-permissions', [FieldPermissionController::class, 'store'])->middleware(['idempotent', 'workspace.role:owner,admin']);
        Route::delete('field-permissions/{permission}', [FieldPermissionController::class, 'destroy'])->middleware('workspace.role:owner,admin');
        Route::post('field-permissions/bulk', [FieldPermissionController::class, 'bulkUpdate'])->middleware(['idempotent', 'workspace.role:owner,admin']);

        // SCIM token management (workspace admin)
        Route::get('scim/tokens', [FieldPermissionController::class, 'scimTokens'])->middleware('workspace.role:owner,admin');
        Route::post('scim/tokens', [FieldPermissionController::class, 'scimTokenCreate'])->middleware(['idempotent', 'workspace.role:owner,admin']);
        Route::delete('scim/tokens/{token}', [FieldPermissionController::class, 'scimTokenRevoke'])->middleware('workspace.role:owner,admin');
        // Legacy bootstrap path kept for compatibility with existing clients.
        Route::post('scim/users', [FieldPermissionController::class, 'scimUsersProvision'])->middleware('idempotent');

        // Outbound webhooks (OWNER only — not admin, for safety)
        Route::middleware('workspace.owner')->group(function () {
            Route::get('webhook-endpoints', [WebhookEndpointController::class, 'index']);
            Route::post('webhook-endpoints', [WebhookEndpointController::class, 'store'])->middleware('idempotent');
            Route::get('webhook-endpoints/{endpoint}', [WebhookEndpointController::class, 'show']);
            Route::put('webhook-endpoints/{endpoint}', [WebhookEndpointController::class, 'update'])->middleware('idempotent');
            Route::delete('webhook-endpoints/{endpoint}', [WebhookEndpointController::class, 'destroy'])->middleware('idempotent');
            Route::post('webhook-endpoints/{endpoint}/rotate-secret', [WebhookEndpointController::class, 'rotateSecret'])->middleware('idempotent');
            Route::get('webhook-endpoints/{endpoint}/deliveries', [WebhookEndpointController::class, 'deliveries']);
        });

        // CRM (basic: free tier; pipelines: gated)
        Route::get('crm/pipelines', [PipelineController::class, 'index']);
        Route::post('crm/pipelines', [PipelineController::class, 'store'])->middleware('idempotent');
        Route::get('crm/pipelines/{pipeline}', [PipelineController::class, 'show']);
        Route::patch('crm/pipelines/{pipeline}', [PipelineController::class, 'update'])->middleware('idempotent');
        Route::delete('crm/pipelines/{pipeline}', [PipelineController::class, 'destroy'])->middleware('idempotent');

        // CRM Pipeline Stages
        Route::get('crm/pipelines/{pipeline}/stages', [StageController::class, 'index']);
        Route::post('crm/pipelines/{pipeline}/stages', [StageController::class, 'store'])->middleware('idempotent');
        Route::patch('crm/pipelines/{pipeline}/stages/{stage}', [StageController::class, 'update'])->middleware('idempotent');
        Route::delete('crm/pipelines/{pipeline}/stages/{stage}', [StageController::class, 'destroy'])->middleware('idempotent');
        Route::post('crm/pipelines/{pipeline}/stages/reorder', [StageController::class, 'reorder'])->middleware('idempotent');

        // CRM Deals
        Route::apiResource('crm/deals', DealController::class)->middleware('idempotent');
        Route::post('crm/deals/{deal}/move', [DealController::class, 'move'])->middleware('idempotent');
        Route::post('crm/deals/{deal}/score', [DealController::class, 'score'])->middleware('idempotent');
        Route::patch('crm/deals/{deal}/link-item', [DealController::class, 'linkItem'])->middleware('idempotent');
        Route::patch('crm/deals/{deal}/unlink-item', [DealController::class, 'unlinkItem'])->middleware('idempotent');
        Route::post('crm/deals/{deal}/won', [DealController::class, 'markWon'])->middleware('idempotent');
        Route::post('crm/deals/{deal}/lost', [DealController::class, 'markLost'])->middleware('idempotent');

        // CRM Forecast
        Route::get('crm/forecast', [ForecastController::class, 'index']);
        Route::get('crm/forecast/by-rep', [ForecastController::class, 'byRep']);
        Route::get('crm/forecast/by-pipeline', [ForecastController::class, 'byPipeline']);

        // CRM Quotas
        Route::apiResource('crm/quotas', QuotaController::class)->middleware('idempotent');
        Route::post('crm/quotas/{quota}/attainment', [QuotaController::class, 'attainment'])->middleware('idempotent');

        // CRM Sequences
        Route::apiResource('crm/sequences', SequenceController::class)->middleware('idempotent');
        Route::post('crm/sequences/{sequence}/enroll', [SequenceController::class, 'enroll'])->middleware('idempotent');
        Route::post('crm/sequences/{sequence}/enrollments/{enrollment}/unenroll', [SequenceController::class, 'unenroll'])->middleware('idempotent');
        Route::get('crm/sequences/{sequence}/progress', [SequenceController::class, 'progress']);

        // CRM Call Logs
        Route::apiResource('crm/call-logs', CallLogController::class)->except(['update'])->middleware('idempotent');

        // CRM Deal Activities
        Route::get('crm/deals/{deal}/activities', [CrmActivityController::class, 'index']);
        Route::post('crm/deals/{deal}/activities', [CrmActivityController::class, 'store'])->middleware('idempotent');
        Route::patch('crm/deals/{deal}/activities/{activity}', [CrmActivityController::class, 'update'])->middleware('idempotent');
        Route::delete('crm/deals/{deal}/activities/{activity}', [CrmActivityController::class, 'destroy'])->middleware('idempotent');

        // CRM Contacts & Companies
        Route::apiResource('crm/contacts', ContactController::class)->middleware('idempotent');
        Route::post('crm/contacts/{contact}/transition', [ContactController::class, 'transition'])->middleware('idempotent');
        Route::get('crm/contacts/{contact}/duplicates', [ContactController::class, 'duplicates']);
        Route::post('crm/contacts/{contact}/merge', [ContactController::class, 'merge'])->middleware('idempotent');
        Route::post('crm/contacts/{contact}/relationships', [ContactController::class, 'addRelationship'])->middleware('idempotent');
        Route::delete('crm/contacts/{contact}/relationships/{relationshipId}', [ContactController::class, 'removeRelationship'])->middleware('idempotent');
        Route::post('crm/contacts/{contact}/touch', [ContactController::class, 'touch'])->middleware('idempotent');
        Route::apiResource('crm/companies', CompanyController::class)->middleware('idempotent');

        // CRM Consent
        Route::get('crm/contacts/{contact}/consent', [ConsentController::class, 'show']);
        Route::patch('crm/contacts/{contact}/consent', [ConsentController::class, 'update'])->middleware('idempotent');
        Route::post('crm/contacts/{contact}/consent/export', [ConsentController::class, 'export'])->middleware('idempotent');

        // CRM Lead Management
        Route::apiResource('crm/leads', LeadController::class)->middleware('idempotent');
        Route::post('crm/leads/{lead}/assign', [LeadController::class, 'assign'])->middleware('idempotent');
        Route::post('crm/leads/{lead}/convert', [LeadController::class, 'convert'])->middleware('idempotent');

        // CRM Contact Import
        Route::post('crm/contacts/import', [ContactImportController::class, 'store'])->middleware('idempotent');
        Route::get('crm/contacts/import/{importId}/status', [ContactImportController::class, 'status']);

        // CRM Reports & Analytics
        Route::get('crm/reports/pipeline-velocity', [CrmReportController::class, 'pipelineVelocity']);
        Route::get('crm/reports/revenue', [CrmReportController::class, 'revenue']);
        Route::get('crm/reports/win-loss', [CrmReportController::class, 'winLoss']);
        Route::get('crm/reports/activities', [CrmReportController::class, 'activities']);
        Route::get('crm/reports/lead-sources', [CrmReportController::class, 'leadSources']);

        Route::get('crm/analytics/funnel', [CrmAnalyticsController::class, 'funnel']);
        Route::get('crm/analytics/cohort', [CrmAnalyticsController::class, 'cohort']);
        Route::get('crm/analytics/churn-risk', [CrmAnalyticsController::class, 'churnRisk']);
        Route::get('crm/analytics/clv', [CrmAnalyticsController::class, 'clv']);

        // CRM Automation Rules
        Route::apiResource('crm/automation-rules', CrmAutomationRuleController::class)->middleware('idempotent');

        // CRM Deal Approval Rules
        Route::get('crm/approval-rules', [DealApprovalController::class, 'rules']);
        Route::post('crm/approval-rules', [DealApprovalController::class, 'storeRule'])->middleware('idempotent');
        Route::patch('crm/approval-rules/{rule}', [DealApprovalController::class, 'updateRule'])->middleware('idempotent');
        Route::delete('crm/approval-rules/{rule}', [DealApprovalController::class, 'destroyRule'])->middleware('idempotent');

        // CRM Deal Approvals
        Route::get('crm/deal-approvals', [DealApprovalController::class, 'approvals']);
        Route::post('crm/deal-approvals/{approval}/approve', [DealApprovalController::class, 'approve'])->middleware('idempotent');
        Route::post('crm/deal-approvals/{approval}/reject', [DealApprovalController::class, 'reject'])->middleware('idempotent');

        // CRM Products
        Route::apiResource('crm/products', CrmProductController::class)->middleware('idempotent');

        // CRM Quotes
        Route::apiResource('crm/quotes', QuoteController::class)->middleware('idempotent');
        Route::post('crm/quotes/{quote}/send', [QuoteController::class, 'send'])->middleware('idempotent');
        Route::post('crm/quotes/{quote}/accept', [QuoteController::class, 'accept'])->middleware('idempotent');
        Route::post('crm/quotes/{quote}/reject', [QuoteController::class, 'reject'])->middleware('idempotent');
        Route::post('crm/quotes/{quote}/duplicate', [QuoteController::class, 'duplicate'])->middleware('idempotent');

        // CRM Calendar Sync
        Route::get('crm/calendar-syncs', [CalendarSyncController::class, 'index']);
        Route::post('crm/calendar-syncs', [CalendarSyncController::class, 'store'])->middleware('idempotent');
        Route::delete('crm/calendar-syncs/{sync}', [CalendarSyncController::class, 'destroy'])->middleware('idempotent');
        Route::post('crm/calendar-syncs/{sync}/sync', [CalendarSyncController::class, 'sync'])->middleware('idempotent');
        Route::get('crm/provider-calendars', [CalendarSyncController::class, 'listProviderCalendars']);

        // CRM Telephony
        Route::post('crm/telephony', [CalendarSyncController::class, 'telephony'])->middleware('idempotent');

        // Contract Milestones (scoped under deals)
        Route::get('crm/deals/{deal}/milestones', [ContractMilestoneController::class, 'index']);
        Route::post('crm/deals/{deal}/milestones', [ContractMilestoneController::class, 'store'])->middleware('idempotent');
        Route::put('crm/milestones/{milestone}', [ContractMilestoneController::class, 'update'])->middleware('idempotent');
        Route::delete('crm/milestones/{milestone}', [ContractMilestoneController::class, 'destroy'])->middleware('idempotent');
        Route::post('crm/milestones/{milestone}/complete', [ContractMilestoneController::class, 'complete'])->middleware('idempotent');

        // Work Orders
        Route::get('crm/work-orders', [WorkOrderController::class, 'index']);
        Route::post('crm/work-orders', [WorkOrderController::class, 'store'])->middleware('idempotent');
        Route::get('crm/work-orders/{workOrder}', [WorkOrderController::class, 'show']);
        Route::put('crm/work-orders/{workOrder}', [WorkOrderController::class, 'update'])->middleware('idempotent');
        Route::delete('crm/work-orders/{workOrder}', [WorkOrderController::class, 'destroy'])->middleware('idempotent');
        Route::post('crm/work-orders/{workOrder}/issue', [WorkOrderController::class, 'issue'])->middleware('idempotent');
        Route::post('crm/work-orders/{workOrder}/complete', [WorkOrderController::class, 'complete'])->middleware('idempotent');

        // Automations (gated by plan)
        Route::middleware('feature:module.automation')->group(function () {
            Route::get('automation-templates', [AutomationController::class, 'templates']);
            Route::apiResource('automations', AutomationController::class)->middleware('idempotent');
            Route::get('automations/{automation}/runs', [AutomationController::class, 'runs']);
        });

        // AI (workspace-scoped, gated by plan)
        Route::prefix('ai')->middleware(['feature:module.ai', 'idempotent', 'throttle:10,1'])->group(function () {
            Route::post('chat', [AIController::class, 'chat']);
            Route::post('summarize', [AIController::class, 'summarize']);
            Route::post('score-deal', [AIController::class, 'scoreDeal']);
            Route::get('credits', [AIController::class, 'credits']);
            Route::post('task/generate-description', [AIController::class, 'generateTaskDescription']);
            Route::post('document/generate', [AIController::class, 'generateDocument']);
            Route::post('document/analyze', [AIController::class, 'analyzeDocument']);
            Route::post('document/auto-tag', [AIController::class, 'autoTagDocument']);
            Route::post('document/link-deal', [AIController::class, 'linkDocumentToDeal']);
            Route::post('automation/generate', [AIController::class, 'generateAutomation']);
            Route::post('flowchart/generate', [AIController::class, 'generateFlowchart']);
            Route::post('deal-summary', [AIController::class, 'dealSummary']);
            Route::post('churn-risk', [AIController::class, 'churnRisk']);
            Route::post('next-action', [AIController::class, 'nextAction']);
            Route::post('email-compose', [AIController::class, 'emailCompose']);
            Route::post('data-clean', [AIController::class, 'dataClean']);

            // AI-recommended automations (pattern detection)
            Route::get('automation-recommendations', [RecommendationController::class, 'index']);
            Route::post('automation-recommendations/refresh', [RecommendationController::class, 'refresh'])->middleware('idempotent');
            Route::post('automation-recommendations/{recommendation}/accept', [RecommendationController::class, 'accept'])->middleware('idempotent');
            Route::post('automation-recommendations/{recommendation}/dismiss', [RecommendationController::class, 'dismiss'])->middleware('idempotent');

            // Plugin marketplace
            Route::get('plugins/marketplace', [PluginController::class, 'marketplace']);
            Route::get('plugins/installed', [PluginController::class, 'installed']);
            Route::post('plugins/{plugin}/install', [PluginController::class, 'install'])->middleware('idempotent');
            Route::delete('plugins/{plugin}/uninstall', [PluginController::class, 'uninstall']);
            Route::post('plugins/{plugin}/toggle', [PluginController::class, 'toggle'])->middleware('idempotent');
            Route::patch('plugins/{plugin}/settings', [PluginController::class, 'updateSettings'])->middleware('idempotent');

            Route::post('anomaly-detection', [AIController::class, 'anomalyDetection']);

            // Predictions (rule-based)
            Route::post('predictions/task-duration', [AIController::class, 'predictTaskDuration']);
            Route::post('predictions/delay-risk', [AIController::class, 'predictDelayRisk']);
            Route::post('predictions/okr-progress', [AIController::class, 'predictOKRProgress']);
        });

        // ── Inventory: Products, Categories, Stock ──
        Route::apiResource('products', ProductController::class)->middleware('idempotent');
        Route::get('products/{product}/stock', [StockController::class, 'show']);
        Route::post('products/{product}/stock/adjust', [StockController::class, 'adjust'])->middleware('idempotent');
        Route::get('products/{product}/stock/movements', [StockController::class, 'movements']);

        // ── ERP: Invoicing, Sales, Purchasing, Inventory, Accounting ──
        Route::middleware('feature:module.erp')->group(function () {
            Route::get('invoices/{invoice}/pdf', [InvoicePdfController::class, 'show']);
            Route::get('invoices/{invoice}/payments', [InvoiceWorkflowController::class, 'listPayments']);
            Route::post('invoices/{invoice}/payments', [InvoiceWorkflowController::class, 'recordPayment'])->middleware('idempotent');
            Route::patch('invoices/{invoice}/status', [InvoiceWorkflowController::class, 'updateStatus'])->middleware('idempotent');
            Route::post('sales/orders/{so}/convert-to-invoice', [InvoiceWorkflowController::class, 'convertToInvoice'])->middleware('idempotent');

            // Financial approval controls (invoices)
            Route::get('finance/invoice-approvals', [FinancialApprovalController::class, 'index'])->middleware('workspace.role:owner,admin');
            Route::post('finance/invoices/{invoice}/submit-approval', [FinancialApprovalController::class, 'submitInvoice'])->middleware('idempotent');
            Route::post('finance/invoice-approvals/{approval}/approve', [FinancialApprovalController::class, 'approveInvoice'])->middleware(['idempotent', 'workspace.role:owner,admin']);
            Route::post('finance/invoice-approvals/{approval}/reject', [FinancialApprovalController::class, 'rejectInvoice'])->middleware(['idempotent', 'workspace.role:owner,admin']);
            Route::post('finance/invoices/{invoice}/reverse', [FinancialApprovalController::class, 'reversePostedInvoice'])->middleware(['idempotent', 'workspace.role:owner,admin']);

            Route::prefix('documents')->group(function () {
                Route::get('quotes/{id}/pdf', [DocumentPdfController::class, 'quote']);
                Route::get('sales-orders/{id}/pdf', [DocumentPdfController::class, 'salesOrder']);
                Route::get('purchase-orders/{id}/pdf', [DocumentPdfController::class, 'purchaseOrder']);
                Route::get('goods-receipts/{id}/pdf', [DocumentPdfController::class, 'goodsReceipt']);
                Route::get('receipts/{id}/pdf', [DocumentPdfController::class, 'receipt']);
                Route::get('credit-notes/{id}/pdf', [DocumentPdfController::class, 'creditNote']);
            });

            // Offline sync
            Route::get('sync/conflicts', [OfflineSyncController::class, 'conflicts']);
            Route::patch('sync/conflicts/{conflict}', [OfflineSyncController::class, 'resolve'])->middleware('idempotent');
            Route::post('sync/conflicts/resolve-all', [OfflineSyncController::class, 'resolveAll'])->middleware('idempotent');

            // Sentiment / burnout detection
            Route::get('sentiment/team', [SentimentController::class, 'teamOverview']);
            Route::get('sentiment/member/{userId}', [SentimentController::class, 'memberMetrics']);
            Route::post('sentiment/refresh', [SentimentController::class, 'refresh'])->middleware('idempotent');

            // Goals / OKRs
            Route::apiResource('goals', GoalController::class)->middleware('idempotent');

            // Meeting outcomes
            Route::get('meeting-outcomes', [MeetingOutcomeController::class, 'index']);
            Route::post('meetings/{meeting}/outcome', [MeetingOutcomeController::class, 'store'])->middleware('idempotent');
            Route::get('meetings/{meeting}/outcome', [MeetingOutcomeController::class, 'show']);

            // Scenarios (digital twin / what-if)
            Route::apiResource('scenarios', ScenarioController::class)->middleware('idempotent');
            Route::post('scenarios/{scenario}/adjustments', [ScenarioController::class, 'addAdjustment'])->middleware('idempotent');
            Route::delete('scenarios/{scenario}/adjustments/{adjustment}', [ScenarioController::class, 'removeAdjustment']);
            Route::post('scenarios/{scenario}/simulate', [ScenarioController::class, 'simulate'])->middleware('idempotent');
            Route::post('scenarios/compare', [ScenarioController::class, 'compare'])->middleware('idempotent');

            // Project email addresses (management)
            Route::get('email/project-addresses', [ProjectEmailAddressController::class, 'index']);
            Route::post('email/project-addresses', [ProjectEmailAddressController::class, 'store'])->middleware('idempotent');
            Route::patch('email/project-addresses/{address}', [ProjectEmailAddressController::class, 'update'])->middleware('idempotent');
            Route::delete('email/project-addresses/{address}', [ProjectEmailAddressController::class, 'destroy']);
        });

        // ── Job Cards module ────────────────────────────────────────────────
        require __DIR__.'/modules/jobcards.php';

        // ── Delegation module ───────────────────────────────────────────────
        require __DIR__.'/modules/delegation.php';

        // ── Template System module ─────────────────────────────────────────
        require __DIR__.'/modules/templates.php';

        // ── HR module ─────────────────────────────────────────────────────
        require __DIR__.'/modules/hr.php';

        // ── Equipment Compliance ──────────────────────────────────────────
        Route::apiResource('equipment.cert-types', EquipmentCertTypeController::class);
        Route::apiResource('equipment.cert-records', EquipmentCertRecordController::class);
        Route::post('equipment/{equipment}/cert-records/{cert_record}/verify', [EquipmentCertRecordController::class, 'verify']);

        // ── Equipment module ──────────────────────────────────────────────
        require __DIR__.'/modules/equipment.php';

        // ── Competency module ─────────────────────────────────────────────
        require __DIR__.'/modules/competency.php';

        // ── Documents module ──────────────────────────────────────────────
        require __DIR__.'/modules/documents.php';

        // ── Meetings module ──────────────────────────────────────────────
        require __DIR__.'/modules/meetings.php';

        // ── Site Access Log / Gate Kiosk ──────────────────────────────────
        Route::prefix('gate')->group(function () {
            Route::get('logs', [GateController::class, 'logs'])
                ->middleware('auth:sanctum');

            Route::get('stats', [GateController::class, 'stats'])
                ->middleware('auth:sanctum');

            Route::get('kiosk-tokens', [GateController::class, 'kioskTokens'])
                ->middleware(['auth:sanctum', 'workspace.role:owner,admin']);
        });

        // ── Client Portal — token generation (auth required) ──────────────
        Route::post('portal/token', [ClientPortalController::class, 'generateToken'])->middleware('idempotent');
    });

});

// ── Gate Kiosk scan routes (no sanctum — kiosk auth via API key only) ────────
Route::prefix('workspaces/{workspace}')->middleware(['workspace', 'throttle:60,1'])->group(function () {
    Route::prefix('gate')->group(function () {
        Route::post('scan', [GateController::class, 'scan'])
            ->middleware('gate-kiosk');

        Route::post('scan-equipment', [GateController::class, 'scanEquipment'])
            ->middleware('gate-kiosk');

        Route::prefix('visitors')->middleware('gate-kiosk')->group(function () {
            Route::post('sign-in', [VisitorController::class, 'signIn']);
            Route::get('active', [VisitorController::class, 'active']);
            Route::get('', [VisitorController::class, 'index']);
            Route::post('{visitor}/sign-out', [VisitorController::class, 'signOut']);
            Route::post('{visitor}/badge-printed', [VisitorController::class, 'markBadgePrinted']);
        });
    });
});

// ── Client Portal — read-only endpoints (portal token auth) ─────────────
Route::prefix('workspaces/{workspace}')->middleware(['throttle:60,1', 'workspace'])->group(function () {
    Route::get('portal/contractors', [ClientPortalController::class, 'contractors']);
    Route::get('portal/contractors/{companyId}/workers', [ClientPortalController::class, 'workers']);
    Route::get('portal/heatmap', [ClientPortalController::class, 'heatmap']);
    Route::get('portal/export', [ClientPortalController::class, 'export']);
});

// ── Inbound email webhook (no auth — verified by webhook signature) ──────────
Route::post('email/inbound', [InboundEmailController::class, 'handleInbound'])
    ->middleware('throttle:30,1');

// ── SCIM 2.0 endpoints (token-authenticated, spec-style paths) ─────────────
Route::prefix('scim/v2')
    ->middleware(['scim.token', 'throttle:120,1'])
    ->group(function () {
        Route::get('ServiceProviderConfig', [ScimController::class, 'serviceProviderConfig']);
        Route::get('Schemas', [ScimController::class, 'schemas']);
        Route::get('Schemas/{id}', [ScimController::class, 'schemaById']);
        Route::get('ResourceTypes', [ScimController::class, 'resourceTypes']);

        Route::get('Users', [ScimController::class, 'listUsers']);
        Route::post('Users', [ScimController::class, 'createUser']);
        Route::get('Users/{id}', [ScimController::class, 'showUser']);
        Route::put('Users/{id}', [ScimController::class, 'replaceUser']);
        Route::patch('Users/{id}', [ScimController::class, 'patchUser']);
        Route::delete('Users/{id}', [ScimController::class, 'deleteUser']);

        Route::get('Groups', [ScimController::class, 'listGroups']);
        Route::post('Groups', [ScimController::class, 'createGroup']);
        Route::get('Groups/{id}', [ScimController::class, 'showGroup']);
        Route::put('Groups/{id}', [ScimController::class, 'replaceGroup']);
        Route::patch('Groups/{id}', [ScimController::class, 'patchGroup']);
        Route::delete('Groups/{id}', [ScimController::class, 'deleteGroup']);
    });
