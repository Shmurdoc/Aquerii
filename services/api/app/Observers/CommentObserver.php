<?php

namespace App\Observers;

use App\Models\Comment;
use App\Jobs\UpdateMeilisearchIndex;

class CommentObserver
{
    public function created(Comment $comment): void
    {
        UpdateMeilisearchIndex::dispatch($comment->id, 'comment', 'upsert')->onQueue('indexing');
    }
}
