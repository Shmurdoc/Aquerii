<?php

namespace App\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts access to users with one of the allowed account_type tiers.
 *
 * This is the *platform-tier* gate — distinct from RequireOwner, which
 * checks the user's role *within a workspace*. account_type is a property
 * of the user globally, not of a workspace membership.
 *
 * Valid account_type values (enforced by CHECK constraint on users):
 *   - superadmin_creator : founders / product owners (highest)
 *   - platform_admin     : Aquerii staff with back-office access
 *   - subscriber         : paying customer
 *   - employee           : default for non-customer accounts
 *
 * Usage in routes:
 *   Route::middleware(['auth:sanctum', 'require.account_type:superadmin_creator,platform_admin'])
 *       ->group(...)
 *
 * Returns 403 if the authenticated user's account_type is not in the
 * allowed list. Returns 401 via auth:sanctum if unauthenticated.
 */
class RequireAccountType
{
    public function handle(Request $request, Closure $next, string ...$allowed): Response
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        abort_unless(
            in_array($user->account_type, $allowed, true),
            403,
            'Account type not permitted for this action.'
        );

        return $next($request);
    }
}
