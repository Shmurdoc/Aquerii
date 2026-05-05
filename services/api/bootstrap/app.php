<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\SetWorkspaceTenant;
use App\Http\Middleware\EnforceIdempotency;
use App\Http\Middleware\ThrottleRequests;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [
            SetWorkspaceTenant::class,
        ]);

        $middleware->alias([
            'idempotent'    => EnforceIdempotency::class,
            'throttle'      => ThrottleRequests::class,
            'workspace'     => SetWorkspaceTenant::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            if ($request->expectsJson()) {
                return App\Exceptions\Handler::renderJson($e, $request);
            }
        });
    })
    ->create();
