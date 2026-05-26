<?php

namespace App\Modules\Documents\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Documents\Http\Resources\ScannedDocumentResource;
use App\Modules\Documents\Jobs\ProcessDocumentOcr;
use App\Modules\Documents\Models\ScannedDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ScannedDocumentController extends Controller
{
    public function index(Workspace $workspace, Request $request): JsonResponse
    {
        $query = ScannedDocument::where('workspace_id', $workspace->id);

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('original_filename', 'like', "%{$search}%")
                    ->orWhere('ocr_text', 'like', "%{$search}%");
            });
        }

        $documents = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 50));

        return response()->json([
            'data' => ScannedDocumentResource::collection($documents),
            'meta' => [
                'current_page' => $documents->currentPage(),
                'last_page' => $documents->lastPage(),
                'total' => $documents->total(),
            ],
        ]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:102400',
            'title' => 'nullable|string|max:255',
        ]);

        $file = $request->file('file');
        $filename = $file->getClientOriginalName();
        $size = $file->getSize();

        $used = (int) $workspace->storage_used_bytes;
        $limit = (int) ($workspace->storage_limit_bytes ?? 5368709120);
        abort_if($used + $size > $limit, 402, 'Storage quota exceeded.');

        $path = "workspaces/{$workspace->id}/scanned-documents/".Str::uuid().'_'.$filename;
        Storage::disk('s3')->put($path, $file->getContent());

        $document = ScannedDocument::create([
            'workspace_id' => $workspace->id,
            'title' => $request->title,
            'original_filename' => $filename,
            'mime_type' => $file->getMimeType(),
            'file_size' => $size,
            'storage_path' => $path,
            'ocr_status' => 'pending',
            'uploaded_by' => $request->user()->id,
        ]);

        dispatch(new ProcessDocumentOcr($document))
            ->onQueue('default');

        return response()->json([
            'data' => new ScannedDocumentResource($document),
        ], 201);
    }

    public function show(Workspace $workspace, string $id): JsonResponse
    {
        $document = ScannedDocument::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        return response()->json([
            'data' => (new ScannedDocumentResource($document))->additional([
                'download_url' => Storage::disk('s3')->temporaryUrl($document->storage_path, now()->addMinutes(60)),
                'ocr_text' => $document->ocr_status === 'completed' ? $document->ocr_text : null,
            ]),
        ]);
    }

    public function update(Request $request, Workspace $workspace, string $id): JsonResponse
    {
        $document = ScannedDocument::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        $request->validate([
            'title' => 'nullable|string|max:255',
            'tags'  => 'nullable|array',
            'tags.*' => 'string|max:100',
        ]);

        $document->fill(array_filter([
            'title' => $request->title,
            'tags'  => $request->has('tags') ? $request->tags : null,
        ], fn($v) => !is_null($v)));

        $document->save();

        return response()->json(['data' => new ScannedDocumentResource($document)]);
    }

    public function destroy(Workspace $workspace, string $id): JsonResponse
    {
        $document = ScannedDocument::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        Storage::disk('s3')->delete($document->storage_path);
        $document->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function download(Workspace $workspace, string $id): JsonResponse
    {
        $document = ScannedDocument::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        $url = Storage::disk('s3')->temporaryUrl($document->storage_path, now()->addMinutes(60));

        return response()->json(['data' => ['url' => $url, 'filename' => $document->original_filename]]);
    }
}
