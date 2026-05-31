<?php

namespace App\Modules\Delegation\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Board;
use App\Core\Models\Item;
use App\Core\Models\Workspace;
use App\Modules\Delegation\Models\Delegation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DelegationController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = Delegation::where('workspace_id', $workspace->id)
            ->with(['fromUser', 'toUser', 'item:id,title']);

        if ($direction = $request->query('direction')) {
            if ($direction === 'sent') {
                $query->where('from_user_id', $request->user()->id);
            } elseif ($direction === 'received') {
                $query->where('to_user_id', $request->user()->id);
            }
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $delegations = $query->orderBy('created_at', 'desc')
            ->paginate($request->query('per_page', 50));

        return response()->json($delegations);
    }

    public function store(Request $request, Workspace $workspace, Board $board, Item $item): JsonResponse
    {
        abort_if($item->workspace_id !== $workspace->id || $item->board_id !== $board->id, 404);

        $validated = $request->validate([
            'to_user_id' => 'required|string|exists:users,id',
            'reason' => 'required|string|max:500',
            'expires_at' => 'nullable|date|after:now',
            'notes' => 'nullable|string',
        ]);

        abort_if($validated['to_user_id'] === $request->user()->id, 422, 'Cannot delegate to yourself');
        abort_if($item->created_by !== $request->user()->id, 403, 'Only the task owner can delegate');

        $existing = Delegation::where('item_id', $item->id)
            ->where('status', 'active')
            ->first();

        if ($existing) {
            return response()->json(['data' => $existing, 'message' => 'Task is already delegated'], 200);
        }

        $delegation = Delegation::create([
            'workspace_id' => $workspace->id,
            'item_id' => $item->id,
            'from_user_id' => $request->user()->id,
            'to_user_id' => $validated['to_user_id'],
            'reason' => $validated['reason'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'active',
            'delegated_at' => now(),
            'expires_at' => $validated['expires_at'] ?? null,
        ]);

        $item->update(['created_by' => $validated['to_user_id']]);

        $delegation->load(['fromUser', 'toUser', 'item:id,title']);

        return response()->json(['data' => $delegation], 201);
    }

    public function revoke(Request $request, Workspace $workspace, Board $board, Item $item): JsonResponse
    {
        abort_if($item->workspace_id !== $workspace->id || $item->board_id !== $board->id, 404);

        $delegation = Delegation::where('item_id', $item->id)
            ->where('status', 'active')
            ->firstOrFail();

        abort_if($delegation->from_user_id !== $request->user()->id, 403, 'Only the delegator can revoke');

        $delegation->update([
            'status' => 'revoked',
            'returned_at' => now(),
        ]);

        $item->update(['created_by' => $delegation->from_user_id]);

        return response()->json(['data' => $delegation->fresh()->load(['fromUser', 'toUser', 'item:id,title'])]);
    }

    public function accept(Request $request, Workspace $workspace, Board $board, Item $item): JsonResponse
    {
        abort_if($item->workspace_id !== $workspace->id || $item->board_id !== $board->id, 404);

        $delegation = Delegation::where('item_id', $item->id)
            ->where('status', 'active')
            ->firstOrFail();

        abort_if($delegation->to_user_id !== $request->user()->id, 403, 'Only the delegate can accept');

        $delegation->update([
            'accepted_at' => now(),
            'accepted_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $delegation->fresh()->load(['fromUser', 'toUser', 'item:id,title'])]);
    }
}
