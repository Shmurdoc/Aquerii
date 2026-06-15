<?php

use App\Modules\Equipment\Http\Controllers\EquipmentCertController;
use App\Modules\Equipment\Http\Controllers\EquipmentController;
use Illuminate\Support\Facades\Route;

// Categories
Route::get('equipment/categories', [EquipmentController::class, 'indexCategories']);
Route::post('equipment/categories', [EquipmentController::class, 'storeCategory'])->middleware('idempotent');
Route::get('equipment/categories/{category}', [EquipmentController::class, 'showCategory']);
Route::patch('equipment/categories/{category}', [EquipmentController::class, 'updateCategory']);
Route::delete('equipment/categories/{category}', [EquipmentController::class, 'destroyCategory']);

// Equipment CRUD
Route::get('equipment', [EquipmentController::class, 'index']);
Route::post('equipment', [EquipmentController::class, 'store'])->middleware('idempotent');
Route::get('equipment/{equipment}', [EquipmentController::class, 'show']);
Route::patch('equipment/{equipment}', [EquipmentController::class, 'update']);
Route::delete('equipment/{equipment}', [EquipmentController::class, 'destroy']);

// Inspections (nested under equipment)
Route::get('equipment/{equipment}/inspections', [EquipmentController::class, 'indexInspections']);
Route::post('equipment/{equipment}/inspections', [EquipmentController::class, 'storeInspection'])->middleware('idempotent');
Route::get('equipment/inspections/{inspection}', [EquipmentController::class, 'showInspection']);

// Breakdowns (nested under equipment)
Route::get('equipment/{equipment}/breakdowns', [EquipmentController::class, 'indexBreakdowns']);
Route::post('equipment/{equipment}/breakdowns', [EquipmentController::class, 'storeBreakdown'])->middleware('idempotent');
Route::patch('equipment/breakdowns/{breakdown}', [EquipmentController::class, 'updateBreakdown']);

// Maintenance schedules (nested under equipment)
Route::get('equipment/{equipment}/maintenance-schedules', [EquipmentController::class, 'indexSchedules']);
Route::post('equipment/{equipment}/maintenance-schedules', [EquipmentController::class, 'storeSchedule'])->middleware('idempotent');
Route::patch('equipment/maintenance-schedules/{schedule}', [EquipmentController::class, 'updateSchedule']);
Route::delete('equipment/maintenance-schedules/{schedule}', [EquipmentController::class, 'destroySchedule']);

// Certificates
Route::get('equipment/cert-types', [EquipmentCertController::class, 'certTypes']);
Route::get('equipment/summary', [EquipmentCertController::class, 'summary']);
Route::get('equipment/{equipment}/compliance', [EquipmentCertController::class, 'compliance']);
Route::get('equipment/{equipment}/certs', [EquipmentCertController::class, 'certs']);
Route::post('equipment/{equipment}/certs', [EquipmentCertController::class, 'createCert'])->middleware('idempotent');
Route::put('equipment/{equipment}/certs/{certId}/verify', [EquipmentCertController::class, 'verifyCert']);
