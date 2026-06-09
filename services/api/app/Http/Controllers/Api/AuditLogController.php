<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * GET /workspaces/{workspace}/audit-logs
     */
    public function index(Request $request, string $workspace): JsonResponse
    {
        $query = AuditLog::query()->where('workspace_id', $workspace);

        if ($request->filled('action')) {
            $query->where('action', 'ilike', '%'.trim((string) $request->query('action')).'%');
        }

        if ($request->filled('resource_type')) {
            $query->where('resource_type', (string) $request->query('resource_type'));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', (string) $request->query('user_id'));
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', (string) $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', (string) $request->query('to'));
        }

        $logs = $query
            ->orderByDesc('created_at')
            ->paginate(min(200, max(1, (int) $request->query('per_page', 50))));

        return response()->json([
            'data' => $logs->items(),
            'meta' => [
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
            ],
        ]);
    }
}
