<?php

namespace App\Http\Controllers\Api;

use App\Core\Jobs\BurnoutDetector;
use App\Core\Models\BurnoutScore;
use App\Core\Models\TeamActivityMetric;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SentimentController extends Controller
{
    public function teamOverview(Request $request, string $workspace): JsonResponse
    {
        $scores = BurnoutScore::where('workspace_id', $workspace)
            ->with('user:id,name')
            ->orderBy('score', 'desc')
            ->get();

        $summary = [
            'total_members' => $scores->count(),
            'critical' => $scores->where('risk_level', 'critical')->count(),
            'high' => $scores->where('risk_level', 'high')->count(),
            'medium' => $scores->where('risk_level', 'medium')->count(),
            'low' => $scores->where('risk_level', 'low')->count(),
            'avg_score' => $scores->avg('score') ?? 0,
        ];

        return response()->json([
            'data' => $scores,
            'summary' => $summary,
        ]);
    }

    public function memberMetrics(Request $request, string $workspace, string $userId): JsonResponse
    {
        $days = min(30, max(1, intval($request->get('days', 7))));
        $startDate = Carbon::today()->subDays($days);

        $metrics = TeamActivityMetric::where('workspace_id', $workspace)
            ->where('user_id', $userId)
            ->where('date', '>=', $startDate)
            ->orderBy('date')
            ->get();

        $score = BurnoutScore::where('workspace_id', $workspace)
            ->where('user_id', $userId)
            ->first();

        return response()->json([
            'data' => $metrics,
            'score' => $score,
        ]);
    }

    public function refresh(Request $request, string $workspace): JsonResponse
    {
        BurnoutDetector::dispatch($workspace);

        return response()->json(['message' => 'Burnout analysis queued']);
    }
}
