<?php

namespace App\Jobs;

use App\Models\Automation;
use App\Models\Item;
use App\Models\AutomationRun;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

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
        $item = Item::find($this->itemId);
        if (!$item) return;

        $automations = Automation::where('workspace_id', $item->workspace_id)
            ->where('board_id', $item->board_id)
            ->where('trigger_type', $this->eventType)
            ->where('is_active', true)
            ->get();

        foreach ($automations as $automation) {
            $run = AutomationRun::create([
                'automation_id'        => $automation->id,
                'workspace_id'         => $automation->workspace_id,
                'triggered_by_item_id' => $item->id,
                'status'               => 'pending',
                'started_at'           => now(),
            ]);
            // TODO: dispatch individual action execution jobs
            $run->update(['status' => 'completed', 'completed_at' => now()]);
            $automation->increment('run_count');
            $automation->update(['last_run_at' => now()]);
        }
    }
}
