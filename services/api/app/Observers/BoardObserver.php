<?php

namespace App\Observers;

use App\Jobs\UpdateMeilisearchIndex;
use App\Models\Board;

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
