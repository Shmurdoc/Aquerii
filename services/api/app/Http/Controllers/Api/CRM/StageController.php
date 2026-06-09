<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Models\CrmPipeline;
use App\Models\CrmPipelineStage;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StageController extends Controller
{
    public function index(Workspace $workspace, CrmPipeline $pipeline): JsonResponse
    {
        abort_if($pipeline->workspace_id !== $workspace->id, 404);

        $stages = CrmPipelineStage::where('pipeline_id', $pipeline->id)
            ->orderBy('position')
            ->get();

        return response()->json(['data' => $stages]);
    }

    public function store(Request $request, Workspace $workspace, CrmPipeline $pipeline): JsonResponse
    {
        abort_if($pipeline->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'name'            => 'required|string|max:100',
            'color'           => 'sometimes|string|max:20',
            'win_probability' => 'sometimes|integer|min:0|max:100',
        ]);

        $maxPos = CrmPipelineStage::where('pipeline_id', $pipeline->id)->max('position') ?? 0;

        $stage = CrmPipelineStage::create([
            'pipeline_id'     => $pipeline->id,
            'workspace_id'    => $workspace->id,
            'name'            => $validated['name'],
            'color'           => $validated['color'] ?? '#6366f1',
            'position'        => $maxPos + 65536,
            'win_probability' => $validated['win_probability'] ?? 0,
        ]);

        return response()->json(['data' => $stage], 201);
    }

    public function update(Request $request, Workspace $workspace, CrmPipeline $pipeline, CrmPipelineStage $stage): JsonResponse
    {
        abort_if($pipeline->workspace_id !== $workspace->id, 404);
        abort_if($stage->pipeline_id !== $pipeline->id, 404);

        $validated = $request->validate([
            'name'            => 'sometimes|string|max:100',
            'color'           => 'sometimes|string|max:20',
            'win_probability' => 'sometimes|integer|min:0|max:100',
        ]);

        $stage->update($validated);

        return response()->json(['data' => $stage]);
    }

    public function destroy(Workspace $workspace, CrmPipeline $pipeline, CrmPipelineStage $stage): JsonResponse
    {
        abort_if($pipeline->workspace_id !== $workspace->id, 404);
        abort_if($stage->pipeline_id !== $pipeline->id, 404);

        $stage->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function reorder(Request $request, Workspace $workspace, CrmPipeline $pipeline): JsonResponse
    {
        abort_if($pipeline->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'stages'           => 'required|array',
            'stages.*.id'      => 'required|uuid',
            'stages.*.position'=> 'required|numeric',
        ]);

        foreach ($validated['stages'] as $item) {
            CrmPipelineStage::where('id', $item['id'])
                ->where('pipeline_id', $pipeline->id)
                ->update(['position' => $item['position']]);
        }

        return response()->json(['data' => ['reordered' => true]]);
    }
}
