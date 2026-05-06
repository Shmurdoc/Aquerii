<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    protected $dontFlash = ['current_password', 'password', 'password_confirmation'];

    public function register(): void
    {
        $this->renderable(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return self::renderJson($e, $request);
            }
        });
    }

    public static function renderJson(Throwable $e, Request $request): JsonResponse
    {
        if ($e instanceof ValidationException) {
            return response()->json([
                'error' => [
                    'code'    => 'VALIDATION_ERROR',
                    'message' => 'The given data was invalid.',
                    'details' => $e->errors(),
                ],
            ], 422);
        }

        if ($e instanceof AuthenticationException) {
            return response()->json([
                'error' => ['code' => 'UNAUTHENTICATED', 'message' => 'Unauthenticated.'],
            ], 401);
        }

        if ($e instanceof ModelNotFoundException) {
            $model = class_basename($e->getModel());
            return response()->json([
                'error' => ['code' => 'NOT_FOUND', 'message' => "{$model} not found."],
            ], 404);
        }

        if ($e instanceof HttpException) {
            // AuthService abort()s with a JSON string as the message — decode it
            $raw     = $e->getMessage();
            $decoded = $raw ? json_decode($raw, true) : null;

            if (is_array($decoded) && isset($decoded['error'])) {
                return response()->json($decoded, $e->getStatusCode());
            }

            return response()->json([
                'error' => ['code' => 'HTTP_ERROR', 'message' => $raw ?: Response::$statusTexts[$e->getStatusCode()] ?? 'HTTP error.'],
            ], $e->getStatusCode());
        }

        $statusCode = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
        $message    = config('app.debug') ? $e->getMessage() : 'An unexpected error occurred.';

        return response()->json([
            'error' => ['code' => 'INTERNAL_ERROR', 'message' => $message],
        ], $statusCode);
    }
}
