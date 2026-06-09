<?php

namespace App\Observers;

use App\Jobs\UpdateMeilisearchIndex;
use App\Models\Comment;

class CommentObserver
{
    public function created(Comment $comment): void
    {
        UpdateMeilisearchIndex::dispatch($comment->id, 'comment', 'upsert')->onQueue('indexing');
    }
}
