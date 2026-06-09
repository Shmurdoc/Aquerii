<?php

namespace App\Observers;

use App\Models\Document;
use App\Jobs\UpdateAIEmbedding;

class DocumentObserver
{
    public function updated(Document $document): void
    {
        UpdateAIEmbedding::dispatch($document->id, 'document')->onQueue('ai');
    }
}
