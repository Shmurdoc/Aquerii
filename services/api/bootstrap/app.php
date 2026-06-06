<?php

use App\Core\Exceptions\Handler;
use App\Core\Http\Middleware\AuthenticateScimToken;
use App\Core\Http\Middleware\CheckFeatureAccess;
use App\Core\Http\Middleware\EnforceIdempotency;
use App\Core\Http\Middleware\EnsureEmailIsVerified;
use App\Core\Http\Middleware\InternalSecret;
use App\Core\Http\Middleware\RequireOwner;
use App\Core\Http\Middleware\RequireWorkspaceRole;
use App\Core\Http\Middleware\SecureHeaders;
use App\Core\Http\Middleware\SetWorkspaceTenant;
use App\Core\Http\Middleware\ThrottleRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->prepend(SecureHeaders::class);

        $middleware->alias([
            'idempotent' => EnforceIdempotency::class,
            'throttle' => ThrottleRequests::class,
            'workspace' => SetWorkspaceTenant::class,
            'internal.secret' => InternalSecret::class,
            'verified' => EnsureEmailIsVerified::class,
            'workspace.role' => RequireWorkspaceRole::class,
            'workspace.owner' => RequireOwner::class,
            'feature' => CheckFeatureAccess::class,
            'scim.token' => AuthenticateScimToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e) {
            return $request->is('api/*') || $request->expectsJson();
        });
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return Handler::renderJson($e, $request);
            }
        });
    })
    ->create();
