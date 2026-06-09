<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\WorkspaceMember;
use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Models\EquipmentCertRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquipmentCertRecordController extends Controller
{
    public function index(Request $request, string $workspace, string $equipment): JsonResponse
    {
        Equipment::where('workspace_id', $workspace)->findOrFail($equipment);

        $records = EquipmentCertRecord::where('equipment_id', $equipment)
            ->with('certType')
            ->orderBy('issued_at', 'desc')
            ->get();

        return response()->json(['data' => $records]);
    }

    public function store(Request $request, string $workspace, string $equipment): JsonResponse
    {
        Equipment::where('workspace_id', $workspace)->findOrFail($equipment);

        $validated = $request->validate([
            'equipment_cert_type_id' => 'required|string|exists:equipment_cert_types,id',
            'cert_number' => 'required|string|max:255',
            'issued_at' => 'required|date',
            'expires_at' => 'nullable|date|after:issued_at',
            'notes' => 'nullable|string|max:5000',
        ]);

        $record = EquipmentCertRecord::create([
            'workspace_id' => $workspace,
            'equipment_id' => $equipment,
            'equipment_cert_type_id' => $validated['equipment_cert_type_id'],
            'cert_number' => $validated['cert_number'],
            'issued_at' => $validated['issued_at'],
            'expires_at' => $validated['expires_at'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(['data' => $record->load('certType')], 201);
    }

    public function update(Request $request, string $workspace, string $equipment, string $record): JsonResponse
    {
        Equipment::where('workspace_id', $workspace)->findOrFail($equipment);

        $record = EquipmentCertRecord::where('equipment_id', $equipment)->findOrFail($record);

        $validated = $request->validate([
            'equipment_cert_type_id' => 'sometimes|required|string|exists:equipment_cert_types,id',
            'cert_number' => 'sometimes|required|string|max:255',
            'issued_at' => 'sometimes|required|date',
            'expires_at' => 'nullable|date|after:issued_at',
            'notes' => 'nullable|string|max:5000',
        ]);

        $record->update($validated);

        return response()->json(['data' => $record->load('certType')]);
    }

    public function destroy(string $workspace, string $equipment, string $record): JsonResponse
    {
        Equipment::where('workspace_id', $workspace)->findOrFail($equipment);

        $record = EquipmentCertRecord::where('equipment_id', $equipment)->findOrFail($record);
        $record->delete();

        return response()->json(null, 204);
    }

    public function verify(Request $request, string $workspace, string $equipment, string $record): JsonResponse
    {
        Equipment::where('workspace_id', $workspace)->findOrFail($equipment);

        $member = WorkspaceMember::where('workspace_id', $workspace)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if (! in_array($member->role, ['owner', 'admin', 'hsse', 'inspector'])) {
            abort(403, 'Only HSSE/inspector roles can verify certificates.');
        }

        $record = EquipmentCertRecord::where('equipment_id', $equipment)->findOrFail($record);

        $record->update([
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $record->load('certType')]);
    }
}
