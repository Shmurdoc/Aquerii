<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InternalSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = $request->header('X-Internal-Secret');
        if (!$secret || $secret !== config('services.realtime.secret')) {
            // Also check AI service secret
            if ($secret !== config('services.ai.secret')) {
                return response()->json(['error' => ['code' => 'FORBIDDEN', 'message' => 'Forbidden']], 403);
            }
        }
        return $next($request);
    }
}
