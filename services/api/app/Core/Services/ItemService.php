<?php

namespace App\Core\Services;

use App\Core\Events\ItemUpdated;
use App\Core\Jobs\ProcessAutomations;
use App\Core\Jobs\SendNotification;
use App\Core\Models\Board;
use App\Core\Models\BoardGroup;
use App\Core\Models\Item;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Core write path for items.
 * Rule: PostgreSQL write + realtime_events insert in SAME transaction.
 *       Redis pub/sub publish happens AFTER commit via event listener.
 *       Automation dispatch happens AFTER commit (outside transaction).
 */
class ItemService
{
    public function create(Board $board, BoardGroup $group, array $data, ?string $createdBy): Item
    {
        $item = DB::transaction(function () use ($board, $group, $data, $createdBy) {
            $position = $this->nextPosition($group->id);

            $item = Item::create([
                'workspace_id' => $board->workspace_id,
                'board_id' => $board->id,
                'group_id' => $group->id,
                'parent_id' => $data['parent_id'] ?? null,
                'title' => $data['title'] ?? 'New Item',
                'position' => $position,
                'column_values' => $data['column_values'] ?? [],
                'created_by' => $createdBy,
            ]);

            $this->logRealtimeEvent($board->workspace_id, "board:{$board->id}", 'item.created', [
                'item_id' => $item->id,
                'group_id' => $group->id,
            ], $createdBy);

            return $item;
        });

        ProcessAutomations::dispatch($board->workspace_id, $item->id, 'item.created');

        return $item;
    }

    public function update(Item $item, array $data, ?string $actorId, ?int $expectedVersion = null): Item
    {
        $updated = DB::transaction(function () use ($item, $data, $actorId, $expectedVersion) {
            if ($expectedVersion !== null) {
                $item->assertVersion($expectedVersion);
            }

            $old = $item->getAttributes();
            $item->fill($data);
            $item->version = $item->version + 1;
            $item->save();

            $this->logRealtimeEvent($item->workspace_id, "board:{$item->board_id}", 'item.updated', [
                'item_id' => $item->id,
                'changes' => array_keys($data),
            ], $actorId);

            // Dispatch event for activity log observer (runs after commit)
            event(new ItemUpdated($item, $old, $data, $actorId));

            return $item->fresh();
        });

        ProcessAutomations::dispatch($updated->workspace_id, $updated->id, 'item.updated', ['changes' => array_keys($data)]);

        return $updated;
    }

    public function delete(Item $item, string $actorId): void
    {
        DB::transaction(function () use ($item, $actorId) {
            $item->delete();

            $this->logRealtimeEvent($item->workspace_id, "board:{$item->board_id}", 'item.deleted', [
                'item_id' => $item->id,
                'group_id' => $item->group_id,
            ], $actorId);
        });

        ProcessAutomations::dispatch($item->workspace_id, $item->id, 'item.deleted');
    }

    public function logAssigneeEvent(Item $item, string $userId, string $type, string $actorId): void
    {
        $this->logRealtimeEvent($item->workspace_id, "board:{$item->board_id}", $type, [
            'item_id' => $item->id,
            'user_id' => $userId,
        ], $actorId);

        if ($type === 'assignee.added') {
            SendNotification::dispatch(
                $item->workspace_id,
                $userId,
                'item.assigned',
                'You were assigned to: '.$item->title,
                null,
                'item',
                $item->id
            );

            ProcessAutomations::dispatch($item->workspace_id, $item->id, 'assignee.added', ['user_id' => $userId]);
        }
    }

    private function nextPosition(string $groupId): float
    {
        $max = Item::where('group_id', $groupId)->whereNull('deleted_at')->max('position');

        return ($max ?? 0) + 65536;
    }

    private function logRealtimeEvent(
        string $workspaceId,
        string $room,
        string $type,
        array $payload,
        ?string $actorId
    ): void {
        DB::table('realtime_events')->insert([
            'event_id' => Str::uuid(),
            'workspace_id' => $workspaceId,
            'room' => $room,
            'type' => $type,
            'payload' => json_encode($payload),
            'actor_id' => $actorId,
            'sequence' => 0, // assigned by DB trigger
            'occurred_at' => now(),
        ]);
    }
}
