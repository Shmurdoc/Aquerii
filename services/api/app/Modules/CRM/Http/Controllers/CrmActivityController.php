<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmActivity;
use App\Modules\CRM\Models\CrmDeal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmActivityController extends Controller
{
    public function index(Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        $activities = CrmActivity::where('deal_id', $deal->id)
            ->with('creator')
            ->orderBy('activity_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $activities]);
    }

    public function store(Request $request, Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'type' => 'required|string|in:call,email,note,meeting',
            'subject' => 'sometimes|nullable|string|max:255',
            'description' => 'sometimes|nullable|string',
            'contact_id' => 'sometimes|nullable|uuid|exists:crm_contacts,id',
            'activity_date' => 'sometimes|nullable|date',
        ]);

        $activity = CrmActivity::create([
            'workspace_id' => $workspace->id,
            'deal_id' => $deal->id,
            'contact_id' => $validated['contact_id'] ?? null,
            'type' => $validated['type'],
            'subject' => $validated['subject'] ?? null,
            'description' => $validated['description'] ?? null,
            'activity_date' => $validated['activity_date'] ?? now(),
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $activity->load('creator')], 201);
    }

    public function update(Request $request, Workspace $workspace, CrmDeal $deal, CrmActivity $activity): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);
        abort_if($activity->deal_id !== $deal->id, 404);

        $validated = $request->validate([
            'type' => 'sometimes|string|in:call,email,note,meeting',
            'subject' => 'sometimes|nullable|string|max:255',
            'description' => 'sometimes|nullable|string',
            'contact_id' => 'sometimes|nullable|uuid|exists:crm_contacts,id',
            'activity_date' => 'sometimes|nullable|date',
        ]);

        $activity->update($validated);

        return response()->json(['data' => $activity->load('creator')]);
    }

    public function destroy(Workspace $workspace, CrmDeal $deal, CrmActivity $activity): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);
        abort_if($activity->deal_id !== $deal->id, 404);

        $activity->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
