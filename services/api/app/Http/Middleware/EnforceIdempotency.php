<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Idempotency-Key middleware.
 *
 * For POST/PUT/PATCH/DELETE requests that include an Idempotency-Key header:
 *  1. Check Redis for a cached response — return it immediately if found.
 *  2. Otherwise, lock the key, process the request, store the response.
 *
 * Key format:  idempotency:{user_id}:{idempotency_key}
 * TTL:         24 hours
 * Conflict:    Same key + different payload hash → 409
 */
class EnforceIdempotency
{
    private const TTL = 86400; // 24 hours

    public function handle(Request $request, Closure $next): Response
    {
        if (!in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            return $next($request);
        }

        $idempotencyKey = $request->header('Idempotency-Key');
        if (!$idempotencyKey) {
            return response()->json([
                'error' => [
                    'code'    => 'MISSING_IDEMPOTENCY_KEY',
                    'message' => 'Idempotency-Key header is required for mutating requests.',
                ],
            ], 400);
        }

        $user = $request->user();
        if (!$user) {
            return $next($request);
        }

        $cacheKey    = "idempotency:{$user->id}:{$idempotencyKey}";
        $payloadHash = hash('sha256', $request->getContent());

        $cached = Cache::get($cacheKey);

        if ($cached) {
            if ($cached['payload_hash'] !== $payloadHash) {
                return response()->json([
                    'error' => [
                        'code'    => 'IDEMPOTENCY_CONFLICT',
                        'message' => 'Idempotency-Key reused with a different request body.',
                    ],
                ], 409);
            }

            return response()->json(
                $cached['response'],
                $cached['status_code'],
                ['X-Idempotent-Replayed' => 'true']
            );
        }

        // Acquire a distributed lock so concurrent identical requests don't race
        $lock = Cache::lock("idempotency_lock:{$cacheKey}", 30);

        if (!$lock->get()) {
            return response()->json([
                'error' => [
                    'code'    => 'PROCESSING',
                    'message' => 'Request is still being processed. Please retry.',
                ],
            ], 409);
        }

        try {
            $response = $next($request);

            $statusCode = $response->getStatusCode();

            // Only cache successful or known-idempotent responses
            if ($statusCode < 500) {
                $body = json_decode($response->getContent(), true) ?? [];

                Cache::put($cacheKey, [
                    'payload_hash' => $payloadHash,
                    'response'     => $body,
                    'status_code'  => $statusCode,
                ], self::TTL);

                // Persist to DB for audit / cross-instance consistency
                DB::table('idempotency_keys')->upsert([
                    'user_id'      => $user->id,
                    'key'          => $idempotencyKey,
                    'payload_hash' => $payloadHash,
                    'response'     => json_encode($body),
                    'status_code'  => $statusCode,
                    'expires_at'   => now()->addSeconds(self::TTL),
                ], ['user_id', 'key'], ['response', 'status_code', 'expires_at']);
            }

            return $response;
        } finally {
            $lock->release();
        }
    }
}
