<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmAutomationRule;
use App\Modules\CRM\Services\CrmAutomationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmAutomationRuleController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $rules = CrmAutomationRule::where('workspace_id', $workspace->id)
            ->when($request->trigger_type, fn ($q, $v) => $q->where('trigger_type', $v))
            ->with('creator:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json(['data' => $rules]);
    }

    public function show(Workspace $workspace, CrmAutomationRule $rule): JsonResponse
    {
        abort_if($rule->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $rule->load('creator:id,name')]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'trigger_type' => 'required|string|in:'.implode(',', CrmAutomationService::TRIGGERS),
            'trigger_config' => 'nullable|array',
            'conditions' => 'nullable|array',
            'actions' => 'required|array',
        ]);

        $data['workspace_id'] = $workspace->id;
        $data['created_by'] = $request->user()->id;

        $rule = CrmAutomationRule::create($data);

        return response()->json(['data' => $rule], 201);
    }

    public function update(Request $request, Workspace $workspace, CrmAutomationRule $rule): JsonResponse
    {
        abort_if($rule->workspace_id !== $workspace->id, 404);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'trigger_type' => 'sometimes|string|in:'.implode(',', CrmAutomationService::TRIGGERS),
            'trigger_config' => 'nullable|array',
            'conditions' => 'nullable|array',
            'actions' => 'sometimes|array',
            'is_active' => 'boolean',
        ]);

        $rule->update($data);

        return response()->json(['data' => $rule->fresh()]);
    }

    public function destroy(Workspace $workspace, CrmAutomationRule $rule): JsonResponse
    {
        abort_if($rule->workspace_id !== $workspace->id, 404);
        $rule->delete();

        return response()->json(['message' => 'Deleted'], 200);
    }
}
