<?php

namespace App\Modules\Templates\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Templates\Models\Template;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TemplateController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = Template::where('workspace_id', $workspace->id);

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $templates = $query->orderBy('created_at', 'desc')->get();

        return response()->json(['data' => $templates]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:50',
            'description' => 'nullable|string',
            'content' => 'required|array',
            'variables' => 'nullable|array',
            'is_public' => 'sometimes|boolean',
        ]);

        $template = Template::create([
            'workspace_id' => $workspace->id,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'description' => $validated['description'] ?? null,
            'content' => $validated['content'],
            'variables' => $validated['variables'] ?? null,
            'is_public' => $validated['is_public'] ?? false,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $template], 201);
    }

    public function show(Workspace $workspace, string $template): JsonResponse
    {
        $template = Template::where('workspace_id', $workspace->id)->findOrFail($template);

        return response()->json(['data' => $template]);
    }

    public function update(Request $request, Workspace $workspace, string $template): JsonResponse
    {
        $template = Template::where('workspace_id', $workspace->id)->findOrFail($template);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'content' => 'sometimes|array',
            'variables' => 'nullable|array',
            'is_public' => 'sometimes|boolean',
        ]);

        $template->update($validated);

        return response()->json(['data' => $template->fresh()]);
    }

    public function destroy(Workspace $workspace, string $template): JsonResponse
    {
        $template = Template::where('workspace_id', $workspace->id)->findOrFail($template);
        $template->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function apply(Request $request, Workspace $workspace, string $template): JsonResponse
    {
        $template = Template::where('workspace_id', $workspace->id)->findOrFail($template);

        $variables = $request->input('variables', []);

        $content = $template->content;
        foreach ($variables as $key => $value) {
            $content = str_replace("{{$key}}", $value, $content);
        }

        return response()->json(['data' => ['template' => $template, 'applied_content' => $content]]);
    }
}
