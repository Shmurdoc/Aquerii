<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UpdateAIEmbedding implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 120;

    public function __construct(
        public readonly string $modelId,
        public readonly string $modelType,
    ) {}

    public function handle(): void
    {
        $aiUrl    = config('services.ai.url', 'http://ai:8002');
        $aiSecret = config('services.ai.secret');

        Http::withHeader('X-Internal-Secret', $aiSecret)
            ->post("{$aiUrl}/internal/index", [
                'model_type' => $this->modelType,
                'model_id'   => $this->modelId,
            ]);
    }
}
