<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    protected $dontReport = [];

    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            // Send to OTel / Sentry here if configured
        });
    }

    public static function renderJson(Throwable $e, Request $request): JsonResponse
    {
        if ($e instanceof ValidationException) {
            return response()->json([
                'error' => [
                    'code'    => 'VALIDATION_ERROR',
                    'message' => 'The given data was invalid.',
                    'errors'  => $e->errors(),
                ],
            ], 422);
        }

        if ($e instanceof ModelNotFoundException) {
            return response()->json([
                'error' => [
                    'code'    => 'NOT_FOUND',
                    'message' => 'Resource not found.',
                ],
            ], 404);
        }

        if ($e instanceof AuthenticationException) {
            return response()->json([
                'error' => [
                    'code'    => 'UNAUTHENTICATED',
                    'message' => 'Authentication required.',
                ],
            ], 401);
        }

        if ($e instanceof HttpException) {
            $body = $e->getMessage();
            $decoded = json_decode($body, true);
            if ($decoded && isset($decoded['error'])) {
                return response()->json($decoded, $e->getStatusCode());
            }
            return response()->json([
                'error' => [
                    'code'    => 'HTTP_ERROR',
                    'message' => $body ?: 'An error occurred.',
                ],
            ], $e->getStatusCode());
        }

        $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;

        return response()->json([
            'error' => [
                'code'    => 'INTERNAL_ERROR',
                'message' => app()->isProduction() ? 'An internal error occurred.' : $e->getMessage(),
            ],
        ], $status);
    }
}
