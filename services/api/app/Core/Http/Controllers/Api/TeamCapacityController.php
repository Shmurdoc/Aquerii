<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeamCapacityController extends Controller
{
    public function index(Request $request, string $workspaceId)
    {
        $startOfWeek = Carbon::now()->startOfWeek();
        $endOfWeek = Carbon::now()->endOfWeek();

        $members = DB::table('workspace_members')
            ->join('users', 'workspace_members.user_id', '=', 'users.id')
            ->where('workspace_members.workspace_id', $workspaceId)
            ->where('workspace_members.status', 'active')
            ->select(
                'users.id as user_id',
                'users.name',
                'users.email',
                'workspace_members.job_title',
                'workspace_members.department',
                'workspace_members.weekly_capacity_hours',
                'workspace_members.capacity_notes'
            )
            ->orderBy('users.name')
            ->get();

        $memberIds = $members->pluck('user_id')->toArray();

        $workloads = DB::table('item_assignees')
            ->join('items', 'item_assignees.item_id', '=', 'items.id')
            ->whereIn('item_assignees.user_id', $memberIds)
            ->where('items.workspace_id', $workspaceId)
            ->whereNull('items.deleted_at')
            ->where(function ($q) {
                $q->where('items.status', '!=', 'done')
                    ->orWhereNull('items.status');
            })
            ->where(function ($q) use ($endOfWeek) {
                $q->whereNull('items.due_date')
                    ->orWhere('items.due_date', '<=', $endOfWeek);
            })
            ->select(
                'item_assignees.user_id',
                DB::raw('COALESCE(SUM(items.estimated_hours), 0) as assigned_hours'),
                DB::raw('COALESCE(SUM(items.tracked_hours), 0) as tracked_hours'),
                DB::raw('COUNT(items.id) as active_task_count')
            )
            ->groupBy('item_assignees.user_id')
            ->get()
            ->keyBy('user_id');

        $result = $members->map(function ($member) use ($workloads, $startOfWeek, $endOfWeek) {
            $workload = $workloads->get($member->user_id);
            $capacity = (float) ($member->weekly_capacity_hours ?? 40);
            $assigned = $workload ? (float) $workload->assigned_hours : 0;
            $tracked = $workload ? (float) $workload->tracked_hours : 0;
            $taskCount = $workload ? (int) $workload->active_task_count : 0;

            return [
                'user_id' => $member->user_id,
                'name' => $member->name,
                'email' => $member->email,
                'job_title' => $member->job_title,
                'department' => $member->department,
                'weekly_capacity_hours' => $capacity,
                'assigned_hours' => $assigned,
                'tracked_hours' => $tracked,
                'utilization_pct' => $capacity > 0 ? round(($assigned / $capacity) * 100, 1) : 0,
                'active_task_count' => $taskCount,
                'capacity_notes' => $member->capacity_notes,
                'week_start' => $startOfWeek->toDateString(),
                'week_end' => $endOfWeek->toDateString(),
            ];
        });

        return response()->json(['data' => $result]);
    }

    public function update(Request $request, string $workspaceId)
    {
        $userId = $request->route('userId');

        $data = $request->validate([
            'weekly_capacity_hours' => 'required|numeric|min:0|max:168',
            'capacity_notes' => 'nullable|string|max:500',
        ]);

        $updated = DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $userId)
            ->update($data);

        if (!$updated) {
            return response()->json(['error' => 'Member not found'], 404);
        }

        $member = DB::table('workspace_members')
            ->join('users', 'workspace_members.user_id', '=', 'users.id')
            ->where('workspace_members.workspace_id', $workspaceId)
            ->where('workspace_members.user_id', $userId)
            ->select(
                'users.id as user_id',
                'users.name',
                'workspace_members.weekly_capacity_hours',
                'workspace_members.capacity_notes'
            )
            ->first();

        return response()->json(['data' => $member]);
    }
}
