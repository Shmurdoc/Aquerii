<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\WorkspaceGeofence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GeofenceController extends Controller
{
    public function index(Request $request, string $workspaceId): JsonResponse
    {
        $geofences = WorkspaceGeofence::where('workspace_id', $workspaceId)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $geofences]);
    }

    public function store(Request $request, string $workspaceId): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'radius_meters' => 'nullable|numeric|min:1|max:100000',
            'active' => 'nullable|boolean',
        ]);

        $data['workspace_id'] = $workspaceId;

        $geofence = WorkspaceGeofence::create($data);

        return response()->json(['data' => $geofence], 201);
    }

    public function update(Request $request, string $workspaceId, string $geofenceId): JsonResponse
    {
        $geofence = WorkspaceGeofence::where('workspace_id', $workspaceId)
            ->where('id', $geofenceId)
            ->firstOrFail();

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'lat' => 'sometimes|numeric|between:-90,90',
            'lng' => 'sometimes|numeric|between:-180,180',
            'radius_meters' => 'sometimes|numeric|min:1|max:100000',
            'active' => 'sometimes|boolean',
        ]);

        $geofence->update($data);

        return response()->json(['data' => $geofence->fresh()]);
    }

    public function destroy(Request $request, string $workspaceId, string $geofenceId): JsonResponse
    {
        $geofence = WorkspaceGeofence::where('workspace_id', $workspaceId)
            ->where('id', $geofenceId)
            ->firstOrFail();

        $geofence->delete();

        return response()->json(['success' => true]);
    }
}
