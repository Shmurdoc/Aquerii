<?php

use App\Http\Controllers\Api\MeetingController;
use Illuminate\Support\Facades\Route;

Route::get('meetings', [MeetingController::class, 'index']);
Route::post('meetings', [MeetingController::class, 'store'])->middleware('idempotent');
Route::get('meetings/{meetingId}', [MeetingController::class, 'show']);
Route::patch('meetings/{meetingId}', [MeetingController::class, 'update'])->middleware('idempotent');
Route::delete('meetings/{meetingId}', [MeetingController::class, 'destroy'])->middleware('idempotent');
Route::patch('meetings/{meetingId}/attendance', [MeetingController::class, 'updateAttendance'])->middleware('idempotent');
