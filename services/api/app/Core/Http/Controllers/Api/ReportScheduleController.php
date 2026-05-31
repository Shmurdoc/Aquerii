<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReportScheduleController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request, string $workspace): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $query = DB::table('report_schedules')->where('workspace_id', $workspace);

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOL));
        }

        $rows = $query->orderByDesc('created_at')->paginate(min(200, max(1, (int) $request->query('per_page', 50))));

        return response()->json([
            'data' => $rows->items(),
            'meta' => [
                'total' => $rows->total(),
                'per_page' => $rows->perPage(),
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
            ],
        ]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $data = $request->validate([
            'name' => 'required|string|max:150',
            'report_type' => 'required|string|max:100',
            'format' => 'nullable|string|in:csv,json,pdf',
            'recipients' => 'nullable|array',
            'recipients.*' => 'email',
            'filters' => 'nullable|array',
            'frequency' => 'required|string|in:daily,weekly,monthly',
            'next_run_at' => 'nullable|date',
            'is_active' => 'nullable|boolean',
        ]);

        $id = (string) Str::uuid();

        DB::table('report_schedules')->insert([
            'id' => $id,
            'workspace_id' => $workspace,
            'name' => $data['name'],
            'report_type' => $data['report_type'],
            'format' => $data['format'] ?? 'csv',
            'recipients' => json_encode($data['recipients'] ?? []),
            'filters' => json_encode($data['filters'] ?? []),
            'frequency' => $data['frequency'],
            'next_run_at' => isset($data['next_run_at']) ? $data['next_run_at'] : now()->addDay(),
            'is_active' => $data['is_active'] ?? true,
            'created_by' => $request->user()->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->audit->log(
            action: 'report.schedule_created',
            workspaceId: $workspace,
            userId: $request->user()->id,
            resourceType: 'report_schedule',
            resourceId: $id,
            after: ['report_type' => $data['report_type'], 'frequency' => $data['frequency']]
        );

        return response()->json(['data' => ['id' => $id]], 201);
    }

    public function update(Request $request, string $workspace, string $scheduleId): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $current = DB::table('report_schedules')
            ->where('workspace_id', $workspace)
            ->where('id', $scheduleId)
            ->first();
        abort_unless($current, 404, 'Schedule not found.');

        $data = $request->validate([
            'name' => 'sometimes|string|max:150',
            'format' => 'sometimes|string|in:csv,json,pdf',
            'recipients' => 'sometimes|array',
            'recipients.*' => 'email',
            'filters' => 'sometimes|array',
            'frequency' => 'sometimes|string|in:daily,weekly,monthly',
            'next_run_at' => 'sometimes|date',
            'is_active' => 'sometimes|boolean',
        ]);

        $payload = [];
        foreach (['name', 'format', 'frequency', 'next_run_at', 'is_active'] as $field) {
            if (array_key_exists($field, $data)) {
                $payload[$field] = $data[$field];
            }
        }
        if (array_key_exists('recipients', $data)) {
            $payload['recipients'] = json_encode($data['recipients']);
        }
        if (array_key_exists('filters', $data)) {
            $payload['filters'] = json_encode($data['filters']);
        }

        $payload['updated_at'] = now();

        DB::table('report_schedules')
            ->where('workspace_id', $workspace)
            ->where('id', $scheduleId)
            ->update($payload);

        $this->audit->log(
            action: 'report.schedule_updated',
            workspaceId: $workspace,
            userId: $request->user()->id,
            resourceType: 'report_schedule',
            resourceId: $scheduleId,
            before: (array) $current,
            after: $payload
        );

        return response()->json(['data' => ['updated' => true]]);
    }

    public function destroy(Request $request, string $workspace, string $scheduleId): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $deleted = DB::table('report_schedules')
            ->where('workspace_id', $workspace)
            ->where('id', $scheduleId)
            ->delete();

        abort_unless($deleted > 0, 404, 'Schedule not found.');

        $this->audit->log(
            action: 'report.schedule_deleted',
            workspaceId: $workspace,
            userId: $request->user()->id,
            resourceType: 'report_schedule',
            resourceId: $scheduleId
        );

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function runNow(Request $request, string $workspace, string $scheduleId): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $schedule = DB::table('report_schedules')
            ->where('workspace_id', $workspace)
            ->where('id', $scheduleId)
            ->first();
        abort_unless($schedule, 404, 'Schedule not found.');

        DB::table('report_schedules')
            ->where('workspace_id', $workspace)
            ->where('id', $scheduleId)
            ->update([
                'last_run_at' => now(),
                'next_run_at' => $this->nextRunFromFrequency((string) $schedule->frequency),
                'updated_at' => now(),
            ]);

        $this->audit->log(
            action: 'report.schedule_run_now',
            workspaceId: $workspace,
            userId: $request->user()->id,
            resourceType: 'report_schedule',
            resourceId: $scheduleId
        );

        return response()->json([
            'data' => [
                'triggered' => true,
                'message' => 'Scheduled report execution accepted.',
            ],
        ]);
    }

    public function exceptions(Request $request, string $workspace): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $now = now();
        $overdue = DB::table('report_schedules')
            ->where('workspace_id', $workspace)
            ->where('is_active', true)
            ->whereNotNull('next_run_at')
            ->where('next_run_at', '<', $now)
            ->select('id', 'name', 'report_type', 'frequency', 'next_run_at', 'last_run_at')
            ->orderBy('next_run_at')
            ->get();

        $stale = DB::table('report_schedules')
            ->where('workspace_id', $workspace)
            ->where('is_active', true)
            ->whereNotNull('last_run_at')
            ->where('last_run_at', '<', $now->copy()->subDays(31))
            ->select('id', 'name', 'report_type', 'frequency', 'next_run_at', 'last_run_at')
            ->orderBy('last_run_at')
            ->get();

        return response()->json([
            'data' => [
                'overdue' => $overdue,
                'stale' => $stale,
                'summary' => [
                    'overdue_count' => $overdue->count(),
                    'stale_count' => $stale->count(),
                ],
            ],
        ]);
    }

    private function nextRunFromFrequency(string $frequency): \Carbon\Carbon
    {
        return match ($frequency) {
            'daily' => now()->addDay(),
            'weekly' => now()->addWeek(),
            'monthly' => now()->addMonth(),
            default => now()->addWeek(),
        };
    }

    private function requireWorkspaceAdmin(Request $request, string $workspaceId): void
    {
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        $member = DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first(['role']);

        abort_if(! $member || ! in_array($member->role, ['owner', 'admin'], true), 403, 'Insufficient role for this action.');
    }
}
