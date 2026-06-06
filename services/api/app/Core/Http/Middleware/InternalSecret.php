<?php

namespace App\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class InternalSecret
{
    protected array $routeScopes = [
        'api/internal/realtime/*' => ['realtime'],
        'api/internal/documents/*' => ['realtime'],
        'api/internal/ai/*' => ['ai'],
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $secret = $request->header('X-Internal-Secret');
        if (! $secret || $secret !== config('services.realtime.secret')) {
            if ($secret !== config('services.ai.secret')) {
                return response()->json(['error' => ['code' => 'FORBIDDEN', 'message' => 'Forbidden']], 403);
            }
        }

        $serviceName = $request->header('X-Service-Name');
        if ($serviceName) {
            $path = $request->path();
            $allowed = false;
            foreach ($this->routeScopes as $pattern => $scopes) {
                if (Str::is($pattern, $path) && in_array($serviceName, $scopes, true)) {
                    $allowed = true;
                    break;
                }
            }
            if (! $allowed) {
                return response()->json(['error' => ['code' => 'FORBIDDEN', 'message' => 'Service not authorized for this route']], 403);
            }
        }

        return $next($request);
    }
}
