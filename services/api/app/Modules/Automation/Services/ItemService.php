<?php

namespace App\Modules\Automation\Services;

use App\Core\Models\Board;
use App\Core\Models\BoardGroup;
use App\Core\Models\Item;

class ItemService
{
    public function create(Board $board, BoardGroup $group, array $data, ?string $createdBy): Item
    {
        $position = Item::where('group_id', $group->id)->whereNull('deleted_at')->max('position') ?? 0;

        return Item::create([
            'workspace_id' => $board->workspace_id,
            'board_id' => $board->id,
            'group_id' => $group->id,
            'parent_id' => $data['parent_id'] ?? null,
            'title' => $data['title'] ?? 'New Item',
            'position' => $position + 65536,
            'column_values' => $data['column_values'] ?? [],
            'created_by' => $createdBy,
        ]);
    }

    public function update(Item $item, array $data, ?string $actorId): Item
    {
        $item->fill($data);
        $item->version = $item->version + 1;
        $item->save();

        return $item->fresh();
    }

    public function logAssigneeEvent(Item $item, string $userId, string $type, string $actorId): void
    {
        // Automation actions don't dispatch realtime events
    }
}
