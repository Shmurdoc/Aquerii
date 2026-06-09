<?php

namespace App\Core\Http\Middleware;

use App\Core\Models\ScimToken;
use Closure;
use Illuminate\Http\Request;

class AuthenticateScimToken
{
    public function handle(Request $request, Closure $next)
    {
        $auth = (string) $request->header('Authorization', '');
        if (! str_starts_with($auth, 'Bearer ')) {
            return response()->json([
                'schemas' => ['urn:ietf:params:scim:api:messages:2.0:Error'],
                'status' => '401',
                'detail' => 'Missing bearer token.',
            ], 401);
        }

        $rawToken = trim(substr($auth, 7));
        $token = ScimToken::verify($rawToken);

        if (! $token || ! $token->is_active) {
            return response()->json([
                'schemas' => ['urn:ietf:params:scim:api:messages:2.0:Error'],
                'status' => '401',
                'detail' => 'Invalid or revoked SCIM token.',
            ], 401);
        }

        $request->attributes->set('scim_token', $token);
        $request->attributes->set('scim_workspace_id', $token->workspace_id);

        return $next($request);
    }
}
