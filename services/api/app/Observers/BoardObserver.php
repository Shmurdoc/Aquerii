<?php

namespace App\Observers;

use App\Models\Board;
use App\Jobs\UpdateMeilisearchIndex;

class BoardObserver
{
    public function created(Board $board): void
    {
        UpdateMeilisearchIndex::dispatch($board->id, 'board', 'upsert')->onQueue('indexing');
    }

    public function updated(Board $board): void
    {
        UpdateMeilisearchIndex::dispatch($board->id, 'board', 'upsert')->onQueue('indexing');
    }
}
