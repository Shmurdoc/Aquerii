<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AutomationController extends Controller
{
    // GET /workspaces/{workspace}/automations
    public function index(Workspace $workspace): JsonResponse
    {
        $automations = DB::table('automations')
            ->where('workspace_id', $workspace->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $automations]);
    }

    // POST /workspaces/{workspace}/automations
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:150',
            'trigger' => 'required|array',
            'actions' => 'required|array|min:1',
            'enabled' => 'sometimes|boolean',
        ]);

        $id = Str::uuid()->toString();
        DB::table('automations')->insert([
            'id'           => $id,
            'workspace_id' => $workspace->id,
            'name'         => $validated['name'],
            'trigger'      => json_encode($validated['trigger']),
            'actions'      => json_encode($validated['actions']),
            'enabled'      => $validated['enabled'] ?? true,
            'created_by'   => $request->user()->id,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        return response()->json(['data' => ['id' => $id]], 201);
    }

    // PATCH /workspaces/{workspace}/automations/{automation}
    public function update(Request $request, Workspace $workspace, string $automationId): JsonResponse
    {
        $validated = $request->validate([
            'name'    => 'sometimes|string|max:150',
            'trigger' => 'sometimes|array',
            'actions' => 'sometimes|array|min:1',
            'enabled' => 'sometimes|boolean',
        ]);

        $update = [];
        foreach (['name', 'enabled'] as $field) {
            if (isset($validated[$field])) $update[$field] = $validated[$field];
        }
        foreach (['trigger', 'actions'] as $field) {
            if (isset($validated[$field])) $update[$field] = json_encode($validated[$field]);
        }
        $update['updated_at'] = now();

        DB::table('automations')
            ->where('id', $automationId)
            ->where('workspace_id', $workspace->id)
            ->update($update);

        return response()->json(['data' => ['updated' => true]]);
    }

    // DELETE /workspaces/{workspace}/automations/{automation}
    public function destroy(Workspace $workspace, string $automationId): JsonResponse
    {
        DB::table('automations')
            ->where('id', $automationId)
            ->where('workspace_id', $workspace->id)
            ->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    // GET /workspaces/{workspace}/automations/{automation}/runs
    public function runs(Workspace $workspace, string $automationId): JsonResponse
    {
        $runs = DB::table('automation_runs')
            ->where('automation_id', $automationId)
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return response()->json(['data' => $runs]);
    }
}
