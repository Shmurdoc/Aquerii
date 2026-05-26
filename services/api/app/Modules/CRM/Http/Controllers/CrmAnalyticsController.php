<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmContact;
use App\Modules\CRM\Models\CrmDeal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CrmAnalyticsController extends Controller
{
    public function funnel(Request $request, Workspace $workspace): JsonResponse
    {
        $stages = DB::table('crm_pipeline_stages')
            ->whereIn('pipeline_id', function ($q) use ($workspace) {
                $q->select('id')->from('crm_pipelines')->where('workspace_id', $workspace->id);
            })
            ->orderBy('order')
            ->get();

        $deals = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNull('won_at')
            ->whereNull('lost_at')
            ->get()
            ->groupBy('stage_id');

        $funnel = $stages->map(fn ($stage) => [
            'stage_id' => $stage->id,
            'stage_name' => $stage->name,
            'pipeline_name' => DB::table('crm_pipelines')->where('id', $stage->pipeline_id)->value('name'),
            'deal_count' => $deals->get($stage->id)?->count() ?? 0,
            'total_value' => round($deals->get($stage->id)?->sum('value') ?? 0, 2),
        ]);

        $won = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNotNull('won_at')
            ->count();

        $lost = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNotNull('lost_at')
            ->count();

        return response()->json(['data' => [
            'stages' => $funnel,
            'won' => $won,
            'lost' => $lost,
            'conversion_rate' => ($won + $lost) > 0
                ? round($won / ($won + $lost) * 100, 1) : 0,
        ]]);
    }

    public function cohort(Request $request, Workspace $workspace): JsonResponse
    {
        $cohorts = CrmContact::where('workspace_id', $workspace->id)
            ->select(
                DB::raw("DATE_TRUNC('month', created_at) as cohort_month"),
                DB::raw('COUNT(*) as acquired'),
                DB::raw('SUM(CASE WHEN deal_value > 0 THEN 1 ELSE 0 END) as converted'),
                DB::raw('COALESCE(SUM(deal_value), 0) as revenue')
            )
            ->groupBy(DB::raw("DATE_TRUNC('month', created_at)"))
            ->orderBy('cohort_month', 'desc')
            ->limit(12)
            ->get()
            ->map(fn ($c) => [
                'cohort' => $c->cohort_month,
                'acquired' => $c->acquired,
                'converted' => $c->converted,
                'revenue' => round((float) $c->revenue, 2),
                'conversion_rate' => $c->acquired > 0
                    ? round($c->converted / $c->acquired * 100, 1) : 0,
                'revenue_per_contact' => $c->acquired > 0
                    ? round($c->revenue / $c->acquired, 2) : 0,
            ]);

        return response()->json(['data' => $cohorts]);
    }

    public function churnRisk(Request $request, Workspace $workspace): JsonResponse
    {
        $thresholdDays = (int) $request->get('threshold_days', 90);

        $atRisk = CrmContact::where('workspace_id', $workspace->id)
            ->where('lifecycle_stage', 'customer')
            ->where(function ($q) use ($thresholdDays) {
                $q->whereNull('last_touched_at')
                    ->orWhere('last_touched_at', '<', now()->subDays($thresholdDays));
            })
            ->withCount(['deals' => function ($q) {
                $q->whereNull('won_at')->whereNull('lost_at');
            }])
            ->orderBy('last_touched_at', 'asc')
            ->limit(50)
            ->get(['id', 'first_name', 'last_name', 'email', 'lead_score', 'last_touched_at', 'deal_value']);

        $total = CrmContact::where('workspace_id', $workspace->id)
            ->where('lifecycle_stage', 'customer')
            ->count();

        $active = CrmContact::where('workspace_id', $workspace->id)
            ->where('lifecycle_stage', 'customer')
            ->where(function ($q) use ($thresholdDays) {
                $q->whereNull('last_touched_at')
                    ->orWhere('last_touched_at', '>=', now()->subDays($thresholdDays));
            })
            ->count();

        return response()->json(['data' => [
            'total_customers' => $total,
            'active_customers' => $active,
            'at_risk_count' => $atRisk->count(),
            'churn_rate' => $total > 0
                ? round($atRisk->count() / $total * 100, 1) : 0,
            'at_risk_contacts' => $atRisk,
        ]]);
    }

    public function clv(Request $request, Workspace $workspace): JsonResponse
    {
        $lifetimeValue = CrmContact::where('workspace_id', $workspace->id)
            ->where('deal_value', '>', 0)
            ->select(
                DB::raw('AVG(deal_value) as avg_ltv'),
                DB::raw('MAX(deal_value) as max_ltv'),
                DB::raw('MIN(deal_value) as min_ltv'),
                DB::raw('COUNT(*) as customers_with_revenue')
            )
            ->first();

        $totalContacts = CrmContact::where('workspace_id', $workspace->id)->count();
        $totalRevenue = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNotNull('won_at')
            ->sum('value');

        $byLifecycle = CrmContact::where('workspace_id', $workspace->id)
            ->select('lifecycle_stage',
                DB::raw('COUNT(*) as count'),
                DB::raw('AVG(deal_value) as avg_ltv'),
                DB::raw('COALESCE(SUM(deal_value), 0) as total_value')
            )
            ->groupBy('lifecycle_stage')
            ->get();

        return response()->json(['data' => [
            'avg_ltv' => round((float) ($lifetimeValue->avg_ltv ?? 0), 2),
            'max_ltv' => round((float) ($lifetimeValue->max_ltv ?? 0), 2),
            'min_ltv' => round((float) ($lifetimeValue->min_ltv ?? 0), 2),
            'total_customers_with_revenue' => $lifetimeValue->customers_with_revenue ?? 0,
            'total_contacts' => $totalContacts,
            'total_revenue' => round((float) $totalRevenue, 2),
            'revenue_per_contact' => $totalContacts > 0
                ? round((float) $totalRevenue / $totalContacts, 2) : 0,
            'by_lifecycle_stage' => $byLifecycle,
        ]]);
    }
}
