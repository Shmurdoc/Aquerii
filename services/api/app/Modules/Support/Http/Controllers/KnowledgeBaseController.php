<?php

namespace App\Modules\Support\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Modules\Support\Models\KnowledgeBaseArticle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KnowledgeBaseController extends Controller
{
    public function index(Request $request, string $workspace): JsonResponse
    {
        $articles = KnowledgeBaseArticle::where('workspace_id', $workspace)
            ->when(! $request->include_draft, fn ($q) => $q->where('is_published', true))
            ->when($request->category, fn ($q, $v) => $q->where('category', $v))
            ->when($request->search, fn ($q, $v) => $q->where(function ($sq) use ($v) {
                $sq->where('title', 'ilike', "%{$this->escapeLike($v)}%")
                    ->orWhere('content', 'ilike', "%{$this->escapeLike($v)}%");
            }))
            ->with('author:id,name')
            ->orderBy('views', 'desc')
            ->paginate(25);

        return response()->json(['data' => $articles]);
    }

    public function show(string $workspace, string $article): JsonResponse
    {
        $article = KnowledgeBaseArticle::where('workspace_id', $workspace)
            ->with('author:id,name')
            ->findOrFail($article);

        $article->increment('views');

        return response()->json(['data' => $article]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
            'is_published' => 'boolean',
        ]);

        $data['workspace_id'] = $workspace;
        $data['author_id'] = $request->user()?->id;

        $article = KnowledgeBaseArticle::create($data);

        return response()->json(['data' => $article], 201);
    }

    public function update(Request $request, string $workspace, string $article): JsonResponse
    {
        $article = KnowledgeBaseArticle::where('workspace_id', $workspace)->findOrFail($article);

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'category' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
            'is_published' => 'boolean',
        ]);

        $article->update($data);

        return response()->json(['data' => $article->fresh()]);
    }

    public function destroy(string $workspace, string $article): JsonResponse
    {
        KnowledgeBaseArticle::where('workspace_id', $workspace)->findOrFail($article)->delete();

        return response()->json(['message' => 'Deleted'], 200);
    }

    public function vote(Request $request, string $workspace, string $article): JsonResponse
    {
        $data = $request->validate(['helpful' => 'required|boolean']);

        $article = KnowledgeBaseArticle::where('workspace_id', $workspace)->findOrFail($article);

        if ($data['helpful']) {
            $article->increment('helpful_count');
        } else {
            $article->increment('not_helpful_count');
        }

        return response()->json(['data' => $article->fresh()]);
    }
}
