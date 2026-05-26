<?php

namespace App\Core\Observers;

use App\Core\Jobs\UpdateMeilisearchIndex;
use App\Core\Models\Board;

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
