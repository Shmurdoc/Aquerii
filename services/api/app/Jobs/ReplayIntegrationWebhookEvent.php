<?php

namespace App\Jobs;

use App\Core\Services\IntegrationWebhookReplayService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class ReplayIntegrationWebhookEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public readonly string $eventId) {}

    public function handle(IntegrationWebhookReplayService $replayService): void
    {
        $result = $replayService->replayByEventId($this->eventId);

        if (($result['processed'] ?? false) === true) {
            DB::table('integration_webhook_events')
                ->where('id', $this->eventId)
                ->update([
                    'status' => 'processed',
                    'processed_at' => now(),
                    'next_retry_at' => null,
                    'last_error' => null,
                    'updated_at' => now(),
                ]);

            return;
        }

        DB::table('integration_webhook_events')
            ->where('id', $this->eventId)
            ->update([
                'status' => 'failed',
                'next_retry_at' => now()->addMinutes(5),
                'last_error' => (string) ($result['reason'] ?? 'replay_failed'),
                'updated_at' => now(),
            ]);
    }
}
