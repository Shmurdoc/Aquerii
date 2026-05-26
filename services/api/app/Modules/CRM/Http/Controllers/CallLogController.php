<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmCallLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CallLogController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = CrmCallLog::where('workspace_id', $workspace->id)
            ->with(['contact', 'user']);

        if ($contactId = $request->query('contact_id')) {
            $query->where('contact_id', $contactId);
        }
        if ($dealId = $request->query('deal_id')) {
            $query->where('deal_id', $dealId);
        }
        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }

        return response()->json(['data' => $query->orderByDesc('called_at')->get()]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('create', [CrmCallLog::class, $workspace]);

        $validated = $request->validate([
            'contact_id' => 'required|uuid',
            'deal_id' => 'sometimes|nullable|uuid',
            'call_direction' => 'sometimes|in:inbound,outbound',
            'duration_seconds' => 'sometimes|nullable|integer',
            'notes' => 'sometimes|nullable|string',
            'call_outcome' => 'sometimes|nullable|string',
            'callee_phone' => 'required|string|max:50',
            'recording_url' => 'sometimes|nullable|url',
            'called_at' => 'sometimes|nullable|date',
        ]);

        $log = CrmCallLog::create(array_merge($validated, [
            'workspace_id' => $workspace->id,
            'user_id' => $request->user()->id,
        ]));

        return response()->json(['data' => $log->load(['contact', 'user'])], 201);
    }

    public function show(Workspace $workspace, CrmCallLog $callLog): JsonResponse
    {
        abort_if($callLog->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $callLog->load(['contact', 'user'])]);
    }

    public function destroy(Workspace $workspace, CrmCallLog $callLog): JsonResponse
    {
        abort_if($callLog->workspace_id !== $workspace->id, 404);
        $this->authorize('delete', $callLog);

        $callLog->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
