<?php

namespace App\Core\Jobs;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Sends an in-app notification AND broadcasts a realtime event.
 * Queue: notifications
 */
class SendNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 30;

    public function __construct(
        public readonly string $workspaceId,
        public readonly string $userId,
        public readonly string $type,
        public readonly string $title,
        public readonly ?string $body = null,
        public readonly ?string $entityType = null,
        public readonly ?string $entityId = null,
    ) {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        DB::transaction(function () {
            $id = DB::table('notifications')->insertGetId([
                'id' => Str::uuid(),
                'workspace_id' => $this->workspaceId,
                'user_id' => $this->userId,
                'type' => $this->type,
                'title' => $this->title,
                'body' => $this->body,
                'entity_type' => $this->entityType,
                'entity_id' => $this->entityId,
                'created_at' => now(),
            ]);

            // Publish to Redis so the realtime service can push to user's socket.
            // Channel: realtime:events — must match EventBroadcaster.ts subscriber.
            // Shape: { room, event_type, payload, sequence } — must match RealtimeEvent interface.
            // Room must match workspace:{id} — the realtime server auto-joins all sockets to this room on connect.
            // Event type must be 'notification' — the frontend useNotifications hook listens for this.
            $redis = app('redis');
            $redis->publish('realtime:events', json_encode([
                'room' => "workspace:{$this->workspaceId}",
                'event_type' => 'notification',
                'sequence' => 0,
                'payload' => [
                    'id' => $id,
                    'type' => $this->type,
                    'data' => [
                        'title' => $this->title,
                        'body' => $this->body,
                        'entity_type' => $this->entityType,
                        'entity_id' => $this->entityId,
                    ],
                    'read_at' => null,
                    'created_at' => now()->toISOString(),
                ],
            ]));
        });
    }
}
