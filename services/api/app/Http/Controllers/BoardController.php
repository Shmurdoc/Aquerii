<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardGroup;
use App\Models\Workspace;
use App\Services\BoardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardController extends Controller
{
    public function __construct(private BoardService $boardService) {}

    public function index(Request $request, string $workspace): JsonResponse
    {
        $boards = Board::where('workspace_id', $workspace)
            ->whereNull('deleted_at')
            ->orderBy('position')
            ->get();

        return response()->json(['data' => $boards]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'icon'         => 'nullable|string|max:50',
            'color'        => 'nullable|string|max:20',
            'type'         => 'nullable|in:main,private,shareable',
            'default_view' => 'nullable|in:kanban,table,timeline,calendar,chart,map',
        ]);

        $board = $this->boardService->create($workspace, $data, $request->user()->id);

        return response()->json(['data' => $board], 201);
    }

    public function show(Request $request, string $workspace, string $board): JsonResponse
    {
        $board = Board::with(['columns' => fn($q) => $q->orderBy('position'), 'groups' => fn($q) => $q->orderBy('position')])
            ->where('workspace_id', $workspace)
            ->whereNull('deleted_at')
            ->findOrFail($board);

        return response()->json(['data' => $board]);
    }

    public function update(Request $request, string $workspace, string $board): JsonResponse
    {
        $boardModel = Board::where('workspace_id', $workspace)->findOrFail($board);

        $data = $request->validate([
            'name'         => 'sometimes|string|max:255',
            'description'  => 'nullable|string',
            'icon'         => 'nullable|string|max:50',
            'color'        => 'nullable|string|max:20',
            'default_view' => 'nullable|in:kanban,table,timeline,calendar,chart,map',
            'position'     => 'nullable|numeric',
            'settings'     => 'nullable|array',
        ]);

        $boardModel->update($data);

        return response()->json(['data' => $boardModel->fresh()]);
    }

    public function destroy(Request $request, string $workspace, string $board): JsonResponse
    {
        Board::where('workspace_id', $workspace)->findOrFail($board)->delete();
        return response()->json(null, 204);
    }
}
