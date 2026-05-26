<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardGroup;
use App\Models\Item;
use App\Services\ItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ItemController extends Controller
{
    public function __construct(private ItemService $itemService) {}

    private function resolveBoard(string $workspace, string $boardId): Board
    {
        return Board::where('workspace_id', $workspace)->findOrFail($boardId);
    }

    public function index(Request $request, string $workspace, string $board): JsonResponse
    {
        $this->resolveBoard($workspace, $board);

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
        $this->resolveBoard($workspace, $board);

        $item = Item::with(['assignees', 'comments', 'files', 'subitems'])
            ->where('board_id', $board)
            ->whereNull('deleted_at')
            ->findOrFail($item);

        return response()->json(['data' => $item]);
    }

    public function update(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $this->resolveBoard($workspace, $board);

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
        $this->resolveBoard($workspace, $board);

        $itemModel = Item::where('board_id', $board)->whereNull('deleted_at')->findOrFail($item);
        $this->itemService->delete($itemModel, $request->user()->id);

        return response()->json(null, 204);
    }

    public function activity(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $this->resolveBoard($workspace, $board);

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
        $this->resolveBoard($workspace, $board);

        $subs = Item::where('parent_id', $item)->whereNull('deleted_at')->orderBy('position')->get();

        return response()->json(['data' => $subs]);
    }

    public function duplicate(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $this->resolveBoard($workspace, $board);

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
        $this->resolveBoard($workspace, $board);

        $data = $request->validate([
            'group_id' => 'required|uuid|exists:board_groups,id',
            'position' => 'nullable|numeric',
        ]);

        $itemModel = Item::where('board_id', $board)->whereNull('deleted_at')->findOrFail($item);
        $updated = $this->itemService->update($itemModel, $data, $request->user()->id);

        return response()->json(['data' => $updated]);
    }

    public function storeSubitem(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $this->resolveBoard($workspace, $board);

        $parent = Item::where('board_id', $board)->whereNull('deleted_at')->findOrFail($item);

        $data = $request->validate([
            'title' => 'nullable|string|max:500',
            'column_values' => 'nullable|array',
            'position' => 'nullable|numeric',
        ]);

        $data['parent_id'] = $parent->id;

        $subitem = $this->itemService->create(
            $parent->board,
            $parent->group,
            $data,
            $request->user()->id
        );

        return response()->json(['data' => $subitem->load('assignees')], 201);
    }

    public function addAssignee(Request $request, string $workspace, string $board, string $item): JsonResponse
    {
        $this->resolveBoard($workspace, $board);

        $request->validate(['user_id' => 'required|uuid|exists:users,id']);

        $itemModel = Item::where('board_id', $board)->whereNull('deleted_at')->findOrFail($item);
        $userId = $request->input('user_id');

        // Idempotent — attach only if not already assigned
        if (! $itemModel->assignees()->where('users.id', $userId)->exists()) {
            $itemModel->assignees()->attach($userId, [
                'assigned_by' => $request->user()->id,
                'assigned_at' => now(),
            ]);
        }

        return response()->json(['data' => $itemModel->load('assignees')]);
    }

    public function removeAssignee(Request $request, string $workspace, string $board, string $item, string $userId): JsonResponse
    {
        $this->resolveBoard($workspace, $board);

        $itemModel = Item::where('board_id', $board)->whereNull('deleted_at')->findOrFail($item);
        $itemModel->assignees()->detach($userId);

        return response()->json(null, 204);
    }
}
