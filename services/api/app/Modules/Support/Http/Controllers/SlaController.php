<?php

namespace App\Modules\Support\Http\Controllers;

use App\Modules\Support\Models\SlaBreach;
use App\Modules\Support\Models\TicketSla;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class SlaController extends Controller
{
    public function index(string $workspace): JsonResponse
    {
        $slas = TicketSla::where('workspace_id', $workspace)->get();
        return response()->json(['data' => $slas]);
    }

    public function show(string $workspace, string $sla): JsonResponse
    {
        $sla = TicketSla::where('workspace_id', $workspace)->findOrFail($sla);
        return response()->json(['data' => $sla]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'name'                 => 'required|string|max:255',
            'description'          => 'nullable|string',
            'priority'             => 'required|string|in:low,normal,high,critical',
            'first_response_hours' => 'required|integer|min:1',
            'resolution_hours'     => 'required|integer|min:1',
            'escalation_user_id'   => 'nullable|exists:users,id',
            'is_active'            => 'boolean',
        ]);

        $data['workspace_id'] = $workspace;
        $sla = TicketSla::create($data);

        return response()->json(['data' => $sla], 201);
    }

    public function update(Request $request, string $workspace, string $sla): JsonResponse
    {
        $sla = TicketSla::where('workspace_id', $workspace)->findOrFail($sla);

        $data = $request->validate([
            'name'                 => 'sometimes|string|max:255',
            'description'          => 'nullable|string',
            'priority'             => 'sometimes|string|in:low,normal,high,critical',
            'first_response_hours' => 'sometimes|integer|min:1',
            'resolution_hours'     => 'sometimes|integer|min:1',
            'escalation_user_id'   => 'nullable|exists:users,id',
            'is_active'            => 'boolean',
        ]);

        $sla->update($data);

        return response()->json(['data' => $sla->fresh()]);
    }

    public function destroy(string $workspace, string $sla): JsonResponse
    {
        TicketSla::where('workspace_id', $workspace)->findOrFail($sla)->delete();
        return response()->json(['message' => 'Deleted'], 200);
    }

    public function breaches(string $workspace): JsonResponse
    {
        $breaches = SlaBreach::whereIn('ticket_id', function ($q) use ($workspace) {
            $q->select('id')->from('support_tickets')->where('workspace_id', $workspace);
        })->with(['ticket:id,subject,status', 'slaPolicy:id,name'])
            ->orderBy('breached_at', 'desc')
            ->paginate(25);

        return response()->json(['data' => $breaches]);
    }

    public function compliance(string $workspace): JsonResponse
    {
        $total = \App\Modules\Support\Models\Ticket::where('workspace_id', $workspace)->count();
        $breached = \App\Modules\Support\Models\Ticket::where('workspace_id', $workspace)
            ->whereNotNull('sla_breached_at')->count();

        return response()->json(['data' => [
            'total_tickets' => $total,
            'breached'      => $breached,
            'compliance_pct' => $total > 0 ? round((1 - $breached / $total) * 100, 1) : 100,
        ]]);
    }
}
