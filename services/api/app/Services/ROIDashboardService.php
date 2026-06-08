<?php

namespace App\Services;

use App\Core\Enums\SubscriptionPlan;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Models\SiteAccessLog;
use App\Modules\Competency\Models\CofRecord;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\PTW\Models\Permit;
use Carbon\Carbon;

class ROIDashboardService
{
    private const AVG_CREW_COST_PER_HOUR = 450;

    private const PTW_BASELINE_HOURS = 48;

    public function getDashboard(string $workspaceId, ?string $fromDate, ?string $toDate): array
    {
        $from = $fromDate ? Carbon::parse($fromDate)->startOfDay() : Carbon::now()->subDays(30)->startOfDay();
        $to = $toDate ? Carbon::parse($toDate)->endOfDay() : Carbon::now()->endOfDay();

        $daysInRange = $from->diffInDays($to);
        $hasSufficientData = $daysInRange >= 30;

        $certsPrevented = $this->getCertificatesPreventedExpiring($workspaceId, $from, $to);
        $accessDenials = $this->getAccessDenials($workspaceId, $from, $to);
        $complianceRate = $this->getComplianceRate($workspaceId);
        $complianceTrend = $this->getComplianceTrend($workspaceId, $from, $to);
        $ptwData = $this->getPtwProcessingTime($workspaceId, $from, $to);

        $avoidedDowntimeHours = $accessDenials * 8;
        $avoidedDowntimeCost = $avoidedDowntimeHours * self::AVG_CREW_COST_PER_HOUR;

        $timeSavedPtw = (float) max(0, (self::PTW_BASELINE_HOURS - $ptwData['avg_hours']) * $ptwData['total_ptws']);

        $totalPotentialSavings = (float) $avoidedDowntimeCost + $timeSavedPtw;

        $workspace = Workspace::findOrFail($workspaceId);
        $plan = SubscriptionPlan::fromWorkspace($workspace);
        $platformCost = $plan->monthlyPriceCents() / 100;

        $roiRatio = $platformCost > 0 ? round($totalPotentialSavings / $platformCost, 2) : 0.0;

        $result = [
            'certificates_prevented_expiring' => (float) $certsPrevented,
            'access_denials_prevented' => (float) $accessDenials,
            'avoided_downtime_hours' => round((float) $avoidedDowntimeHours, 1),
            'avoided_downtime_cost' => round((float) $avoidedDowntimeCost, 2),
            'compliance_rate' => $complianceRate,
            'compliance_rate_trend' => $complianceTrend,
            'ptw_processing_time_avg' => round($ptwData['avg_hours'], 1),
            'ptw_processing_time_before' => (float) self::PTW_BASELINE_HOURS,
            'time_saved_ptw' => round($timeSavedPtw, 2),
            'total_potential_savings' => round($totalPotentialSavings, 2),
            'platform_cost' => round($platformCost, 2),
            'roi_ratio' => $roiRatio,
            'period' => [
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
            ],
        ];

        if (! $hasSufficientData) {
            $result['message'] = 'Not enough data — ROI needs 30+ days of usage';
        }

        return $result;
    }

    private function getCertificatesPreventedExpiring(string $workspaceId, Carbon $from, Carbon $to): int
    {
        $cofCount = CofRecord::where('workspace_id', $workspaceId)
            ->where('status', 'active')
            ->whereNotNull('verified_at')
            ->whereBetween('verified_at', [$from, $to])
            ->count();

        $certCount = CompetencyRecord::where('workspace_id', $workspaceId)
            ->where('status', 'active')
            ->whereNotNull('verified_at')
            ->whereBetween('verified_at', [$from, $to])
            ->count();

        return $cofCount + $certCount;
    }

    private function getAccessDenials(string $workspaceId, Carbon $from, Carbon $to): int
    {
        return SiteAccessLog::where('workspace_id', $workspaceId)
            ->where('direction', 'entry')
            ->whereBetween('created_at', [$from, $to])
            ->where(function ($q) {
                $q->whereNotNull('compliance_snapshot')
                    ->whereRaw("compliance_snapshot::text != '[]'")
                    ->whereRaw("compliance_snapshot::text != '{}'");
            })
            ->count();
    }

    private function getComplianceRate(string $workspaceId): float
    {
        $total = WorkspaceMember::where('workspace_id', $workspaceId)
            ->where('status', '!=', 'suspended')
            ->count();

        if ($total === 0) {
            return 0.0;
        }

        $compliant = WorkspaceMember::where('workspace_id', $workspaceId)
            ->where('status', '!=', 'suspended')
            ->where('overall_compliance_status', 'compliant')
            ->count();

        return round(($compliant / $total) * 100, 1);
    }

    private function getComplianceTrend(string $workspaceId, Carbon $from, Carbon $to): array
    {
        $weeks = [];
        $end = $to->copy();

        for ($i = 0; $i < 12; $i++) {
            $weekEnd = $end->copy()->subWeeks($i)->endOfWeek();
            $weekStart = $weekEnd->copy()->startOfWeek();

            $scans = SiteAccessLog::where('workspace_id', $workspaceId)
                ->where('direction', 'entry')
                ->whereBetween('created_at', [$weekStart, $weekEnd])
                ->get(['worker_id', 'compliance_snapshot'])
                ->groupBy('worker_id');

            $total = $scans->count();
            $compliant = 0;

            foreach ($scans as $workerScans) {
                $latest = $workerScans->sortByDesc('created_at')->first();
                if ($latest && (empty($latest->compliance_snapshot)
                    || (is_array($latest->compliance_snapshot) && empty($latest->compliance_snapshot)))) {
                    $compliant++;
                }
            }

            $weeks[] = [
                'week_start' => $weekStart->toDateString(),
                'week_end' => $weekEnd->toDateString(),
                'rate' => $total > 0 ? round(($compliant / $total) * 100, 1) : 0.0,
            ];
        }

        return array_reverse($weeks);
    }

    private function getPtwProcessingTime(string $workspaceId, Carbon $from, Carbon $to): array
    {
        $permits = Permit::where('workspace_id', $workspaceId)
            ->whereNotNull('requested_at')
            ->whereNotNull('approved_at')
            ->whereBetween('requested_at', [$from, $to])
            ->select('id', 'requested_at', 'approved_at')
            ->get();

        $total = $permits->count();

        if ($total === 0) {
            return ['avg_hours' => 0.0, 'total_ptws' => 0];
        }

        $totalHours = $permits->sum(function ($permit) {
            return $permit->requested_at->diffInHours($permit->approved_at, false);
        });

        return [
            'avg_hours' => round($totalHours / $total, 1),
            'total_ptws' => $total,
        ];
    }
}
