<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    // GET /workspaces/{workspace}/notifications
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $notifications = DB::table('notifications')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json(['data' => $notifications]);
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
