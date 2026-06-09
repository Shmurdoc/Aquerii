<?php

namespace App\Http\Controllers;

use App\Core\Models\SavedView;
use App\Core\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedViewController extends Controller
{
    /**
     * The set of entity types a SavedView is allowed to target. Kept in one
     * place so validation and any future frontend type-generation share a
     * single source of truth. Add new entries here as new list-style screens
     * grow saved-view support.
     */
    private const ALLOWED_ENTITY_TYPES = [
        'deals',
        'contacts',
        'companies',
        'leads',
        'boards',
        'items',
        'calendar-items',
        'quotes',
        'invoices',
        'tickets',
        'documents',
    ];

    /**
     * List views for the requesting user on a given entity_type.
     *
     * Returns the union of:
     *   • the caller's own views (private or shared), and
     *   • every other workspace member's *shared* views.
     *
     * Sorted by name so the UI dropdown stays stable across reloads.
     */
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'entity_type' => ['required', 'string', 'in:'.implode(',', self::ALLOWED_ENTITY_TYPES)],
        ]);

        $userId = $request->user()->id;

        $views = SavedView::where('workspace_id', $workspace->id)
            ->where('entity_type', $validated['entity_type'])
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)
                    ->orWhere('is_shared', true);
            })
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $views]);
    }

    /**
     * Create a new saved view owned by the requesting user.
     */
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'entity_type' => ['required', 'string', 'in:'.implode(',', self::ALLOWED_ENTITY_TYPES)],
            'filters' => ['nullable', 'array'],
            'sort' => ['nullable', 'array'],
            'columns' => ['nullable', 'array'],
            'is_shared' => ['sometimes', 'boolean'],
        ]);

        $view = SavedView::create([
            'workspace_id' => $workspace->id,
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
            'entity_type' => $validated['entity_type'],
            'filters' => $validated['filters'] ?? [],
            'sort' => $validated['sort'] ?? null,
            'columns' => $validated['columns'] ?? null,
            'is_shared' => $validated['is_shared'] ?? false,
        ]);

        return response()->json(['data' => $view], 201);
    }

    public function show(Request $request, Workspace $workspace, SavedView $view): JsonResponse
    {
        $this->ensureVisible($workspace, $view, $request->user()->id);

        return response()->json(['data' => $view]);
    }

    /**
     * Update a saved view. Owner can change any field; non-owners can only
     * edit when the view is_shared. We still gate `is_shared` and a transfer
     * of ownership to the owner via share()/business-policy in future.
     */
    public function update(Request $request, Workspace $workspace, SavedView $view): JsonResponse
    {
        $this->ensureBelongsToWorkspace($workspace, $view);

        $userId = $request->user()->id;
        $isOwner = $view->user_id === $userId;

        // Non-owners can only edit if the view is currently shared. Owner-only
        // toggles (is_shared) are blocked for non-owners regardless.
        abort_if(! $isOwner && ! $view->is_shared, 403, 'You cannot edit this view.');

        $rules = [
            'name' => ['sometimes', 'string', 'max:120'],
            'filters' => ['sometimes', 'nullable', 'array'],
            'sort' => ['sometimes', 'nullable', 'array'],
            'columns' => ['sometimes', 'nullable', 'array'],
        ];

        // Only the owner can change the sharing state via update; everyone
        // else must call share() — which is also owner-gated.
        if ($isOwner) {
            $rules['is_shared'] = ['sometimes', 'boolean'];
        }

        $validated = $request->validate($rules);

        $view->update($validated);

        return response()->json(['data' => $view->fresh()]);
    }

    /**
     * Delete a saved view. Owner-only — sharing a view does not grant the
     * recipients destroy permission.
     */
    public function destroy(Request $request, Workspace $workspace, SavedView $view): JsonResponse
    {
        $this->ensureBelongsToWorkspace($workspace, $view);

        abort_if($view->user_id !== $request->user()->id, 403, 'Only the owner can delete this view.');

        $view->delete();

        return response()->json(null, 204);
    }

    /**
     * Toggle is_shared. Owner-only. Body may pass an explicit boolean to set
     * a target state, otherwise the current value is flipped.
     */
    public function share(Request $request, Workspace $workspace, SavedView $view): JsonResponse
    {
        $this->ensureBelongsToWorkspace($workspace, $view);

        abort_if($view->user_id !== $request->user()->id, 403, 'Only the owner can change sharing.');

        $validated = $request->validate([
            'is_shared' => ['sometimes', 'boolean'],
        ]);

        $view->update([
            'is_shared' => $validated['is_shared'] ?? ! $view->is_shared,
        ]);

        return response()->json(['data' => $view->fresh()]);
    }

    private function ensureBelongsToWorkspace(Workspace $workspace, SavedView $view): void
    {
        abort_if($view->workspace_id !== $workspace->id, 404, 'Saved view not found.');
    }

    /**
     * Visibility = same workspace + (own view OR shared view). Anything else
     * returns 404 rather than 403 so we don't leak existence.
     */
    private function ensureVisible(Workspace $workspace, SavedView $view, string $userId): void
    {
        $this->ensureBelongsToWorkspace($workspace, $view);

        if ($view->user_id !== $userId && ! $view->is_shared) {
            abort(404, 'Saved view not found.');
        }
    }
}
