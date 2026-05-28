<?php

use App\Core\Http\Controllers\Api\BillingController;
use App\Core\Http\Controllers\Api\BrandingController;
use App\Core\Http\Controllers\Api\BulkActionController;
use App\Core\Http\Controllers\Api\CommentController;
use App\Core\Http\Controllers\Api\DocumentPdfController;
use App\Core\Http\Controllers\Api\EmployeeGroupController;
use App\Core\Http\Controllers\Api\FileController;
use App\Core\Http\Controllers\Api\InvoicePdfController;
use App\Core\Http\Controllers\Api\InvoiceWorkflowController;
use App\Core\Http\Controllers\Api\NotificationController;
use App\Core\Http\Controllers\Api\WebhookController;
use App\Core\Http\Controllers\Api\WorkspaceController;
use App\Core\Http\Controllers\Api\WorkspaceLogoController;
use App\Core\Http\Controllers\Auth\AuthController;
use App\Core\Http\Controllers\Auth\OAuthController;
use App\Core\Http\Controllers\BoardColumnController;
use App\Core\Http\Controllers\BoardController;
use App\Core\Http\Controllers\BoardGroupController;
use App\Core\Http\Controllers\ItemController;
use App\Core\Http\Controllers\UserController;
use App\Http\Controllers\Api\WorkspaceInvitationController;
use App\Modules\AI\Http\Controllers\AIController;
use App\Modules\Automation\Http\Controllers\AutomationController;
use App\Modules\CRM\Http\Controllers\CalendarSyncController;
use App\Modules\CRM\Http\Controllers\CallLogController;
use App\Modules\CRM\Http\Controllers\CompanyController;
use App\Modules\CRM\Http\Controllers\ConsentController;
use App\Modules\CRM\Http\Controllers\ContactController;
use App\Modules\CRM\Http\Controllers\ContactImportController;
use App\Modules\CRM\Http\Controllers\CrmActivityController;
use App\Modules\CRM\Http\Controllers\CrmAnalyticsController;
use App\Modules\CRM\Http\Controllers\CrmAutomationRuleController;
use App\Modules\CRM\Http\Controllers\CrmReportController;
use App\Modules\CRM\Http\Controllers\DealApprovalController;
use App\Modules\CRM\Http\Controllers\DealController;
use App\Modules\CRM\Http\Controllers\ForecastController;
use App\Modules\CRM\Http\Controllers\LeadController;
use App\Modules\CRM\Http\Controllers\PipelineController;
use App\Modules\CRM\Http\Controllers\ProductController;
use App\Modules\CRM\Http\Controllers\QuotaController;
use App\Modules\CRM\Http\Controllers\QuoteController;
use App\Modules\CRM\Http\Controllers\SequenceController;
use App\Modules\CRM\Http\Controllers\StageController;
use Illuminate\Support\Facades\Route;

// ── Health check (public) ─────────────────────────────────────────────────────
Route::get('healthz', fn () => response()->json(['status' => 'ok', 'service' => 'api']));
Route::get('health', fn () => response()->json(['status' => 'ok', 'service' => 'api']));

// ── Branding (public — used by login page to load workspace theme) ────────────
Route::get('branding', [BrandingController::class, 'show']);

