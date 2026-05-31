<?php

use App\Modules\AI\Http\Controllers\AIController;
use Illuminate\Support\Facades\Route;

Route::prefix('ai')->middleware('idempotent')->group(function () {
    Route::post('chat', [AIController::class, 'chat']);
    Route::post('summarize', [AIController::class, 'summarize']);
    Route::post('score-deal', [AIController::class, 'scoreDeal']);
    Route::get('credits', [AIController::class, 'credits']);
    Route::post('task/generate-description', [AIController::class, 'generateTaskDescription']);
    Route::post('document/generate', [AIController::class, 'generateDocument']);
    Route::post('automation/generate', [AIController::class, 'generateAutomation']);
    Route::post('flowchart/generate', [AIController::class, 'generateFlowchart']);
    Route::post('document/analyze', [AIController::class, 'analyzeDocument']);
    Route::post('document/auto-tag', [AIController::class, 'autoTagDocument']);
    Route::post('document/link-deal', [AIController::class, 'linkDocumentToDeal']);

    // Predictions (rule-based)
    Route::post('predictions/task-duration', [AIController::class, 'predictTaskDuration']);
    Route::post('predictions/delay-risk', [AIController::class, 'predictDelayRisk']);
    Route::post('predictions/okr-progress', [AIController::class, 'predictOKRProgress']);
});
