<?php

namespace App\Modules\Documents\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Modules\Documents\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DocumentYdocController extends Controller
{
    public function show(string $id): Response
    {
        $doc = Document::findOrFail($id);
        $state = $doc->ydoc_state ? base64_decode($doc->ydoc_state) : '';

        return response($state, 200)->header('Content-Type', 'application/octet-stream');
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate(['ydoc_state' => 'required|string']);
        $doc = Document::findOrFail($id);
        $doc->update([
            'ydoc_state' => $validated['ydoc_state'],
            'last_edited_at' => now(),
        ]);

        return response()->json(['data' => ['updated' => true]]);
    }
}