// ── Public auth ───────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    $isTest = app()->environment('testing');

    Route::post('register', [AuthController::class, 'register'])->middleware($isTest ? ['idempotent'] : ['throttle:10,1', 'idempotent']);
    Route::post('login', [AuthController::class, 'login'])->middleware($isTest ? [] : ['throttle:5,1']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware($isTest ? [] : ['throttle:3,1']);
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware($isTest ? ['idempotent'] : ['throttle:5,1', 'idempotent']);
    Route::post('refresh', [AuthController::class, 'refresh'])->middleware($isTest ? [] : ['throttle:10,1']);
    Route::post('verify-email/resend', [AuthController::class, 'resendVerification']);
    Route::post('verify-email/{id}/{hash}', [AuthController::class, 'verifyEmail'])->name('verification.verify');
    Route::get('oauth/{provider}', [OAuthController::class, 'redirect']);
    Route::get('oauth/{provider}/callback', [OAuthController::class, 'callback']);
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
    Route::post('auth/mfa/disable', [AuthController::class, 'disableMfa']);

    // Current user
    Route::get('me', [UserController::class, 'me']);
    Route::put('me', [UserController::class, 'update'])->middleware('idempotent');
    Route::get('me/notifications', [NotificationController::class, 'index']);
    Route::patch('me/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('me/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // Workspace creation
    Route::post('workspaces', [WorkspaceController::class, 'store'])->middleware('idempotent');

    // All workspace-scoped routes
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {

        Route::get('', [WorkspaceController::class, 'show']);
        Route::patch('', [WorkspaceController::class, 'update'])->middleware('idempotent');

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

        // Billing
        Route::prefix('billing')->group(function () {
            Route::get('', [BillingController::class, 'show']);
            Route::post('checkout', [BillingController::class, 'createCheckout'])->middleware('idempotent');
            Route::post('portal', [BillingController::class, 'createPortal']);
            Route::delete('subscription', [BillingController::class, 'cancelSubscription'])->middleware('idempotent');
            Route::post('payfast/checkout', [BillingController::class, 'payfastCheckout'])->middleware('idempotent');
        });

        // Boards
        Route::apiResource('boards', BoardController::class)->except(['index'])->middleware('idempotent');
        Route::get('boards', [BoardController::class, 'index']);

        // My Day — aggregate view across all boards
        Route::get('my-day', [ItemController::class, 'myDay']);

        Route::prefix('boards/{board}')->group(function () {
            Route::apiResource('columns', BoardColumnController::class)->middleware('idempotent');
            Route::apiResource('groups', BoardGroupController::class)->middleware('idempotent');
            Route::apiResource('items', ItemController::class)->middleware('idempotent');

            Route::get('items/{item}/activity', [ItemController::class, 'activity']);
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
        Route::apiResource('crm/products', ProductController::class)->middleware('idempotent');

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

        // Automations (gated by plan)
        Route::middleware('feature:module.automation')->group(function () {
            Route::get('automation-templates', [AutomationController::class, 'templates']);
            Route::apiResource('automations', AutomationController::class)->middleware('idempotent');
            Route::get('automations/{automation}/runs', [AutomationController::class, 'runs']);
        });

        // AI (workspace-scoped, gated by plan)
        Route::prefix('ai')->middleware(['feature:module.ai', 'idempotent', 'throttle:60,1'])->group(function () {
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
            Route::post('anomaly-detection', [AIController::class, 'anomalyDetection']);
        });

        // ── ERP: Invoicing, Sales, Purchasing, Inventory, Accounting ──
        Route::middleware('feature:module.erp')->group(function () {
            Route::get('invoices/{invoice}/pdf', [InvoicePdfController::class, 'show']);
            Route::get('invoices/{invoice}/payments', [InvoiceWorkflowController::class, 'listPayments']);
            Route::post('invoices/{invoice}/payments', [InvoiceWorkflowController::class, 'recordPayment'])->middleware('idempotent');
            Route::patch('invoices/{invoice}/status', [InvoiceWorkflowController::class, 'updateStatus'])->middleware('idempotent');
            Route::post('sales/orders/{so}/convert-to-invoice', [InvoiceWorkflowController::class, 'convertToInvoice'])->middleware('idempotent');

            Route::prefix('documents')->group(function () {
                Route::get('quotes/{id}/pdf', [DocumentPdfController::class, 'quote']);
                Route::get('sales-orders/{id}/pdf', [DocumentPdfController::class, 'salesOrder']);
                Route::get('purchase-orders/{id}/pdf', [DocumentPdfController::class, 'purchaseOrder']);
                Route::get('goods-receipts/{id}/pdf', [DocumentPdfController::class, 'goodsReceipt']);
                Route::get('receipts/{id}/pdf', [DocumentPdfController::class, 'receipt']);
                Route::get('credit-notes/{id}/pdf', [DocumentPdfController::class, 'creditNote']);
            });

            // Offline sync
            Route::get('sync/conflicts', [\App\Core\Http\Controllers\Api\OfflineSyncController::class, 'conflicts']);
            Route::patch('sync/conflicts/{conflict}', [\App\Core\Http\Controllers\Api\OfflineSyncController::class, 'resolve'])->middleware('idempotent');
            Route::post('sync/conflicts/resolve-all', [\App\Core\Http\Controllers\Api\OfflineSyncController::class, 'resolveAll'])->middleware('idempotent');
        });
    });
});
