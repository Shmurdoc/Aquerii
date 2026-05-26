<?php

namespace App\Core\Jobs;

use App\Core\Models\Board;
use App\Core\Models\Comment;
use App\Core\Models\Item;
use App\Modules\Documents\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

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
        // No-op when Scout is disabled (e.g. testing or null driver)
        if (config('scout.driver') === 'null' || config('scout.driver') === null) {
            return;
        }

        $modelClass = match ($this->modelType) {
            'item' => Item::class,
            'document' => Document::class,
            'comment' => Comment::class,
            'board' => Board::class,
            default => throw new \InvalidArgumentException("Unknown model type: {$this->modelType}"),
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
