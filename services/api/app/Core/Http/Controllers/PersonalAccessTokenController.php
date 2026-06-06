<?php

namespace App\Core\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonalAccessTokenController extends Controller
{
    /**
     * List the current user's personal access tokens. We deliberately
     * return only the safe fields (id, name, abilities, last_used_at,
     * created_at) — the hashed `token` value stays hidden by Sanctum's
     * model $hidden, and the plaintext value was only ever available
     * at creation time, never persisted.
     */
    public function index(Request $request): JsonResponse
    {
        $tokens = $request->user()->tokens()
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $tokens]);
    }

    /**
     * Create a new personal access token for the current user. Sanctum
     * returns a NewAccessToken wrapping the persisted model (whose hash
     * is the only thing stored) and the plaintext string. The plaintext
     * is surfaced exactly once, in `data.plain_text` — after this
     * response the only thing the server holds is the hash, so it
     * cannot be retrieved again by design.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'abilities' => ['sometimes', 'array'],
            'abilities.*' => ['string'],
            'expires_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $abilities = $validated['abilities'] ?? ['*'];

        $newToken = $request->user()->createToken(
            $validated['name'],
            $abilities,
            $validated['expires_at'] ?? null ? \Carbon\Carbon::parse($validated['expires_at']) : null,
        );

        return response()->json([
            'data' => [
                'token' => $newToken->accessToken,
                'plain_text' => $newToken->plainTextToken,
            ],
        ], 201);
    }

    /**
     * Revoke one of the current user's tokens. We scope the delete to
     * the caller's `tokens()` relation so an authenticated user can
     * never revoke someone else's token by guessing an ID. No
     * plaintext is required — the user already authenticated via
     * Sanctum and the ID is enough to identify the row.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $deleted = $request->user()->tokens()->where('id', $id)->delete();

        abort_if($deleted === 0, 404, 'Personal access token not found.');

        return response()->json(null, 204);
    }
}
