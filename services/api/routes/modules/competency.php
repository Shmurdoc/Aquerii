<?php

use App\Modules\Competency\Http\Controllers\CompetencyController;
use Illuminate\Support\Facades\Route;

// Competency Types
Route::get('competency/types', [CompetencyController::class, 'indexTypes']);
Route::post('competency/types', [CompetencyController::class, 'storeType'])->middleware('idempotent');
Route::get('competency/types/{type}', [CompetencyController::class, 'showType']);
Route::patch('competency/types/{type}', [CompetencyController::class, 'updateType']);
Route::delete('competency/types/{type}', [CompetencyController::class, 'destroyType']);

// Competency Records (user-to-competency mapping)
Route::get('competency/records', [CompetencyController::class, 'indexRecords']);
Route::post('competency/records', [CompetencyController::class, 'storeRecord'])->middleware('idempotent');
Route::get('competency/records/{record}', [CompetencyController::class, 'showRecord']);
Route::patch('competency/records/{record}', [CompetencyController::class, 'updateRecord']);
Route::delete('competency/records/{record}', [CompetencyController::class, 'destroyRecord']);

// COF Records (Certificate of Fitness)
Route::get('competency/cofs', [CompetencyController::class, 'indexCofs']);
Route::post('competency/cofs', [CompetencyController::class, 'storeCof'])->middleware('idempotent');
Route::get('competency/cofs/{cof}', [CompetencyController::class, 'showCof']);
Route::patch('competency/cofs/{cof}', [CompetencyController::class, 'updateCof']);
Route::delete('competency/cofs/{cof}', [CompetencyController::class, 'destroyCof']);

// Competency Requirements (polymorphic — attach to equipment categories, roles, etc.)
Route::get('competency/requirements', [CompetencyController::class, 'indexRequirements']);
Route::post('competency/requirements', [CompetencyController::class, 'storeRequirement'])->middleware('idempotent');
Route::get('competency/requirements/{requirement}', [CompetencyController::class, 'showRequirement']);
Route::patch('competency/requirements/{requirement}', [CompetencyController::class, 'updateRequirement']);
Route::delete('competency/requirements/{requirement}', [CompetencyController::class, 'destroyRequirement']);

// Training Records
Route::get('competency/training', [CompetencyController::class, 'indexTraining']);
Route::post('competency/training', [CompetencyController::class, 'storeTraining'])->middleware('idempotent');
Route::get('competency/training/{training}', [CompetencyController::class, 'showTraining']);
Route::patch('competency/training/{training}', [CompetencyController::class, 'updateTraining']);
Route::delete('competency/training/{training}', [CompetencyController::class, 'destroyTraining']);

// Dashboard / Stats
Route::get('competency/stats', [CompetencyController::class, 'stats']);
