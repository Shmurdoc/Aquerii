<?php

use App\Modules\Support\Http\Controllers\KnowledgeBaseController;
use App\Modules\Support\Http\Controllers\SlaController;
use App\Modules\Support\Http\Controllers\TicketController;
use App\Modules\Support\Http\Controllers\TicketMessageController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'throttle:60,1'])
    ->prefix('workspaces/{workspace}')
    ->middleware('workspace')
    ->group(function () {

        // Tickets
        Route::apiResource('support/tickets', TicketController::class)->middleware('idempotent');
        Route::post('support/tickets/{ticket}/assign', [TicketController::class, 'assign'])->middleware('idempotent');

        // Ticket Messages
        Route::get('support/tickets/{ticket}/messages', [TicketMessageController::class, 'index']);
        Route::post('support/tickets/{ticket}/messages', [TicketMessageController::class, 'store'])->middleware('idempotent');
        Route::delete('support/tickets/{ticket}/messages/{message}', [TicketMessageController::class, 'destroy'])->middleware('idempotent');

        // SLA Policies
        Route::apiResource('support/slas', SlaController::class)->middleware('idempotent');
        Route::get('support/slas/breaches', [SlaController::class, 'breaches']);
        Route::get('support/slas/compliance', [SlaController::class, 'compliance']);

        // Knowledge Base
        Route::apiResource('support/knowledge-base', KnowledgeBaseController::class)->middleware('idempotent');
        Route::post('support/knowledge-base/{article}/vote', [KnowledgeBaseController::class, 'vote'])->middleware('idempotent');
    });
