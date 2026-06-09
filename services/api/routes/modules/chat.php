<?php

use App\Modules\Chat\Http\Controllers\ChatController;
use Illuminate\Support\Facades\Route;

// Channels
Route::get('chat/channels', [ChatController::class, 'indexChannels']);
Route::post('chat/channels', [ChatController::class, 'storeChannel'])->middleware('idempotent');
Route::get('chat/channels/{channel}', [ChatController::class, 'showChannel']);

// Messages
Route::get('chat/channels/{channel}/messages', [ChatController::class, 'indexMessages']);
Route::post('chat/channels/{channel}/messages', [ChatController::class, 'storeMessage'])->middleware('idempotent');
Route::post('chat/channels/{channel}/read', [ChatController::class, 'markRead'])->middleware('idempotent');
