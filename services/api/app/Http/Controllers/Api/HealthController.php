<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'status' => 'ok',
            'service' => 'api',
            'timestamp' => now()->toIso8601String(),
        ];

        try {
            DB::connection()->select('SELECT 1');
            $checks['database'] = ['status' => 'ok', 'message' => 'PostgreSQL connection successful'];
        } catch (\Throwable $e) {
            $checks['database'] = ['status' => 'error', 'message' => $e->getMessage()];
            $checks['status'] = 'degraded';
        }

        try {
            Cache::store('redis')->set('health:ping', true, 10);
            Cache::store('redis')->get('health:ping');
            $checks['redis'] = ['status' => 'ok', 'message' => 'Redis connection successful'];
        } catch (\Throwable $e) {
            $checks['redis'] = ['status' => 'error', 'message' => $e->getMessage()];
            $checks['status'] = 'degraded';
        }

        $httpCode = $checks['status'] === 'ok' ? 200 : 503;

        return response()->json($checks, $httpCode);
    }
}
