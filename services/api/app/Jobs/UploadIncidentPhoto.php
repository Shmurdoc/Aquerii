<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\File;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadIncidentPhoto implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private readonly string $incidentId,
        private readonly string $tempPath,
        private readonly string $fileName,
    ) {}

    public function handle(): void
    {
        $disk = Storage::disk('s3');
        $targetPath = "incidents/{$this->incidentId}/photos/" . Str::uuid() . '.' . pathinfo($this->fileName, PATHINFO_EXTENSION);

        try {
            $disk->writeStream($targetPath, Storage::disk('local')->readStream($this->tempPath));
        } catch (\Throwable $e) {
            $fallbackPath = Storage::disk('local')->path("incident-photo-fallback/{$this->incidentId}/{$this->fileName}");
            Storage::disk('local')->makeDirectory(dirname($fallbackPath));
            Storage::disk('local')->move($this->tempPath, $fallbackPath);
        } finally {
            Storage::disk('local')->delete($this->tempPath);
        }
    }
}
