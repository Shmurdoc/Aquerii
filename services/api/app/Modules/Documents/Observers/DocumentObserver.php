<?php

namespace App\Modules\Documents\Observers;

use App\Core\Jobs\UpdateAIEmbedding;
use App\Modules\Documents\Models\Document;

class DocumentObserver
{
    public function updated(Document $document): void
    {
        UpdateAIEmbedding::dispatch($document->id, 'document')->onQueue('ai');
    }
}
