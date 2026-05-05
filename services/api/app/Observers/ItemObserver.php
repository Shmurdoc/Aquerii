<?php

namespace App\Observers;

use App\Models\Item;
use App\Jobs\UpdateMeilisearchIndex;
use App\Jobs\EvaluateAutomationTriggers;
use App\Jobs\UpdateClickHouseAnalytics;
use App\Jobs\UpdateAIEmbedding;

class ItemObserver
{
    public function created(Item $item): void
    {
        $this->dispatchJobs($item, 'item.created');
    }

    public function updated(Item $item): void
    {
        $this->dispatchJobs($item, 'item.updated');
    }

    public function deleted(Item $item): void
    {
        UpdateMeilisearchIndex::dispatch($item->id, 'item', 'delete')->onQueue('indexing');
        UpdateClickHouseAnalytics::dispatch('item.deleted', ['item_id' => $item->id, 'workspace_id' => $item->workspace_id])->onQueue('indexing');
    }

    private function dispatchJobs(Item $item, string $eventType): void
    {
        UpdateMeilisearchIndex::dispatch($item->id, 'item', 'upsert')->onQueue('indexing');
        EvaluateAutomationTriggers::dispatch($item->id, $eventType)->onQueue('automations');
        UpdateClickHouseAnalytics::dispatch($eventType, $item->only(['id', 'workspace_id', 'board_id', 'status', 'priority']))->onQueue('indexing');
        UpdateAIEmbedding::dispatch($item->id, 'item')->onQueue('ai');
    }
}
