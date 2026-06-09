<?php

namespace App\Modules\Automation\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Modules\Automation\Models\Automation;
use App\Modules\Automation\Models\AutomationRecommendation;
use App\Modules\Automation\Services\PatternDetector;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function index(Request $request, string $workspace): JsonResponse
    {
        $recommendations = AutomationRecommendation::where('workspace_id', $workspace)
            ->pending()
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $recommendations]);
    }

    public function refresh(Request $request, string $workspace): JsonResponse
    {
        $detector = new PatternDetector;
        $recommendations = $detector->detect($workspace);

        return response()->json([
            'message' => 'Pattern detection complete',
            'count' => count($recommendations),
        ]);
    }

    public function accept(Request $request, string $workspace, string $recommendation): JsonResponse
    {
        $rec = AutomationRecommendation::where('workspace_id', $workspace)
            ->where('id', $recommendation)
            ->where('status', 'pending')
            ->firstOrFail();

        // Create automation from recommendation
        $automation = Automation::create([
            'workspace_id' => $workspace,
            'name' => $rec->title,
            'trigger_type' => $rec->trigger_config['type'] ?? 'item.updated',
            'trigger_config' => $rec->trigger_config,
            'actions' => $rec->actions,
            'is_active' => true,
            'created_by' => $request->user()->id,
        ]);

        $rec->update([
            'status' => 'accepted',
            'automation_id' => $automation->id,
        ]);

        return response()->json(['data' => $rec->fresh()->load('automation')]);
    }

    public function dismiss(Request $request, string $workspace, string $recommendation): JsonResponse
    {
        $rec = AutomationRecommendation::where('workspace_id', $workspace)
            ->where('id', $recommendation)
            ->where('status', 'pending')
            ->firstOrFail();

        $rec->update([
            'status' => 'dismissed',
            'dismissed_at' => now(),
        ]);

        return response()->json(['message' => 'Dismissed']);
    }
}
