<?php

namespace App\Services;

use App\Models\Board;
use App\Models\BoardGroup;
use Illuminate\Support\Facades\DB;

class BoardService
{
    /**
     * Create a board with a default group and standard columns.
     */
    public function create(string $workspaceId, array $data, string $userId): Board
    {
        return DB::transaction(function () use ($workspaceId, $data, $userId) {
            $board = Board::create([
                'workspace_id' => $workspaceId,
                'name'         => $data['name'],
                'description'  => $data['description'] ?? null,
                'icon'         => $data['icon'] ?? null,
                'color'        => $data['color'] ?? '#6366f1',
                'type'         => $data['type'] ?? 'main',
                'default_view' => $data['default_view'] ?? 'kanban',
                'position'     => $this->nextPosition($workspaceId),
                'created_by'   => $userId,
            ]);

            // Default group
            BoardGroup::create([
                'workspace_id' => $workspaceId,
                'board_id'     => $board->id,
                'name'         => 'Group 1',
                'color'        => '#6366f1',
                'position'     => 65536,
            ]);

            // Default columns
            $defaultColumns = [
                ['name' => 'Status',    'type' => 'status',  'position' => 65536,  'is_system' => true],
                ['name' => 'Assignee',  'type' => 'people',  'position' => 131072, 'is_system' => true],
                ['name' => 'Due Date',  'type' => 'date',    'position' => 196608, 'is_system' => true],
                ['name' => 'Priority',  'type' => 'priority','position' => 262144, 'is_system' => true],
            ];

            foreach ($defaultColumns as $col) {
                $board->columns()->create(array_merge($col, ['workspace_id' => $workspaceId]));
            }

            return $board->load(['columns', 'groups']);
        });
    }

    private function nextPosition(string $workspaceId): float
    {
        $max = Board::where('workspace_id', $workspaceId)->whereNull('deleted_at')->max('position');
        return ($max ?? 0) + 65536;
    }
}
