<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Jobs\ImportCrmContactsJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ContactImportController extends Controller
{
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
            'field_mapping' => 'sometimes|nullable|json',
        ]);

        $file = $request->file('file');
        $path = $file->storeAs(
            "imports/{$workspace->id}",
            Str::uuid() . '.csv',
        );

        $fieldMapping = $request->input('field_mapping')
            ? json_decode($request->input('field_mapping'), true)
            : null;

        $importId = (string) Str::uuid();

        ImportCrmContactsJob::dispatch($workspace->id, $path, $fieldMapping, $importId);

        return response()->json([
            'data' => [
                'import_id' => $importId,
                'status' => 'queued',
            ],
        ], 201);
    }

    public function status(Request $request, Workspace $workspace, string $importId): JsonResponse
    {
        $status = Cache::get("import:{$importId}", [
            'status' => 'processing',
            'total' => 0,
            'imported' => 0,
            'errors' => [],
        ]);

        return response()->json(['data' => $status]);
    }
}
