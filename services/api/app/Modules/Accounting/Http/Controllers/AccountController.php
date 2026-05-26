<?php

namespace App\Modules\Accounting\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Accounting\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(auth()->user()->workspaces()->where('workspace_id', $workspace->id)->exists(), 403);

        $query = Account::where('workspace_id', $workspace->id);

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $accounts = $query->orderBy('code')->get();

        return response()->json(['data' => $accounts]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:20',
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:asset,liability,equity,income,expense',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $account = Account::create([
            'workspace_id' => $workspace->id,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'type' => $validated['type'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $account], 201);
    }

    public function show(Workspace $workspace, Account $account): JsonResponse
    {
        abort_if($account->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $account]);
    }

    public function update(Request $request, Workspace $workspace, Account $account): JsonResponse
    {
        abort_if($account->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'code' => 'sometimes|string|max:20',
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|in:asset,liability,equity,income,expense',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $account->update($validated);

        return response()->json(['data' => $account->fresh()]);
    }

    public function destroy(Workspace $workspace, Account $account): JsonResponse
    {
        abort_if($account->workspace_id !== $workspace->id, 404);
        $account->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
