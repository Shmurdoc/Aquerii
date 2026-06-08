<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Modules\Equipment\Models\EquipmentCertType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquipmentCertTypeController extends Controller
{
    public function index(string $workspace): JsonResponse
    {
        $certTypes = EquipmentCertType::where('workspace_id', $workspace)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $certTypes]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:equipment_cert_types,slug',
            'description' => 'nullable|string|max:1000',
            'is_mandatory' => 'sometimes|boolean',
            'frequency_days' => 'nullable|integer|min:1',
        ]);

        $validated['workspace_id'] = $workspace;

        $certType = EquipmentCertType::create($validated);

        return response()->json(['data' => $certType], 201);
    }

    public function update(Request $request, string $workspace, string $equipment, string $certType): JsonResponse
    {
        $certType = EquipmentCertType::where('workspace_id', $workspace)->findOrFail($certType);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|max:255|unique:equipment_cert_types,slug,' . $certType->id,
            'description' => 'nullable|string|max:1000',
            'is_mandatory' => 'sometimes|boolean',
            'frequency_days' => 'nullable|integer|min:1',
        ]);

        $certType->update($validated);

        return response()->json(['data' => $certType]);
    }

    public function destroy(string $workspace, string $equipment, string $certType): JsonResponse
    {
        $certType = EquipmentCertType::where('workspace_id', $workspace)->findOrFail($certType);
        $certType->delete();

        return response()->json(null, 204);
    }
}
