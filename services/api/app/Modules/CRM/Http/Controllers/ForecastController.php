<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Models\CrmPipeline;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ForecastController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $deals = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNull('won_at')
            ->whereNull('lost_at')
            ->get();

        $totalPipelineValue = $deals->sum(fn ($deal) => ($deal->value ?? 0) * ($deal->probability ?? 100) / 100);
        $weightedForecast = $deals->sum(fn ($deal) => ($deal->value ?? 0) * ($deal->probability ?? 100) / 100);

        $byPipeline = $deals->groupBy('pipeline_id')->map(function ($group) {
            $pipeline = CrmPipeline::find($group->first()->pipeline_id);

            return [
                'pipeline_id' => $group->first()->pipeline_id,
                'pipeline_name' => $pipeline?->name,
                'total_value' => $group->sum('value'),
                'weighted_forecast' => $group->sum(fn ($d) => ($d->value ?? 0) * ($d->probability ?? 100) / 100),
                'deal_count' => $group->count(),
            ];
        })->values();

        $byStage = $deals->groupBy('stage_id')->map(function ($group) {
            return [
                'stage_id' => $group->first()->stage_id,
                'stage_name' => $group->first()->stage?->name,
                'total_value' => $group->sum('value'),
                'weighted_forecast' => $group->sum(fn ($d) => ($d->value ?? 0) * ($d->probability ?? 100) / 100),
                'deal_count' => $group->count(),
            ];
        })->values();

        return response()->json([
            'data' => [
                'total_pipeline_value' => round($totalPipelineValue, 2),
                'weighted_forecast' => round($weightedForecast, 2),
                'by_pipeline' => $byPipeline,
                'by_stage' => $byStage,
            ],
        ]);
    }

    public function byRep(Request $request, Workspace $workspace): JsonResponse
    {
        $deals = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNull('won_at')
            ->whereNull('lost_at')
            ->with('owner')
            ->get();

        $byRep = $deals->groupBy('owner_id')->map(function ($group) {
            $owner = $group->first()->owner;

            return [
                'owner_id' => $group->first()->owner_id,
                'owner_name' => $owner?->name,
                'total_value' => $group->sum('value'),
                'weighted_forecast' => $group->sum(fn ($d) => ($d->value ?? 0) * ($d->probability ?? 100) / 100),
                'deal_count' => $group->count(),
            ];
        })->values();

        return response()->json(['data' => $byRep]);
    }

    public function byPipeline(Request $request, Workspace $workspace): JsonResponse
    {
        $deals = CrmDeal::where('workspace_id', $workspace->id)
            ->whereNull('won_at')
            ->whereNull('lost_at')
            ->get();

        $byPipeline = $deals->groupBy('pipeline_id')->map(function ($group) {
            $pipeline = CrmPipeline::find($group->first()->pipeline_id);

            return [
                'pipeline_id' => $group->first()->pipeline_id,
                'pipeline_name' => $pipeline?->name,
                'total_value' => $group->sum('value'),
                'weighted_forecast' => $group->sum(fn ($d) => ($d->value ?? 0) * ($d->probability ?? 100) / 100),
                'deal_count' => $group->count(),
            ];
        })->values();

        return response()->json(['data' => $byPipeline]);
    }
}
