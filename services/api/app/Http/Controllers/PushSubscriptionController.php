<?php

namespace App\Http\Controllers;

use App\Core\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    /**
     * List the current user's active push subscriptions. The p256dh/auth
     * keys are hidden by the model `$hidden` array — we only return the
     * id, endpoint, user_agent, and last_seen_at.
     */
    public function index(Request $request): JsonResponse
    {
        $subscriptions = PushSubscription::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $subscriptions]);
    }

    /**
     * Register (or refresh) a push subscription for the current user.
     *
     * The browser may re-subscribe on every service-worker boot, which would
     * otherwise produce duplicates. The UNIQUE(endpoint) constraint + the
     * updateOrCreate here collapses re-subscribes onto the existing row.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'string', 'max:2048'],
            'keys.p256dh' => ['required', 'string'],
            'keys.auth' => ['required', 'string'],
            'user_agent' => ['sometimes', 'nullable', 'string', 'max:512'],
        ]);

        $subscription = PushSubscription::updateOrCreate(
            ['endpoint' => $validated['endpoint']],
            [
                'user_id' => $request->user()->id,
                'p256dh_key' => $validated['keys']['p256dh'],
                'auth_key' => $validated['keys']['auth'],
                'user_agent' => $validated['user_agent'] ?? $request->userAgent(),
                'last_seen_at' => now(),
            ],
        );

        return response()->json(['data' => $subscription], 201);
    }

    /**
     * Unregister a push subscription. Scoped to the current user so a caller
     * can never delete another user's subscription by guessing IDs.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $deleted = PushSubscription::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        abort_if($deleted === 0, 404, 'Push subscription not found.');

        return response()->json(null, 204);
    }
}
