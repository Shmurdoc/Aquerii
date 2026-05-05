<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileController extends Controller
{
    // GET /workspaces/{workspace}/items/{itemId}/files
    public function index(Workspace $workspace, string $itemId): JsonResponse
    {
        $files = DB::table('files')
            ->where('entity_type', 'item')
            ->where('entity_id', $itemId)
            ->orderBy('created_at', 'desc')
            ->get();

        $data = $files->map(fn($f) => [
            'id'       => $f->id,
            'filename' => $f->filename,
            'size'     => $f->size,
            'mime'     => $f->mime_type,
            'url'      => Storage::disk('s3')->temporaryUrl($f->storage_path, now()->addMinutes(60)),
        ]);

        return response()->json(['data' => $data]);
    }

    // POST /workspaces/{workspace}/items/{itemId}/files
    public function store(Request $request, Workspace $workspace, string $itemId): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:102400', // 100 MB
        ]);

        $file     = $request->file('file');
        $filename = $file->getClientOriginalName();
        $size     = $file->getSize();

        // Check workspace storage quota
        $used  = (int) $workspace->storage_used_bytes;
        $limit = (int) ($workspace->storage_limit_bytes ?? 5368709120);
        abort_if($used + $size > $limit, 402, 'Storage quota exceeded.');

        $path = "workspaces/{$workspace->id}/items/{$itemId}/" . Str::uuid() . '_' . $filename;
        Storage::disk('s3')->put($path, $file->getContent());

        $id = Str::uuid()->toString();
        DB::transaction(function () use ($id, $itemId, $workspace, $filename, $path, $size, $file) {
            DB::table('files')->insert([
                'id'           => $id,
                'workspace_id' => $workspace->id,
                'entity_type'  => 'item',
                'entity_id'    => $itemId,
                'filename'     => $filename,
                'storage_path' => $path,
                'mime_type'    => $file->getMimeType(),
                'size'         => $size,
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            // Trigger updates storage_used_bytes via DB trigger (02_triggers.sql)
            DB::statement(
                'UPDATE workspaces SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?',
                [$size, $workspace->id]
            );
        });

        return response()->json(['data' => ['id' => $id, 'filename' => $filename]], 201);
    }

    // DELETE /workspaces/{workspace}/files/{file}
    public function destroy(Workspace $workspace, string $fileId): JsonResponse
    {
        $file = DB::table('files')->where('id', $fileId)->where('workspace_id', $workspace->id)->first();
        abort_unless($file, 404);

        Storage::disk('s3')->delete($file->storage_path);

        DB::transaction(function () use ($file, $workspace) {
            DB::table('files')->where('id', $file->id)->delete();
            DB::statement(
                'UPDATE workspaces SET storage_used_bytes = GREATEST(0, storage_used_bytes - ?) WHERE id = ?',
                [$file->size, $workspace->id]
            );
        });

        return response()->json(['data' => ['deleted' => true]]);
    }
}
