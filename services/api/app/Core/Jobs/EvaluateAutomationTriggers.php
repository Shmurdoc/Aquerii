<?php

namespace App\Core\Jobs;

use App\Core\Models\Item;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * @deprecated Use ProcessAutomations instead.
 *
 * Kept for backward compatibility with jobs that may still be in the queue.
 * Delegates to ProcessAutomations using the item's workspace_id.
 */
class EvaluateAutomationTriggers implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly string $itemId,
        public readonly string $eventType,
    ) {}

    public function handle(): void
    {
        $item = Item::withTrashed()->find($this->itemId);
        if (! $item) {
            return;
        }

        ProcessAutomations::dispatchSync(
            $item->workspace_id,
            $this->itemId,
            $this->eventType,
        );
    }
}
