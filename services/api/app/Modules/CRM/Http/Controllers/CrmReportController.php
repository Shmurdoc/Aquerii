<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmActivity;
use App\Modules\CRM\Models\CrmContact;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Models\CrmLead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CrmReportController extends Controller
{
    public function pipelineVelocity(Request $request, Workspace $workspace): JsonResponse
    {
        $days = (int) $request->get('days', 90);

        $stages = DB::table('crm_pipeline_stages as ps')
            ->join('crm_pipelines as p', 'p.id', '=', 'ps.pipeline_id')
            ->where('p.workspace_id', $workspace->id)
            ->select('ps.id', 'ps.name', 'ps.pipeline_id', 'p.name as pipeline_name')
            ->get()
            ->keyBy('id');

        $durations = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNotNull('won_at')
            ->where('won_at', '>=', now()->subDays($days))
            ->select('id', 'stage_history', 'won_at', 'value')
            ->get()
            ->map(function ($deal) use ($stages) {
                $history = is_array($deal->stage_history) ? $deal->stage_history : [];
                $totalDays = 0;
                $stageDays = [];

                for ($i = 0; $i < count($history); $i++) {
                    $from = $history[$i]['entered_at'] ?? $history[$i]['created_at'] ?? null;
                    $to = ($history[$i + 1]['entered_at'] ?? $history[$i + 1]['created_at'] ?? $deal->won_at);

                    if ($from && $to) {
                        $days = (int) ceil((strtotime($to) - strtotime($from)) / 86400);
                        $stageId = $history[$i]['stage_id'] ?? null;
                        if ($stageId && isset($stages[$stageId])) {
                            $stageDays[] = [
                                'stage_name' => $stages[$stageId]->name,
                                'days' => $days,
                            ];
                        }
                        $totalDays += $days;
                    }
                }

                return [
                    'deal_id' => $deal->id,
                    'value' => $deal->value,
                    'total_days' => $totalDays,
                    'stage_breakdown' => $stageDays,
                ];
            });

        $avgTotalDays = $durations->count() > 0
            ? round($durations->avg('total_days'), 1) : 0;

        $byStage = collect($durations->pluck('stage_breakdown')->flatten(1))
            ->groupBy('stage_name')
            ->map(fn($group) => round($group->avg('days'), 1));

        return response()->json(['data' => [
            'avg_deal_cycle_days' => $avgTotalDays,
            'won_deal_count' => $durations->count(),
            'avg_days_by_stage' => $byStage,
            'velocity_per_day' => $avgTotalDays > 0
                ? round($durations->sum('value') / $avgTotalDays, 2) : 0,
        ]]);
    }

    public function revenue(Request $request, Workspace $workspace): JsonResponse
    {
        $period = $request->get('period', '30');

        $revenue = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNotNull('won_at')
            ->where('won_at', '>=', now()->subDays((int) $period))
            ->select(
                DB::raw("DATE(won_at) as day"),
                DB::raw("SUM(value) as revenue"),
                DB::raw("COUNT(*) as deals_count")
            )
            ->groupBy(DB::raw("DATE(won_at)"))
            ->orderBy('day')
            ->get();

        $totalRevenue = $revenue->sum('revenue');
        $wonDeals = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNotNull('won_at')
            ->where('won_at', '>=', now()->subDays((int) $period))
            ->count();

        $lostDeals = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNotNull('lost_at')
            ->where('lost_at', '>=', now()->subDays((int) $period))
            ->count();

        $prevPeriod = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNotNull('won_at')
            ->where('won_at', '>=', now()->subDays((int) $period * 2))
            ->where('won_at', '<', now()->subDays((int) $period))
            ->sum('value');

        $change = $prevPeriod > 0
            ? round(($totalRevenue - $prevPeriod) / $prevPeriod * 100, 1) : null;

        return response()->json(['data' => [
            'total_revenue' => round($totalRevenue, 2),
            'won_deals' => $wonDeals,
            'lost_deals' => $lostDeals,
            'revenue_change_pct' => $change,
            'by_day' => $revenue,
        ]]);
    }

    public function winLoss(Request $request, Workspace $workspace): JsonResponse
    {
        $period = $request->get('period', '90');

        $won = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNotNull('won_at')
            ->where('won_at', '>=', now()->subDays((int) $period))
            ->select(
                DB::raw("DATE(won_at) as day"),
                DB::raw("COUNT(*) as count"),
                DB::raw("SUM(value) as value"),
                DB::raw("COALESCE(loss_reason, 'won') as reason")
            )
            ->groupBy(DB::raw("DATE(won_at)"), 'loss_reason')
            ->get();

        $lost = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNotNull('lost_at')
            ->where('lost_at', '>=', now()->subDays((int) $period))
            ->select(
                DB::raw("DATE(lost_at) as day"),
                DB::raw("COUNT(*) as count"),
                DB::raw("SUM(value) as value"),
                'loss_reason'
            )
            ->groupBy(DB::raw("DATE(lost_at)"), 'loss_reason')
            ->get();

        $lossReasons = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNotNull('lost_at')
            ->where('lost_at', '>=', now()->subDays((int) $period))
            ->whereNotNull('loss_reason')
            ->select('loss_reason', DB::raw('COUNT(*) as count'), DB::raw('SUM(value) as value'))
            ->groupBy('loss_reason')
            ->orderByDesc('count')
            ->get();

        $wonCount = $won->sum('count');
        $lostCount = $lost->sum('count');
        $total = $wonCount + $lostCount;

        return response()->json(['data' => [
            'won_count' => $wonCount,
            'lost_count' => $lostCount,
            'win_rate' => $total > 0 ? round($wonCount / $total * 100, 1) : 0,
            'won_value' => round($won->sum('value'), 2),
            'lost_value' => round($lost->sum('value'), 2),
            'loss_reasons' => $lossReasons,
        ]]);
    }

    public function activities(Request $request, Workspace $workspace): JsonResponse
    {
        $period = $request->get('period', '30');

        $activities = CrmActivity::where('workspace_id', $workspace->id)
            ->where('created_at', '>=', now()->subDays((int) $period))
            ->select(
                'type',
                DB::raw('COUNT(*) as count'),
                DB::raw("DATE(created_at) as day")
            )
            ->groupBy('type', DB::raw("DATE(created_at)"))
            ->orderBy('day')
            ->get();

        $byType = $activities->groupBy('type')
            ->map(fn($group) => [
                'type' => $group->first()->type,
                'count' => $group->sum('count'),
            ])->values();

        $totalActivities = $activities->sum('count');
        $activeDeals = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNull('won_at')->whereNull('lost_at')->count();

        return response()->json(['data' => [
            'total_activities' => $totalActivities,
            'active_deals' => $activeDeals,
            'activities_per_deal' => $activeDeals > 0
                ? round($totalActivities / $activeDeals, 1) : 0,
            'by_type' => $byType,
        ]]);
    }

    public function leadSources(Request $request, Workspace $workspace): JsonResponse
    {
        $sources = CrmLead::where('workspace_id', $workspace->id)
            ->select('source', DB::raw('COUNT(*) as count'))
            ->groupBy('source')
            ->orderByDesc('count')
            ->get();

        $converted = CrmLead::where('workspace_id', $workspace->id)
            ->where('status', 'converted')
            ->select('source', DB::raw('COUNT(*) as count'))
            ->groupBy('source')
            ->orderByDesc('count')
            ->get()
            ->keyBy('source');

        $total = $sources->sum('count');

        $withRates = $sources->map(fn($s) => [
            'source' => $s->source,
            'count' => $s->count,
            'pct' => $total > 0 ? round($s->count / $total * 100, 1) : 0,
            'converted' => $converted->get($s->source)?->count ?? 0,
            'conversion_rate' => $s->count > 0
                ? round(($converted->get($s->source)?->count ?? 0) / $s->count * 100, 1) : 0,
        ]);

        return response()->json(['data' => [
            'total_leads' => $total,
            'sources' => $withRates,
        ]]);
    }
}
