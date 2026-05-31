<?php

use App\Modules\JobCards\Http\Controllers\JobCardController;
use Illuminate\Support\Facades\Route;

Route::get('job-cards/templates', [JobCardController::class, 'templates']);
Route::post('job-cards/templates', [JobCardController::class, 'storeTemplate']);
Route::post('job-cards/{job_card}/sign-off', [JobCardController::class, 'signOff'])->middleware('idempotent');
Route::post('job-cards/{job_card}/reject', [JobCardController::class, 'reject'])->middleware('idempotent');

// Attachments / Photo capture (JOB-09)
Route::post('job-cards/{job_card}/attachments', [JobCardController::class, 'uploadAttachment']);
Route::delete('job-cards/{job_card}/attachments/{attachment}', [JobCardController::class, 'deleteAttachment']);

// Task / Checklist management (JOB-12)
Route::post('job-cards/{job_card}/tasks', [JobCardController::class, 'addTask']);
Route::patch('job-cards/{job_card}/tasks/{task}', [JobCardController::class, 'updateTask']);
Route::delete('job-cards/{job_card}/tasks/{task}', [JobCardController::class, 'deleteTask']);

// Materials tracking (JOB-10)
Route::get('job-cards/{job_card}/materials', [JobCardController::class, 'materials']);
Route::post('job-cards/{job_card}/materials', [JobCardController::class, 'addMaterial']);
Route::delete('job-cards/{job_card}/materials/{material}', [JobCardController::class, 'deleteMaterial']);

// Labour / Time tracking (JOB-11)
Route::post('job-cards/{job_card}/timer/start', [JobCardController::class, 'startTimer']);
Route::post('job-cards/{job_card}/timer/stop', [JobCardController::class, 'stopTimer']);
Route::get('job-cards/{job_card}/time-entries', [JobCardController::class, 'timeEntries']);

Route::apiResource('job-cards', JobCardController::class)->middleware('idempotent');
