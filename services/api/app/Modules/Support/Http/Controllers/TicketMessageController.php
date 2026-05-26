<?php

namespace App\Modules\Support\Http\Controllers;

use App\Modules\Support\Models\Ticket;
use App\Modules\Support\Models\TicketMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TicketMessageController extends Controller
{
    public function index(string $workspace, string $ticket): JsonResponse
    {
        Ticket::where('workspace_id', $workspace)->findOrFail($ticket);

        $messages = TicketMessage::where('ticket_id', $ticket)
            ->with('user:id,name')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json(['data' => $messages]);
    }

    public function store(Request $request, string $workspace, string $ticket): JsonResponse
    {
        Ticket::where('workspace_id', $workspace)->findOrFail($ticket);

        $data = $request->validate([
            'body'        => 'required|string',
            'is_internal' => 'boolean',
            'channel'     => 'nullable|string|max:50',
            'attachments' => 'nullable|array',
        ]);

        $data['ticket_id'] = $ticket;
        $data['user_id'] = $request->user()?->id;

        $message = TicketMessage::create($data);

        return response()->json(['data' => $message], 201);
    }

    public function destroy(string $workspace, string $ticket, string $message): JsonResponse
    {
        $msg = TicketMessage::where('ticket_id', $ticket)->findOrFail($message);
        $msg->delete();

        return response()->json(['message' => 'Deleted'], 200);
    }
}
