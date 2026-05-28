<?php

namespace App\Jobs;

use App\Models\Item;
use App\Services\AutomationEngine;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Evaluates all active automations for a given item + trigger.
 * Dispatched by ItemService after every write.
 * Queue: automations
 */
class ProcessAutomations implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 120;

    public function __construct(
        public readonly string $workspaceId,
        public readonly string $itemId,
        public readonly string $trigger,
        public readonly array  $context = [],
    ) {
        $this->onQueue('automations');
    }

    public function handle(AutomationEngine $engine): void
    {
        $item = Item::withTrashed()->find($this->itemId);
        if (!$item) return;

        $engine->evaluate($this->workspaceId, $item, $this->trigger, $this->context);
    }

    public function failed(\Throwable $e): void
    {
        \Log::error('ProcessAutomations failed', [
            'workspace_id' => $this->workspaceId,
            'item_id'      => $this->itemId,
            'trigger'      => $this->trigger,
            'error'        => $e->getMessage(),
        ]);
    }
}
