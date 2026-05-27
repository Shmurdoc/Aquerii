<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\EmployeeGroup;
use App\Core\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EmployeeGroupController extends Controller
{
    public function index(Workspace $workspace): JsonResponse
    {
        return response()->json([
            'data' => $workspace->employeeGroups()->with(['manager', 'manager.user'])->get(),
        ]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|max:20',
            'manager_id' => 'nullable|string|exists:workspace_members,id',
        ]);

        $validated['id'] = Str::uuid();
        $group = $workspace->employeeGroups()->create($validated);

        return response()->json(['data' => $group], 201);
    }

    public function show(Workspace $workspace, EmployeeGroup $employeeGroup): JsonResponse
    {
        abort_if($employeeGroup->workspace_id !== $workspace->id, 404);

        return response()->json([
            'data' => $employeeGroup->load(['manager.user', 'members.user']),
        ]);
    }

    public function update(Request $request, Workspace $workspace, EmployeeGroup $employeeGroup): JsonResponse
    {
        abort_if($employeeGroup->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|max:20',
            'manager_id' => 'nullable|string|exists:workspace_members,id',
        ]);

        $employeeGroup->update($validated);

        return response()->json(['data' => $employeeGroup->fresh()->load(['manager.user'])]);
    }

    public function destroy(Workspace $workspace, EmployeeGroup $employeeGroup): JsonResponse
    {
        abort_if($employeeGroup->workspace_id !== $workspace->id, 404);

        // Nullify employee_group_id on members before deleting
        $employeeGroup->members()->update(['employee_group_id' => null]);
        $employeeGroup->delete();

        return response()->json(null, 204);
    }

    public function orgChart(Workspace $workspace): JsonResponse
    {
        return response()->json([

        $groups = $workspace->employeeGroups()->with(['manager.user', 'members.user'])->get();
        $unassigned = $workspace->members()
            ->whereNull('employee_group_id')
            ->with('user')
            ->get();

        return response()->json([
            'data' => [
                'groups' => $groups,
                'unassigned' => $unassigned,
            ],
        ]);
    }
}
