<?php

namespace App\Http\Controllers;

use App\Core\Enums\SubscriptionPlan;
use App\Core\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class StorageController extends Controller
{
    public function show(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $this->isMember($request, $workspace->id),
            403,
            'Not a member of this workspace.'
        );

        $plan = SubscriptionPlan::fromWorkspace($workspace);
        $quotaBytes = (int) $workspace->storage_quota_bytes ?: $plan->storageLimitBytes();

        $files = $this->filesBreakdown($workspace->id);
        $avatars = $this->avatarsBreakdown($workspace->id);
        $exports = $this->exportsBreakdown();

        $usedBytes = $files['bytes'] + $avatars['bytes'] + $exports['bytes'];

        $percent = $quotaBytes > 0
            ? round(($usedBytes / $quotaBytes) * 100, 2)
            : 0.0;

        return response()->json([
            'data' => [
                'workspace_id' => $workspace->id,
                'used_bytes' => $usedBytes,
                'quota_bytes' => $quotaBytes,
                'percent_used' => $percent,
                'breakdown' => [
                    'files' => $files,
                    'avatars' => $avatars,
                    'exports' => $exports,
                ],
            ],
        ]);
    }

    private function isMember(Request $request, string $workspaceId): bool
    {
        $user = $request->user();
        if (! $user) {
            return false;
        }

        return DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();
    }

    private function filesBreakdown(string $workspaceId): array
    {
        $row = DB::table('files')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as bytes, MAX(created_at) as last_activity_at')
            ->first();

        return [
            'count' => (int) ($row->count ?? 0),
            'bytes' => (int) ($row->bytes ?? 0),
            'last_activity' => $row->last_activity_at ?? null,
        ];
    }

    private function avatarsBreakdown(string $workspaceId): array
    {
        $userIds = DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('status', 'active')
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->all();

        if (empty($userIds)) {
            return ['count' => 0, 'bytes' => 0, 'last_activity' => null];
        }

        $totalBytes = 0;
        $totalCount = 0;
        $lastActivity = null;
        $disk = Storage::disk('s3');

        try {
            foreach ($userIds as $userId) {
                $prefix = "avatars/{$userId}";
                foreach ($disk->allFiles($prefix) as $path) {
                    $size = $disk->size($path);
                    if ($size !== null && $size !== false) {
                        $totalBytes += (int) $size;
                        $totalCount++;
                    }
                }
            }

            $latest = DB::table('users')
                ->whereIn('id', $userIds)
                ->whereNotNull('avatar_url')
                ->max('updated_at');
            $lastActivity = $latest ? (string) $latest : null;
        } catch (\Throwable) {
            $totalBytes = 0;
            $totalCount = 0;
            $lastActivity = null;
        }

        return [
            'count' => $totalCount,
            'bytes' => $totalBytes,
            'last_activity' => $lastActivity,
        ];
    }

    private function exportsBreakdown(): array
    {
        return [
            'count' => 0,
            'bytes' => 0,
            'last_activity' => null,
        ];
    }
}
