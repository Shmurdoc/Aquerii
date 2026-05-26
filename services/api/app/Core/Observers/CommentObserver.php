<?php

namespace App\Core\Observers;

use App\Core\Jobs\UpdateMeilisearchIndex;
use App\Core\Models\Comment;

class CommentObserver
{
    public function created(Comment $comment): void
    {
        UpdateMeilisearchIndex::dispatch($comment->id, 'comment', 'upsert')->onQueue('indexing');
    }
}
