<?php

namespace App\Modules\Competency\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Competency\Models\CofRecord;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\Competency\Models\CompetencyRequirement;
use App\Modules\Competency\Models\CompetencyType;
use App\Modules\Competency\Models\TrainingRecord;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompetencyController extends Controller
{
    // ===== Competency Types =====

    public function indexTypes(Request $request, Workspace $workspace): JsonResponse
    {
        $types = CompetencyType::where('workspace_id', $workspace->id)
            ->withCount('records')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $types]);
    }

    public function storeType(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:competency_types,name,NULL,id,workspace_id,'.$workspace->id,
            'description' => 'nullable|string|max:1000',
            'category' => 'nullable|string|max:100',
            'issuing_body' => 'nullable|string|max:255',
            'is_cof' => 'boolean',
            'requires_renewal' => 'boolean',
            'renewal_period_days' => 'nullable|integer|min:1',
            'color' => 'nullable|string|max:20',
            'icon' => 'nullable|string|max:100',
        ]);

        $type = CompetencyType::create(array_merge(
            $validated,
            ['workspace_id' => $workspace->id]
        ));

        return response()->json(['data' => $type], 201);
    }

    public function showType(Workspace $workspace, string $type): JsonResponse
    {
        $type = CompetencyType::where('workspace_id', $workspace->id)
            ->with(['records.user', 'requirements'])
            ->findOrFail($type);

        return response()->json(['data' => $type]);
    }

    public function updateType(Request $request, Workspace $workspace, string $type): JsonResponse
    {
        $type = CompetencyType::where('workspace_id', $workspace->id)->findOrFail($type);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:competency_types,name,'.$type->id.',id,workspace_id,'.$workspace->id,
            'description' => 'nullable|string|max:1000',
            'category' => 'nullable|string|max:100',
            'issuing_body' => 'nullable|string|max:255',
            'is_cof' => 'boolean',
            'requires_renewal' => 'boolean',
            'renewal_period_days' => 'nullable|integer|min:1',
            'color' => 'nullable|string|max:20',
            'icon' => 'nullable|string|max:100',
        ]);

        $type->update($validated);

        return response()->json(['data' => $type]);
    }

    public function destroyType(Workspace $workspace, string $type): JsonResponse
    {
        $type = CompetencyType::where('workspace_id', $workspace->id)->findOrFail($type);
        $type->delete();

        return response()->json(['message' => 'Competency type deleted'], 200);
    }

    // ===== Competency Records =====

    public function indexRecords(Request $request, Workspace $workspace): JsonResponse
    {
        $query = CompetencyRecord::where('workspace_id', $workspace->id)
            ->with(['user', 'competencyType']);

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('competency_type_id')) {
            $query->where('competency_type_id', $request->competency_type_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('expiring_soon')) {
            $query->where('expires_at', '<=', Carbon::now()->addDays((int) $request->expiring_soon))
                ->where('expires_at', '>=', Carbon::now())
                ->where('status', 'active');
        }

        $records = $query->orderBy('issued_at', 'desc')->get();

        return response()->json(['data' => $records]);
    }

    public function storeRecord(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'competency_type_id' => 'required|exists:competency_types,id',
            'reference_number' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,expired,revoked,suspended',
            'issued_at' => 'required|date',
            'expires_at' => 'nullable|date|after_or_equal:issued_at',
            'document_url' => 'nullable|string|max:2048',
            'notes' => 'nullable|string|max:2000',
        ]);

        $existing = CompetencyRecord::where('workspace_id', $workspace->id)
            ->where('user_id', $validated['user_id'])
            ->where('competency_type_id', $validated['competency_type_id'])
            ->where('status', 'active')
            ->first();

        if ($existing) {
            $existing->delete();
        }

        $record = CompetencyRecord::create(array_merge(
            $validated,
            ['workspace_id' => $workspace->id]
        ));

        return response()->json(['data' => $record], 201);
    }

    public function showRecord(Workspace $workspace, string $record): JsonResponse
    {
        $record = CompetencyRecord::where('workspace_id', $workspace->id)
            ->with(['user', 'competencyType', 'verifiedBy'])
            ->findOrFail($record);

        return response()->json(['data' => $record]);
    }

    public function updateRecord(Request $request, Workspace $workspace, string $record): JsonResponse
    {
        $record = CompetencyRecord::where('workspace_id', $workspace->id)->findOrFail($record);

        $validated = $request->validate([
            'reference_number' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,expired,revoked,suspended',
            'issued_at' => 'sometimes|required|date',
            'expires_at' => 'nullable|date|after_or_equal:issued_at',
            'verified_at' => 'nullable|date',
            'verified_by' => 'nullable|exists:users,id',
            'document_url' => 'nullable|string|max:2048',
            'notes' => 'nullable|string|max:2000',
        ]);

        $record->update($validated);

        return response()->json(['data' => $record]);
    }

    public function destroyRecord(Workspace $workspace, string $record): JsonResponse
    {
        $record = CompetencyRecord::where('workspace_id', $workspace->id)->findOrFail($record);
        $record->delete();

        return response()->json(['message' => 'Record deleted'], 200);
    }

    // ===== COF Records =====

    public function indexCofs(Request $request, Workspace $workspace): JsonResponse
    {
        $query = CofRecord::where('workspace_id', $workspace->id)->with('user');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('expiring_soon')) {
            $days = (int) $request->expiring_soon;
            $query->where('expires_at', '<=', Carbon::now()->addDays($days))
                ->where('expires_at', '>=', Carbon::now())
                ->where('status', 'active');
        }

        $cofs = $query->orderBy('expires_at')->get();

        return response()->json(['data' => $cofs]);
    }

    public function storeCof(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'type' => 'nullable|string|max:100',
            'reference_number' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,expired,suspended',
            'issued_at' => 'required|date',
            'expires_at' => 'required|date|after:issued_at',
            'medical_notes' => 'nullable|string|max:2000',
            'issued_by' => 'nullable|string|max:255',
            'document_url' => 'nullable|string|max:2048',
        ]);

        $cof = CofRecord::create(array_merge(
            $validated,
            ['workspace_id' => $workspace->id]
        ));

        return response()->json(['data' => $cof], 201);
    }

    public function showCof(Workspace $workspace, string $cof): JsonResponse
    {
        $cof = CofRecord::where('workspace_id', $workspace->id)
            ->with('user')
            ->findOrFail($cof);

        return response()->json(['data' => $cof]);
    }

    public function updateCof(Request $request, Workspace $workspace, string $cof): JsonResponse
    {
        $cof = CofRecord::where('workspace_id', $workspace->id)->findOrFail($cof);

        $validated = $request->validate([
            'type' => 'nullable|string|max:100',
            'reference_number' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,expired,suspended',
            'issued_at' => 'sometimes|required|date',
            'expires_at' => 'sometimes|required|date|after:issued_at',
            'medical_notes' => 'nullable|string|max:2000',
            'issued_by' => 'nullable|string|max:255',
            'document_url' => 'nullable|string|max:2048',
        ]);

        $cof->update($validated);

        return response()->json(['data' => $cof]);
    }

    public function destroyCof(Workspace $workspace, string $cof): JsonResponse
    {
        $cof = CofRecord::where('workspace_id', $workspace->id)->findOrFail($cof);
        $cof->delete();

        return response()->json(['message' => 'COF record deleted'], 200);
    }

    // ===== Competency Requirements (polymorphic) =====

    public function indexRequirements(Request $request, Workspace $workspace): JsonResponse
    {
        $query = CompetencyRequirement::where('workspace_id', $workspace->id)
            ->with('competencyType');

        if ($request->filled('requirable_type')) {
            $query->where('requirable_type', $request->requirable_type);
        }

        if ($request->filled('requirable_id')) {
            $query->where('requirable_id', $request->requirable_id);
        }

        $requirements = $query->orderBy('requirable_type')->get();

        return response()->json(['data' => $requirements]);
    }

    public function storeRequirement(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'requirable_type' => 'required|string|max:255',
            'requirable_id' => 'required|string|max:36',
            'competency_type_id' => 'required|exists:competency_types,id',
            'is_mandatory' => 'boolean',
            'expiry_alert_days' => 'nullable|integer|min:0',
            'notes' => 'nullable|string|max:2000',
        ]);

        $exists = CompetencyRequirement::where('workspace_id', $workspace->id)
            ->where('requirable_type', $validated['requirable_type'])
            ->where('requirable_id', $validated['requirable_id'])
            ->where('competency_type_id', $validated['competency_type_id'])
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'This requirement already exists for the given entity and competency type'], 422);
        }

        $requirement = CompetencyRequirement::create(array_merge(
            $validated,
            ['workspace_id' => $workspace->id]
        ));

        return response()->json(['data' => $requirement], 201);
    }

    public function showRequirement(Workspace $workspace, string $requirement): JsonResponse
    {
        $requirement = CompetencyRequirement::where('workspace_id', $workspace->id)
            ->with(['competencyType', 'requirable'])
            ->findOrFail($requirement);

        return response()->json(['data' => $requirement]);
    }

    public function updateRequirement(Request $request, Workspace $workspace, string $requirement): JsonResponse
    {
        $requirement = CompetencyRequirement::where('workspace_id', $workspace->id)->findOrFail($requirement);

        $validated = $request->validate([
            'is_mandatory' => 'boolean',
            'expiry_alert_days' => 'nullable|integer|min:0',
            'notes' => 'nullable|string|max:2000',
        ]);

        $requirement->update($validated);

        return response()->json(['data' => $requirement]);
    }

    public function destroyRequirement(Workspace $workspace, string $requirement): JsonResponse
    {
        $requirement = CompetencyRequirement::where('workspace_id', $workspace->id)->findOrFail($requirement);
        $requirement->delete();

        return response()->json(['message' => 'Requirement deleted'], 200);
    }

    // ===== Training Records =====

    public function indexTraining(Request $request, Workspace $workspace): JsonResponse
    {
        $query = TrainingRecord::where('workspace_id', $workspace->id)
            ->with(['user', 'competencyType']);

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('result')) {
            $query->where('result', $request->result);
        }

        $records = $query->orderBy('date_completed', 'desc')->get();

        return response()->json(['data' => $records]);
    }

    public function storeTraining(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'competency_type_id' => 'nullable|exists:competency_types,id',
            'training_name' => 'required|string|max:255',
            'provider' => 'nullable|string|max:255',
            'date_completed' => 'required|date',
            'expiry_date' => 'nullable|date|after_or_equal:date_completed',
            'result' => 'nullable|in:passed,failed,incomplete',
            'score' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:2000',
            'document_url' => 'nullable|string|max:2048',
        ]);

        $training = TrainingRecord::create(array_merge(
            $validated,
            ['workspace_id' => $workspace->id]
        ));

        return response()->json(['data' => $training], 201);
    }

    public function showTraining(Workspace $workspace, string $training): JsonResponse
    {
        $training = TrainingRecord::where('workspace_id', $workspace->id)
            ->with(['user', 'competencyType'])
            ->findOrFail($training);

        return response()->json(['data' => $training]);
    }

    public function updateTraining(Request $request, Workspace $workspace, string $training): JsonResponse
    {
        $training = TrainingRecord::where('workspace_id', $workspace->id)->findOrFail($training);

        $validated = $request->validate([
            'training_name' => 'sometimes|required|string|max:255',
            'provider' => 'nullable|string|max:255',
            'date_completed' => 'sometimes|required|date',
            'expiry_date' => 'nullable|date|after_or_equal:date_completed',
            'result' => 'nullable|in:passed,failed,incomplete',
            'score' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:2000',
            'document_url' => 'nullable|string|max:2048',
        ]);

        $training->update($validated);

        return response()->json(['data' => $training]);
    }

    public function destroyTraining(Workspace $workspace, string $training): JsonResponse
    {
        $training = TrainingRecord::where('workspace_id', $workspace->id)->findOrFail($training);
        $training->delete();

        return response()->json(['message' => 'Training record deleted'], 200);
    }

    // ===== Dashboard / Stats =====

    public function stats(Workspace $workspace): JsonResponse
    {
        $now = Carbon::now();
        $thirtyDays = $now->copy()->addDays(30);

        $stats = [
            'total_competency_types' => CompetencyType::where('workspace_id', $workspace->id)->count(),
            'active_records' => CompetencyRecord::where('workspace_id', $workspace->id)->where('status', 'active')->count(),
            'expiring_records_30_days' => CompetencyRecord::where('workspace_id', $workspace->id)
                ->where('status', 'active')
                ->where('expires_at', '<=', $thirtyDays)
                ->where('expires_at', '>=', $now)
                ->count(),
            'expired_records' => CompetencyRecord::where('workspace_id', $workspace->id)
                ->where('status', 'expired')
                ->count(),
            'active_cofs' => CofRecord::where('workspace_id', $workspace->id)->where('status', 'active')->count(),
            'expiring_cofs_30_days' => CofRecord::where('workspace_id', $workspace->id)
                ->where('status', 'active')
                ->where('expires_at', '<=', $thirtyDays)
                ->where('expires_at', '>=', $now)
                ->count(),
            'recent_training_30_days' => TrainingRecord::where('workspace_id', $workspace->id)
                ->where('date_completed', '>=', $now->copy()->subDays(30))
                ->count(),
        ];

        return response()->json(['data' => $stats]);
    }
}
