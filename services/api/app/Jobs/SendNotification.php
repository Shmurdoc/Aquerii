<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

/**
 * Sends an in-app notification AND broadcasts a realtime event.
 * Queue: notifications
 */
class SendNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 30;

    public function __construct(
        public readonly string  $workspaceId,
        public readonly string  $userId,
        public readonly string  $type,
        public readonly string  $title,
        public readonly ?string $body        = null,
        public readonly ?string $entityType  = null,
        public readonly ?string $entityId    = null,
    ) {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        DB::transaction(function () {
            $id = DB::table('notifications')->insertGetId([
                'id'          => \Illuminate\Support\Str::uuid(),
                'workspace_id'=> $this->workspaceId,
                'user_id'     => $this->userId,
                'type'        => $this->type,
                'title'       => $this->title,
                'body'        => $this->body,
                'entity_type' => $this->entityType,
                'entity_id'   => $this->entityId,
                'created_at'  => now(),
            ]);

            // Publish to Redis so the realtime service can push to user's socket
            $redis = app('redis');
            $redis->publish('aquerii:realtime', json_encode([
                'room'    => "user:{$this->userId}",
                'type'    => 'notification.new',
                'payload' => [
                    'id'          => $id,
                    'type'        => $this->type,
                    'title'       => $this->title,
                    'body'        => $this->body,
                    'entity_type' => $this->entityType,
                    'entity_id'   => $this->entityId,
                ],
            ]));
        });
    }
}
