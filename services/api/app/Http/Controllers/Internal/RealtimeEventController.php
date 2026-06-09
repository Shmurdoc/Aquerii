<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Models\RealtimeEvent;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RealtimeEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room'          => 'required|string',
            'from_sequence' => 'required|integer|min:0',
        ]);

        $events = RealtimeEvent::where('room', $validated['room'])
            ->where('sequence', '>', $validated['from_sequence'])
            ->orderBy('sequence')
            ->limit(500)
            ->get(['event_type', 'payload', 'sequence', 'published_at']);

        return response()->json(['events' => $events]);
    }
}
