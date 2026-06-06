<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    // GET /workspaces/{workspace}/notifications
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(100, $perPage));

        $page = DB::table('notifications')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $page->items(),
            'current_page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
        ]);
    }

    // PATCH /workspaces/{workspace}/notifications/{notification}/read
    public function markRead(Request $request, Workspace $workspace, string $notifId): JsonResponse
    {
        DB::table('notifications')
            ->where('id', $notifId)
            ->where('user_id', $request->user()->id)
            ->update(['read_at' => now()]);

        return response()->json(['data' => ['read' => true]]);
    }

    // PATCH /workspaces/{workspace}/notifications/read-all
    public function markAllRead(Request $request, Workspace $workspace): JsonResponse
    {
        DB::table('notifications')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['data' => ['read' => true]]);
    }
}
