<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Modules\Equipment\Models\Equipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquipmentController extends Controller
{
    public function index(Request $request, string $workspace): JsonResponse
    {
        $query = Equipment::where('workspace_id', $workspace);

        if ($request->filled('equipment_type')) {
            $query->where('equipment_type', $request->equipment_type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('compliance_status')) {
            $query->where('compliance_status', $request->compliance_status);
        }

        if ($request->filled('search')) {
            $search = $this->escapeLike($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('registration_number', 'ilike', "%{$search}%");
            });
        }

        $equipment = $query->orderBy('name')->paginate(50);

        return response()->json($equipment);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'equipment_type' => 'required|string|max:255',
            'registration_number' => 'required|string|max:255|unique:equipment,registration_number,NULL,id,workspace_id,' . $workspace,
            'manufacturer' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'year' => 'nullable|integer|min:1900|max:2099',
            'site_area' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:5000',
        ]);

        $validated['workspace_id'] = $workspace;

        $equipment = Equipment::create($validated);

        return response()->json(['data' => $equipment], 201);
    }

    public function show(string $workspace, string $equipment): JsonResponse
    {
        $equipment = Equipment::where('workspace_id', $workspace)
            ->with('certRecords.certType')
            ->findOrFail($equipment);

        return response()->json(['data' => $equipment]);
    }

    public function update(Request $request, string $workspace, string $equipment): JsonResponse
    {
        $equipment = Equipment::where('workspace_id', $workspace)->findOrFail($equipment);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'equipment_type' => 'sometimes|required|string|max:255',
            'registration_number' => 'sometimes|required|string|max:255|unique:equipment,registration_number,' . $equipment->id . ',id,workspace_id,' . $workspace,
            'manufacturer' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'year' => 'nullable|integer|min:1900|max:2099',
            'site_area' => 'nullable|string|max:255',
            'status' => 'sometimes|string|max:50',
            'notes' => 'nullable|string|max:5000',
        ]);

        $equipment->update($validated);

        return response()->json(['data' => $equipment]);
    }

    public function destroy(string $workspace, string $equipment): JsonResponse
    {
        $equipment = Equipment::where('workspace_id', $workspace)->findOrFail($equipment);
        $equipment->delete();

        return response()->json(null, 204);
    }
}
