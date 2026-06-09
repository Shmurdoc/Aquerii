<?php

namespace App\Observers;

use App\Jobs\UpdateAIEmbedding;
use App\Models\Document;

class DocumentObserver
{
    public function updated(Document $document): void
    {
        UpdateAIEmbedding::dispatch($document->id, 'document')->onQueue('ai');
    }
}
