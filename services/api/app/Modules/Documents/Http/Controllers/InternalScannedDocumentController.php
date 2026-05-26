<?php

namespace App\Modules\Documents\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Modules\Documents\Models\ScannedDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class InternalScannedDocumentController extends Controller
{
    public function content(string $id): JsonResponse
    {
        $doc = ScannedDocument::findOrFail($id);

        $fileUrl = null;
        if ($doc->storage_path && Storage::disk('s3')->exists($doc->storage_path)) {
            $fileUrl = Storage::disk('s3')->temporaryUrl($doc->storage_path, now()->addMinutes(5));
        }

        return response()->json([
            'data' => [
                'id' => $doc->id,
                'title' => $doc->title,
                'ocr_text' => $doc->ocr_text,
                'mime_type' => $doc->mime_type,
                'file_url' => $fileUrl,
                'metadata' => $doc->metadata,
            ],
        ]);
    }
}
