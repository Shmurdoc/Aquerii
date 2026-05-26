<?php

namespace App\Core\Http\Controllers;

use App\Core\Models\Item;
use App\Core\Models\Workspace;
use App\Modules\Documents\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ItemDocumentController extends Controller
{
    public function index(Workspace $workspace, Item $item): JsonResponse
    {
        abort_if($item->workspace_id !== $workspace->id, 404);

        $docs = Document::where('linked_item_id', $item->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $docs]);
    }

    public function store(Request $request, Workspace $workspace, Item $item): JsonResponse
    {
        abort_if($item->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'document_id' => 'required|uuid|exists:documents,id',
        ]);

        $doc = Document::findOrFail($validated['document_id']);
        abort_if($doc->workspace_id !== $workspace->id, 404);

        $doc->update(['linked_item_id' => $item->id]);

        return response()->json(['data' => $doc], 200);
    }

    public function destroy(Workspace $workspace, Item $item, string $docId): JsonResponse
    {
        abort_if($item->workspace_id !== $workspace->id, 404);

        $doc = Document::where('id', $docId)
            ->where('linked_item_id', $item->id)
            ->firstOrFail();

        $doc->update(['linked_item_id' => null]);

        return response()->json(['data' => ['unlinked' => true]]);
    }
}
