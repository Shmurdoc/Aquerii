<?php

namespace App\Modules\HSSE\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\HSSE\Models\ShiftPlan;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShiftReadinessController extends Controller
{
    public function readiness(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $date = $request->query('date', now()->toDateString());
        $shift = $request->query('shift', 'day');

        $members = DB::table('workspace_members')
            ->join('users', 'workspace_members.user_id', '=', 'users.id')
            ->where('workspace_members.workspace_id', $workspace->id)
            ->where('workspace_members.status', 'active')
            ->select(
                'users.id',
                'users.name',
                'workspace_members.role',
                'workspace_members.job_title',
            )
            ->get();

        $checkedIn = DB::table('attendance_logs')
            ->where('workspace_id', $workspace->id)
            ->whereDate('clocked_in_at', $date)
            ->whereNotNull('clocked_in_at')
            ->whereNull('clocked_out_at')
            ->pluck('user_id');

        $now = now();
        $certData = DB::table('competency_records')
            ->whereIn('user_id', $members->pluck('id'))
            ->whereNotNull('expires_at')
            ->select('user_id', 'expires_at')
            ->get()
            ->groupBy('user_id');

        $roles = $members->groupBy('role')->map(function ($workers, $role) use ($checkedIn, $certData, $now) {
            $assigned = $workers->count();
            $checkedInCount = $workers->filter(fn ($w) => $checkedIn->contains($w->id))->count();
            $compliant = $workers->filter(function ($w) use ($certData, $now) {
                $certs = isset($certData[$w->id]) ? $certData[$w->id] : collect();

                return $certs->contains(fn ($c) => Carbon::parse($c->expires_at)->isFuture());
            })->count();

            $gaps = [];
            if ($assigned < 1) {
                $gaps[] = 'No workers assigned';
            }
            if ($checkedInCount < 1) {
                $gaps[] = 'No workers checked in';
            }

            return [
                'role' => $role ?: 'Unassigned',
                'required' => max(1, intdiv($assigned, 2)),
                'assigned' => $assigned,
                'checked_in' => $checkedInCount,
                'compliant' => $compliant,
                'gaps' => $gaps,
            ];
        })->values();

        $criticalGaps = $roles->filter(fn ($r) => $r['checked_in'] < $r['required'] || $r['compliant'] < $r['required'])
            ->map(fn ($r) => [
                'role' => $r['role'],
                'gap' => sprintf('Need %d more checked-in, compliant workers', max(0, $r['required'] - min($r['checked_in'], $r['compliant']))),
            ]);

        $filled = $roles->sum(fn ($r) => min($r['checked_in'], $r['compliant']));
        $requiredTotal = $roles->sum('required');
        $overallReadiness = $requiredTotal > 0 ? round(($filled / $requiredTotal) * 100, 1) : 0;

        return response()->json(['data' => [
            'date' => $date,
            'shift_type' => $shift,
            'roles' => $roles->toArray(),
            'overall_readiness' => $overallReadiness,
            'critical_gaps' => $criticalGaps->values()->toArray(),
        ]]);
    }

    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $query = ShiftPlan::where('workspace_id', $workspace->id);

        if ($from = $request->query('date_from')) {
            $query->where('date', '>=', $from);
        }
        if ($to = $request->query('date_to')) {
            $query->where('date', '<=', $to);
        }

        $plans = $query->orderBy('date')->orderBy('shift_type')->get();

        return response()->json(['data' => $plans]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $validated = $request->validate([
            'date' => 'required|date',
            'shift_type' => 'required|string|max:50',
        ]);

        $plan = ShiftPlan::create([
            'workspace_id' => $workspace->id,
            'date' => $validated['date'],
            'shift_type' => $validated['shift_type'],
            'status' => 'draft',
            'roles' => [],
        ]);

        return response()->json(['data' => $plan], 201);
    }

    public function assignWorker(Request $request, Workspace $workspace, ShiftPlan $shiftPlan): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $shiftPlan->workspace_id === $workspace->id,
            404
        );

        $validated = $request->validate([
            'plan_id' => 'sometimes|uuid',
            'role' => 'required|string|max:255',
            'worker_id' => 'required|uuid',
        ]);

        $roles = $shiftPlan->roles ?? [];
        $found = false;
        foreach ($roles as &$r) {
            if ($r['role'] === $validated['role']) {
                if (!isset($r['workers'])) {
                    $r['workers'] = [];
                }
                if (!in_array($validated['worker_id'], $r['workers'])) {
                    $r['workers'][] = $validated['worker_id'];
                }
                $r['assigned'] = count($r['workers']);
                $found = true;
                break;
            }
        }

        if (!$found) {
            $roles[] = [
                'role' => $validated['role'],
                'workers' => [$validated['worker_id']],
                'assigned' => 1,
            ];
        }

        $shiftPlan->update(['roles' => $roles]);

        return response()->json(['data' => $shiftPlan->fresh()]);
    }

    public function publish(Request $request, Workspace $workspace, ShiftPlan $shiftPlan): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $shiftPlan->workspace_id === $workspace->id,
            404
        );

        $shiftPlan->update(['status' => 'published']);

        return response()->json(['data' => $shiftPlan->fresh()]);
    }

    public function complete(Request $request, Workspace $workspace, ShiftPlan $shiftPlan): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $shiftPlan->workspace_id === $workspace->id,
            404
        );

        $shiftPlan->update(['status' => 'completed']);

        return response()->json(['data' => $shiftPlan->fresh()]);
    }
}
