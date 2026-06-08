<?php

namespace App\Core\Http\Middleware;

use App\Services\InternalAuthService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InternalJwt
{
    public function __construct(private InternalAuthService $auth) {}

    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization');

        if (! $header || ! str_starts_with($header, 'Bearer ')) {
            return response()->json([
                'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Missing or malformed Authorization header'],
            ], 401);
        }

        $token = substr($header, 7);

        try {
            $claims = $this->auth->validateToken($token);
        } catch (\RuntimeException $e) {
            return response()->json([
                'error' => ['code' => 'UNAUTHORIZED', 'message' => $e->getMessage()],
            ], 401);
        }

        $request->merge(['internal_jwt' => $claims]);

        return $next($request);
    }
}
