<?php

namespace App\Services;

use App\Core\Models\ShiftPlan;
use App\Core\Models\ShiftPlanAssignment;
use App\Core\Models\WorkspaceMember;
use App\Models\SiteAccessLog;
use App\Services\ComplianceService;

class ShiftReadinessService
{
    public function __construct(
        private readonly ComplianceService $complianceService,
    ) {}

    public function getReadiness(string $workspaceId, string $date, string $shiftType): array
    {
        $plan = ShiftPlan::where('workspace_id', $workspaceId)
            ->where('date', $date)
            ->where('shift_type', $shiftType)
            ->first();

        if ($plan === null) {
            return $this->emptyReadiness($date, $shiftType);
        }

        $requiredRoles = collect($plan->required_roles ?? []);
        $assignments = $plan->assignments()->with('worker')->get();

        $checkedInWorkerIds = SiteAccessLog::where('workspace_id', $workspaceId)
            ->whereDate('timestamp', $date)
            ->where('direction', 'in')
            ->whereIn('worker_id', $assignments->pluck('worker_id'))
            ->distinct()
            ->pluck('worker_id');

        $roles = $requiredRoles->map(function (array $req) use ($assignments, $checkedInWorkerIds) {
            $role = $req['role'];
            $required = $req['count'] ?? 0;

            $roleAssignments = $assignments->where('role', $role);
            $assigned = $roleAssignments->count();

            $checkedIn = $roleAssignments
                ->whereIn('worker_id', $checkedInWorkerIds)
                ->count();

            $compliant = $roleAssignments->filter(function ($a) {
                $worker = $a->worker;
                if ($worker === null) {
                    return false;
                }

                return $this->complianceService->calculateWorkerStatus($worker) !== 'non_compliant';
            })->count();

            $gaps = max(0, $required - $compliant);

            return [
                'role' => $role,
                'required' => $required,
                'assigned' => $assigned,
                'checked_in' => $checkedIn,
                'compliant' => $compliant,
                'gaps' => $gaps,
            ];
        });

        $totalRequired = $roles->sum('required');
        $totalCompliant = $roles->sum('compliant');
        $overallReadiness = $totalRequired > 0
            ? round(($totalCompliant / $totalRequired) * 100, 1)
            : 100.0;

        $criticalGaps = $roles
            ->filter(fn ($r) => $r['gaps'] > 0)
            ->map(fn ($r) => ['role' => $r['role'], 'gap' => $r['gaps']])
            ->values();

        return [
            'date' => $date,
            'shift_type' => $shiftType,
            'plan_id' => $plan->id,
            'plan_status' => $plan->status,
            'roles' => $roles->values()->all(),
            'overall_readiness' => $overallReadiness,
            'critical_gaps' => $criticalGaps->all(),
        ];
    }

    private function emptyReadiness(string $date, string $shiftType): array
    {
        return [
            'date' => $date,
            'shift_type' => $shiftType,
            'plan_id' => null,
            'plan_status' => null,
            'roles' => [],
            'overall_readiness' => 100.0,
            'critical_gaps' => [],
        ];
    }
}
