<?php

namespace App\Http\Controllers\Api;

use App\Core\Models\Workspace;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StorageController extends Controller
{
    public function show(Request $request, Workspace $workspace): JsonResponse
    {
        $workspace->load('usage');

        $workspaceId = $workspace->id;
        $quotaBytes = $workspace->storage_quota_bytes ?? 5368709120;

        $files = DB::table('files')
            ->where('workspace_id', $workspaceId)
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as bytes, MAX(created_at) as last_activity')
            ->first();

        $avatars = DB::table('users')
            ->join('workspace_members', 'users.id', '=', 'workspace_members.user_id')
            ->where('workspace_members.workspace_id', $workspaceId)
            ->whereNotNull('users.avatar_url')
            ->selectRaw('COUNT(*) as count, MAX(users.updated_at) as last_activity')
            ->first();

        $exportCount = 0;
        $exportLast = null;

        $usedBytes = (int) $files->bytes;

        return response()->json([
            'data' => [
                'workspace_id' => $workspaceId,
                'used_bytes' => $usedBytes,
                'quota_bytes' => (int) $quotaBytes,
                'percent_used' => $quotaBytes > 0
                    ? round(($usedBytes / $quotaBytes) * 100, 1) : 0,
                'breakdown' => [
                    'files' => [
                        'count' => (int) $files->count,
                        'bytes' => (int) $files->bytes,
                        'last_activity' => $files->last_activity,
                    ],
                    'avatars' => [
                        'count' => (int) $avatars->count,
                        'bytes' => 0,
                        'last_activity' => $avatars->last_activity,
                    ],
                    'exports' => [
                        'count' => (int) $exportCount,
                        'bytes' => 0,
                        'last_activity' => $exportLast,
                    ],
                ],
            ],
        ]);
    }
}
