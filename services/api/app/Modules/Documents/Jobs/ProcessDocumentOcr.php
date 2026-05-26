<?php

namespace App\Modules\Documents\Jobs;

use App\Modules\Documents\Models\ScannedDocument;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessDocumentOcr implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 120;

    public function __construct(
        public readonly ScannedDocument $document,
    ) {}

    public function handle(): void
    {
        $this->document->update(['ocr_status' => 'processing']);

        $aiUrl = config('services.ai.url', 'http://ai:8002');
        $aiSecret = config('services.ai.secret');

        try {
            $fileContent = base64_encode(Storage::disk('s3')->get($this->document->storage_path));

            $response = Http::timeout(120)
                ->withHeader('X-Internal-Secret', $aiSecret)
                ->post("{$aiUrl}/internal/extract-text", [
                    'file_content' => $fileContent,
                    'mime_type' => $this->document->mime_type,
                    'document_id' => $this->document->id,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $this->document->update([
                    'ocr_text' => $data['text'] ?? '',
                    'page_count' => $data['page_count'] ?? 0,
                    'ocr_status' => 'completed',
                    'metadata' => array_merge(
                        $this->document->metadata ?? [],
                        [
                            'extraction_engine' => $data['engine'] ?? 'none',
                            'ocr_confidence' => $data['confidence'] ?? 0.0,
                        ]
                    ),
                ]);
            } else {
                $this->document->update(['ocr_status' => 'failed']);
                Log::warning('OCR extraction failed for scanned document', [
                    'id' => $this->document->id,
                    'status' => $response->status(),
                ]);
            }
        } catch (\Exception $e) {
            $this->document->update(['ocr_status' => 'failed']);
            Log::error('OCR extraction threw exception', [
                'id' => $this->document->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
