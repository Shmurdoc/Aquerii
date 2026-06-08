<?php

namespace App\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class GateKioskAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::guard('gate-kiosk')->check()) {
            return response()->json(['message' => 'Invalid or missing kiosk API key.'], 401);
        }

        return $next($request);
    }
}
