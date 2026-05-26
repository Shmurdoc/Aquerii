<?php

namespace App\Modules\Marketing\Http\Controllers;

use App\Modules\Marketing\Models\Campaign;
use App\Modules\Marketing\Models\CampaignAudience;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CampaignController extends Controller
{
    public function index(Request $request, string $workspace): JsonResponse
    {
        $campaigns = Campaign::where('workspace_id', $workspace)
            ->when($request->status, fn($q, $v) => $q->where('status', $v))
            ->when($request->type, fn($q, $v) => $q->where('type', $v))
            ->with('launchedBy:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json(['data' => $campaigns]);
    }

    public function show(string $workspace, string $campaign): JsonResponse
    {
        $campaign = Campaign::where('workspace_id', $workspace)
            ->with(['launchedBy:id,name', 'audience.contact:id,name,email'])
            ->findOrFail($campaign);

        return response()->json(['data' => $campaign]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'type'        => 'sometimes|string|in:email,sms,social,ads',
            'channel'     => 'nullable|string|max:100',
            'budget'      => 'nullable|numeric|min:0',
            'goal'        => 'nullable|string',
            'tags'        => 'nullable|array',
            'target_audience' => 'nullable|array',
            'metadata'    => 'nullable|array',
        ]);

        $data['workspace_id'] = $workspace;
        $data['status'] = 'draft';
        $campaign = Campaign::create($data);

        return response()->json(['data' => $campaign], 201);
    }

    public function update(Request $request, string $workspace, string $campaign): JsonResponse
    {
        $campaign = Campaign::where('workspace_id', $workspace)->findOrFail($campaign);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type'        => 'sometimes|string|in:email,sms,social,ads',
            'channel'     => 'nullable|string|max:100',
            'budget'      => 'nullable|numeric|min:0',
            'goal'        => 'nullable|string',
            'tags'        => 'nullable|array',
            'target_audience' => 'nullable|array',
            'metadata'    => 'nullable|array',
        ]);

        $campaign->update($data);

        return response()->json(['data' => $campaign->fresh()]);
    }

    public function destroy(string $workspace, string $campaign): JsonResponse
    {
        Campaign::where('workspace_id', $workspace)->findOrFail($campaign)->delete();
        return response()->json(['message' => 'Deleted'], 200);
    }

    public function launch(Request $request, string $workspace, string $campaign): JsonResponse
    {
        $campaign = Campaign::where('workspace_id', $workspace)->findOrFail($campaign);

        if ($campaign->status !== 'draft') {
            return response()->json(['message' => 'Only draft campaigns can be launched'], 422);
        }

        $data = $request->validate([
            'contact_ids' => 'required|array',
            'contact_ids.*' => 'string|exists:crm_contacts,id',
        ]);

        $campaign->update([
            'status'      => 'active',
            'launched_by' => $request->user()?->id,
            'started_at'  => now(),
        ]);

        $audience = collect($data['contact_ids'])->map(fn($id) => [
            'campaign_id' => $campaign->id,
            'contact_id'  => $id,
            'status'      => 'queued',
            'created_at'  => now(),
            'updated_at'  => now(),
        ])->toArray();

        CampaignAudience::insert($audience);

        return response()->json(['data' => $campaign->fresh()->load('audience')], 200);
    }

    public function stats(string $workspace, string $campaign): JsonResponse
    {
        $campaign = Campaign::where('workspace_id', $workspace)->findOrFail($campaign);

        return response()->json(['data' => [
            'sent'     => $campaign->sent_count,
            'opened'   => $campaign->opened_count,
            'clicked'  => $campaign->clicked_count,
            'converted' => $campaign->converted_count,
            'budget'   => $campaign->budget,
            'spend'    => $campaign->actual_spend,
            'roi'      => $campaign->budget && $campaign->budget > 0
                ? round((($campaign->converted_count * 100) - $campaign->actual_spend) / $campaign->budget * 100, 1) : null,
        ]]);
    }
}
