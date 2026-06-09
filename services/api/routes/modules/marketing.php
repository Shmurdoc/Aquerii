<?php

use App\Modules\Marketing\Http\Controllers\CampaignController;
use App\Modules\Marketing\Http\Controllers\EmailTemplateController;
use App\Modules\Marketing\Http\Controllers\SegmentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'throttle:60,1'])
    ->prefix('workspaces/{workspace}')
    ->middleware('workspace')
    ->group(function () {

        // Campaigns
        Route::apiResource('marketing/campaigns', CampaignController::class)->middleware('idempotent');
        Route::post('marketing/campaigns/{campaign}/launch', [CampaignController::class, 'launch'])->middleware('idempotent');
        Route::get('marketing/campaigns/{campaign}/stats', [CampaignController::class, 'stats']);

        // Email Templates
        Route::apiResource('marketing/email-templates', EmailTemplateController::class)->middleware('idempotent');

        // Segments
        Route::apiResource('marketing/segments', SegmentController::class)->middleware('idempotent');
        Route::get('marketing/segments/{segment}/count', [SegmentController::class, 'count']);
        Route::get('marketing/segments/{segment}/preview', [SegmentController::class, 'preview']);
    });
