<?php

namespace App\Http\Controllers\Api;

use App\Core\Models\Item;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarItemController extends Controller
{
    /**
     * GET /workspaces/{workspace}/calendar-items
     *
     * Query params:
     *   from=YYYY-MM-DD (required)
     *   to=YYYY-MM-DD   (required)
     *   entity_type=string (optional, currently only 'task' is supported)
     *
     * Returns all items in the workspace whose `due_date` falls within the
     * supplied [from, to] window. Capped at 1000 results.
     */
    public function index(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
            'entity_type' => 'nullable|string|max:64',
        ]);

        $entityType = $data['entity_type'] ?? null;

        // Only board items ('task') are surfaced today. Other entity types
        // return an empty result set until they are wired in.
        if ($entityType !== null && $entityType !== 'task') {
            return response()->json(['data' => []]);
        }

        $items = Item::with(['board:id,name,color'])
            ->whereNull('parent_id')
            ->whereNull('deleted_at')
            ->whereNotNull('due_date')
            ->whereHas('board', fn ($q) => $q->where('workspace_id', $workspace))
            ->whereDate('due_date', '>=', $data['from'])
            ->whereDate('due_date', '<=', $data['to'])
            ->orderBy('due_date')
            ->orderBy('position')
            ->limit(1000)
            ->get();

        $results = $items->map(fn (Item $item) => [
            'id' => $item->id,
            'type' => 'task',
            'title' => $item->title,
            'due_date' => $item->due_date?->toDateString(),
            'workspace_id' => $workspace,
            'link' => "/boards/{$item->board_id}/items/{$item->id}",
            'priority' => $item->priority,
            'done' => $item->status === 'done',
            'board_id' => $item->board_id,
            'board_name' => $item->board?->name ?? 'Untitled Board',
            'board_color' => $item->board?->color,
        ]);

        return response()->json(['data' => $results]);
    }
}
