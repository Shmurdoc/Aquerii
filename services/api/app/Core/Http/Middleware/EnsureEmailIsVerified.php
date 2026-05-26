<?php

namespace App\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && is_null($user->email_verified_at)) {
            return response()->json([
                'error' => ['code' => 'EMAIL_NOT_VERIFIED', 'message' => 'Email address is not verified.'],
            ], 403);
        }

        return $next($request);
    }
}
