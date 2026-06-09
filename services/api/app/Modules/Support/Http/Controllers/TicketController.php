<?php

namespace App\Modules\Support\Http\Controllers;

use App\Modules\Support\Events\TicketResolved;
use App\Modules\Support\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TicketController extends Controller
{
    public function index(Request $request, string $workspace): JsonResponse
    {
        $tickets = Ticket::where('workspace_id', $workspace)
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->priority, fn ($q, $v) => $q->where('priority', $v))
            ->when($request->assigned_to, fn ($q, $v) => $q->where('assigned_to', $v))
            ->with(['contact:id,name,email', 'assignee:id,name', 'slaPolicy:id,name'])
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json(['data' => $tickets]);
    }

    public function show(string $workspace, string $ticket): JsonResponse
    {
        $ticket = Ticket::where('workspace_id', $workspace)
            ->with([
                'messages.user:id,name',
                'contact:id,name,email',
                'assignee:id,name',
                'slaPolicy',
            ])->findOrFail($ticket);

        return response()->json(['data' => $ticket]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'contact_id' => 'nullable|exists:crm_contacts,id',
            'subject' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|string|in:low,normal,high,critical',
            'channel' => 'nullable|string|max:50',
            'source' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
            'custom_fields' => 'nullable|array',
        ]);

        $data['workspace_id'] = $workspace;

        $ticket = Ticket::create($data);

        return response()->json(['data' => $ticket], 201);
    }

    public function update(Request $request, string $workspace, string $ticket): JsonResponse
    {
        $ticket = Ticket::where('workspace_id', $workspace)->findOrFail($ticket);

        $data = $request->validate([
            'subject' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|string|in:open,pending,resolved,closed',
            'priority' => 'sometimes|string|in:low,normal,high,critical',
            'assigned_to' => 'nullable|exists:users,id',
            'tags' => 'nullable|array',
            'custom_fields' => 'nullable|array',
            'resolution_summary' => 'nullable|string',
        ]);

        if (isset($data['status']) && $data['status'] === 'closed') {
            $data['closed_at'] = now();
        }

        $ticket->update($data);

        // Dispatch KB auto-capture when ticket is resolved
        if (isset($data['status']) && $data['status'] === 'resolved') {
            TicketResolved::dispatch($ticket->fresh());
        }

        return response()->json(['data' => $ticket->fresh()]);
    }

    public function destroy(string $workspace, string $ticket): JsonResponse
    {
        $ticket = Ticket::where('workspace_id', $workspace)->findOrFail($ticket);
        $ticket->delete();

        return response()->json(['message' => 'Deleted'], 200);
    }

    public function assign(Request $request, string $workspace, string $ticket): JsonResponse
    {
        $data = $request->validate(['assigned_to' => 'required|exists:users,id']);

        $ticket = Ticket::where('workspace_id', $workspace)->findOrFail($ticket);
        $ticket->update(['assigned_to' => $data['assigned_to']]);

        return response()->json(['data' => $ticket->fresh()]);
    }
}
