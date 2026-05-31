<?php

namespace App\Core\Http\Controllers;

use App\Core\Models\Board;
use App\Core\Models\BoardGroup;
use App\Core\Models\Item;
use App\Core\Services\ItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ItemController extends Controller
{
    public function __construct(private ItemService $itemService) {}

    public function index(Request $request, string $workspace, string $board): JsonResponse
    {
        $query = Item::with(['assignees:id,name,avatar_url', 'subitems:id,title,status,group_id'])
            ->where('board_id', $board)
            ->whereNull('parent_id')
            ->whereNull('deleted_at')
            ->orderBy('position');

        // Filter by group
        if ($request->has('group_id')) {
            $query->where('group_id', $request->input('group_id'));
        }

        // Filter by assignee
        if ($request->has('assignee_id')) {
            $query->whereHas('assignees', fn ($q) => $q->where('users.id', $request->input('assignee_id')));
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        // Due date range
        if ($request->has('due_before')) {
            $query->where('due_date', '<=', $request->input('due_before'));
        }

        $items = $query->paginate($request->input('per_page', 50));

        return response()->json([
            'data' => $items->items(),
            'meta' => [
                'total' => $items->total(),
                'per_page' => $items->perPage(),
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
            ],
        ]);
    }

    public function store(Request $request, string $workspace, string $board): JsonResponse
    {
        $boardModel = Board::where('workspace_id', $workspace)->findOrFail($board);

        $data = $request->validate([
            'group_id' => 'required|uuid|exists:board_groups,id',
            'title' => 'nullable|string|max:500',
            'column_values' => 'nullable|array',
            'position' => 'nullable|numeric',
            'parent_id' => 'nullable|uuid|exists:items,id',
        ]);

        $group = BoardGroup::where('board_id', $board)->findOrFail($data['group_id']);
        $item = $this->itemService->create($boardModel, $group, $data, $request->user()->id);

        return response()->json(['data' => $item->load('assignees')], 201);
    }

    public function show(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $item = Item::with(['assignees', 'comments', 'files', 'subitems'])
            ->where('board_id', $board)
            ->whereNull('deleted_at')
            ->findOrFail($item);

        return response()->json(['data' => $item]);
    }

    public function update(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $itemModel = Item::where('board_id', $board)->whereNull('deleted_at')->findOrFail($item);

        $data = $request->validate([
            'title' => 'sometimes|string|max:500',
            'description' => 'nullable|array',
            'status' => 'nullable|string|max:100',
            'priority' => 'nullable|in:critical,high,medium,low',
            'due_date' => 'nullable|date',
            'column_values' => 'nullable|array',
            'group_id' => 'nullable|uuid|exists:board_groups,id',
            'position' => 'nullable|numeric',
            'estimated_hours' => 'nullable|numeric|min:0',
            'expected_version' => 'nullable|integer',
        ]);

        $expectedVersion = $data['expected_version'] ?? null;
        unset($data['expected_version']);

        $updated = $this->itemService->update($itemModel, $data, $request->user()->id, $expectedVersion);

        return response()->json(['data' => $updated]);
    }

    public function destroy(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $itemModel = Item::where('board_id', $board)->whereNull('deleted_at')->findOrFail($item);
        $this->itemService->delete($itemModel, $request->user()->id);

        return response()->json(null, 204);
    }

    public function activity(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $log = DB::table('activity_log')
            ->where('entity_type', 'item')
            ->where('entity_id', $item)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json(['data' => $log]);
    }

    public function subitems(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $subs = Item::where('parent_id', $item)->whereNull('deleted_at')->orderBy('position')->get();

        return response()->json(['data' => $subs]);
    }

    public function duplicate(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $original = Item::where('board_id', $board)->whereNull('deleted_at')->findOrFail($item);

        $copy = $this->itemService->create(
            $original->board,
            $original->group,
            ['title' => $original->title.' (Copy)', 'column_values' => $original->column_values],
            $request->user()->id
        );

        return response()->json(['data' => $copy], 201);
    }

    public function move(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $data = $request->validate([
            'group_id' => 'required|uuid|exists:board_groups,id',
            'position' => 'nullable|numeric',
        ]);

        $itemModel = Item::where('board_id', $board)->whereNull('deleted_at')->findOrFail($item);
        $updated = $this->itemService->update($itemModel, $data, $request->user()->id);

        return response()->json(['data' => $updated]);
    }

    // POST /workspaces/{workspace}/boards/{board}/items/{item}/assignees
    public function addAssignee(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $data = $request->validate(['user_id' => 'required|uuid|exists:users,id']);
        $itemModel = Item::where('board_id', $board)->whereNull('deleted_at')->findOrFail($item);

        // Idempotent: skip if already assigned
        if (! $itemModel->assignees()->where('users.id', $data['user_id'])->exists()) {
            $itemModel->assignees()->attach($data['user_id'], [
                'assigned_by' => $request->user()->id,
                'assigned_at' => now(),
            ]);

            $this->itemService->logAssigneeEvent($itemModel, $data['user_id'], 'assignee.added', $request->user()->id);
        }

        return response()->json(['data' => $itemModel->load('assignees:id,name,avatar_url')]);
    }

    // DELETE /workspaces/{workspace}/boards/{board}/items/{item}/assignees/{userId}
    public function removeAssignee(Request $request, string $workspace, string $board, string $item, string $userId): JsonResponse
    {
        $itemModel = Item::where('board_id', $board)->whereNull('deleted_at')->findOrFail($item);
        $itemModel->assignees()->detach($userId);

        $this->itemService->logAssigneeEvent($itemModel, $userId, 'assignee.removed', $request->user()->id);

        return response()->json(null, 204);
    }

    /**
     * My Day / Calendar — items with due_dates across all boards.
     * ?scope=my (default) → assigned to current user or unassigned.
     * ?scope=all         → every item with a due_date in the workspace.
     * Ordered by due_date ascending.
     */
    public function myDay(Request $request, string $workspace): JsonResponse
    {
        $scope = $request->query('scope', 'my');
        $userId = $request->user()->id;

        $query = Item::with(['board:id,name,color', 'assignees:id'])
            ->whereNull('parent_id')
            ->whereNull('deleted_at')
            ->whereNotNull('due_date')
            ->whereHas('board', fn ($q) => $q->where('workspace_id', $workspace))
            ->orderBy('due_date')
            ->orderBy('position')
            ->limit($scope === 'all' ? 500 : 100);

        if ($scope === 'my') {
            $query->where(function ($q) use ($userId) {
                $q->whereHas('assignees', fn ($a) => $a->where('users.id', $userId))
                    ->orWhereDoesntHave('assignees');
            });
        }

        $items = $query->get();

        $results = $items->map(fn (Item $item) => [
            'id' => $item->id,
            'title' => $item->title,
            'priority' => $item->priority,
            'due_date' => $item->due_date?->toDateString(),
            'done' => (bool) $item->status === 'done',
            'board_id' => $item->board_id,
            'board_name' => $item->board?->name ?? 'Untitled Board',
            'board_color' => $item->board?->color,
        ]);

        return response()->json(['data' => $results]);
    }

    public function storeSubitem(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $parent = Item::where('board_id', $board)->whereNull('deleted_at')->findOrFail($item);
        $boardModel = $parent->board;
        $group = $parent->group;

        $data = $request->validate([
            'title' => 'nullable|string|max:500',
            'column_values' => 'nullable|array',
        ]);

        $data['parent_id'] = $parent->id;

        $subitem = $this->itemService->create($boardModel, $group, $data, $request->user()->id);

        return response()->json(['data' => $subitem], 201);
    }

    // GET /workspaces/{workspace}/items?search=...
    // Flat cross-board item listing (used for CRM deal linking).
    public function indexFlat(Request $request, string $workspace): JsonResponse
    {
        $query = Item::whereHas('board', fn ($q) => $q->where('workspace_id', $workspace))
            ->whereNull('parent_id')
            ->whereNull('deleted_at')
            ->select('id', 'title', 'board_id', 'status', 'created_at');

        if ($search = $request->query('search')) {
            $query->where('title', 'ilike', "%{$this->escapeLike($search)}%");
        }

        $items = $query->orderBy('updated_at', 'desc')->limit(50)->get();

        return response()->json(['data' => $items]);
    }
}
