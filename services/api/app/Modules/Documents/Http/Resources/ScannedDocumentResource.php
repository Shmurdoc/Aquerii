<?php

namespace App\Modules\Documents\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScannedDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'title' => $this->title ?? $this->original_filename,
            'original_filename' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'ocr_status' => $this->ocr_status,
            'page_count' => $this->page_count,
            'metadata' => $this->metadata,
            'tags' => $this->tags ?? [],
            'uploaded_by' => $this->uploaded_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
