<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class UpdateMeilisearchIndex implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        public readonly string $modelId,
        public readonly string $modelType,
        public readonly string $operation,
    ) {}

    public function handle(): void
    {
        $modelClass = match ($this->modelType) {
            'item'     => \App\Models\Item::class,
            'document' => \App\Models\Document::class,
            'comment'  => \App\Models\Comment::class,
            'board'    => \App\Models\Board::class,
            default    => throw new \InvalidArgumentException("Unknown model type: {$this->modelType}"),
        };

        if ($this->operation === 'delete') {
            $modelClass::removeFromSearch($this->modelId);
            return;
        }

        $model = $modelClass::find($this->modelId);
        if ($model) {
            $model->searchable();
        }
    }
}
