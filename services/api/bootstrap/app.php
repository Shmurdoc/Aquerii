<?php

use App\Exceptions\Handler;
use App\Http\Middleware\EnforceIdempotency;
use App\Http\Middleware\InternalSecret;
use App\Http\Middleware\SetWorkspaceTenant;
use App\Http\Middleware\ThrottleRequests;
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
        $middleware->alias([
            'idempotent' => EnforceIdempotency::class,
            'throttle' => ThrottleRequests::class,
            'workspace' => SetWorkspaceTenant::class,
            'internal.secret' => InternalSecret::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Always return JSON for API requests, never redirect
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
