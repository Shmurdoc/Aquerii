<?php

namespace App\Modules\Marketing\Http\Controllers;

use App\Modules\Marketing\Models\EmailTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class EmailTemplateController extends Controller
{
    public function index(Request $request, string $workspace): JsonResponse
    {
        $templates = EmailTemplate::where('workspace_id', $workspace)
            ->when($request->category, fn ($q, $v) => $q->where('category', $v))
            ->with('createdBy:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json(['data' => $templates]);
    }

    public function show(string $workspace, string $template): JsonResponse
    {
        $template = EmailTemplate::where('workspace_id', $workspace)
            ->with('createdBy:id,name')
            ->findOrFail($template);

        return response()->json(['data' => $template]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'subject' => 'required|string|max:255',
            'content_html' => 'nullable|string',
            'content_text' => 'nullable|string',
            'tokens' => 'nullable|array',
            'category' => 'nullable|string|max:100',
            'is_shared' => 'boolean',
        ]);

        $data['workspace_id'] = $workspace;
        $data['created_by'] = $request->user()?->id;

        $template = EmailTemplate::create($data);

        return response()->json(['data' => $template], 201);
    }

    public function update(Request $request, string $workspace, string $template): JsonResponse
    {
        $template = EmailTemplate::where('workspace_id', $workspace)->findOrFail($template);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'subject' => 'sometimes|string|max:255',
            'content_html' => 'nullable|string',
            'content_text' => 'nullable|string',
            'tokens' => 'nullable|array',
            'category' => 'nullable|string|max:100',
            'is_shared' => 'boolean',
        ]);

        $template->update($data);

        return response()->json(['data' => $template->fresh()]);
    }

    public function destroy(string $workspace, string $template): JsonResponse
    {
        EmailTemplate::where('workspace_id', $workspace)->findOrFail($template)->delete();

        return response()->json(['message' => 'Deleted'], 200);
    }
}
