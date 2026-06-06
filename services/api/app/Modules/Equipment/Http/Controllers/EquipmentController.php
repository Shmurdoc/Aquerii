<?php

namespace App\Modules\Equipment\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Models\EquipmentCategory;
use App\Modules\Equipment\Models\EquipmentInspection;
use App\Modules\Equipment\Models\EquipmentInspectionItem;
use App\Modules\Equipment\Models\EquipmentBreakdown;
use App\Modules\Equipment\Models\MaintenanceSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EquipmentController extends Controller
{
    // ===== Categories =====

    public function indexCategories(Request $request, Workspace $workspace): JsonResponse
    {
        $categories = EquipmentCategory::where('workspace_id', $workspace->id)
            ->withCount('equipment')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $categories]);
    }

    public function storeCategory(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:equipment_categories,name,NULL,id,workspace_id,' . $workspace->id,
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|max:20',
            'icon' => 'nullable|string|max:100',
        ]);

        $category = EquipmentCategory::create(array_merge(
            $validated,
            ['workspace_id' => $workspace->id]
        ));

        return response()->json(['data' => $category], 201);
    }

    public function showCategory(Workspace $workspace, string $category): JsonResponse
    {
        $category = EquipmentCategory::where('workspace_id', $workspace->id)
            ->with('equipment')
            ->findOrFail($category);

        return response()->json(['data' => $category]);
    }

    public function updateCategory(Request $request, Workspace $workspace, string $category): JsonResponse
    {
        $category = EquipmentCategory::where('workspace_id', $workspace->id)
            ->findOrFail($category);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|max:20',
            'icon' => 'nullable|string|max:100',
        ]);

        $category->update($validated);

        return response()->json(['data' => $category]);
    }

    public function destroyCategory(Workspace $workspace, string $category): JsonResponse
    {
        $category = EquipmentCategory::where('workspace_id', $workspace->id)
            ->findOrFail($category);

        $category->delete();

        return response()->json(null, 204);
    }

    // ===== Equipment =====

    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = Equipment::where('equipment.workspace_id', $workspace->id)
            ->with('category');

        if ($request->filled('status')) {
            $query->where('equipment.status', $request->status);
        }
        if ($request->filled('category_id')) {
            $query->where('equipment.category_id', $request->category_id);
        }
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($b) use ($q) {
                $b->where('equipment.name', 'ilike', "%{$q}%")
                  ->orWhere('equipment.plant_number', 'ilike', "%{$q}%")
                  ->orWhere('equipment.serial_number', 'ilike', "%{$q}%");
            });
        }

        $equipment = $query->orderBy('equipment.plant_number')->paginate(50);

        return response()->json($equipment);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => 'nullable|string|exists:equipment_categories,id',
            'plant_number' => 'required|string|max:100',
            'name' => 'required|string|max:255',
            'make' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'year' => 'nullable|integer|min:1900|max:2099',
            'location' => 'nullable|string|max:255',
            'status' => 'sometimes|string|max:30',
            'purchase_date' => 'nullable|date',
            'purchase_cost' => 'nullable|numeric|min:0',
            'warranty_expiry' => 'nullable|date',
            'notes' => 'nullable|string|max:5000',
            'metadata' => 'nullable|array',
        ]);

        $validated['workspace_id'] = $workspace->id;

        $equipment = Equipment::create($validated);

        return response()->json(['data' => $equipment], 201);
    }

    public function show(Workspace $workspace, string $equipment): JsonResponse
    {
        $equipment = Equipment::where('workspace_id', $workspace->id)
            ->with(['category', 'inspections.items', 'breakdowns', 'maintenanceSchedules'])
            ->findOrFail($equipment);

        return response()->json(['data' => $equipment]);
    }

    public function update(Request $request, Workspace $workspace, string $equipment): JsonResponse
    {
        $equipment = Equipment::where('workspace_id', $workspace->id)
            ->findOrFail($equipment);

        $validated = $request->validate([
            'category_id' => 'nullable|string|exists:equipment_categories,id',
            'plant_number' => 'sometimes|required|string|max:100',
            'name' => 'sometimes|required|string|max:255',
            'make' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'year' => 'nullable|integer|min:1900|max:2099',
            'location' => 'nullable|string|max:255',
            'status' => 'sometimes|string|max:30',
            'purchase_date' => 'nullable|date',
            'purchase_cost' => 'nullable|numeric|min:0',
            'warranty_expiry' => 'nullable|date',
            'notes' => 'nullable|string|max:5000',
            'metadata' => 'nullable|array',
        ]);

        $equipment->update($validated);

        return response()->json(['data' => $equipment]);
    }

    public function destroy(Workspace $workspace, string $equipment): JsonResponse
    {
        $equipment = Equipment::where('workspace_id', $workspace->id)
            ->findOrFail($equipment);

        $equipment->delete();

        return response()->json(null, 204);
    }

    // ===== Inspections =====

    public function indexInspections(Request $request, Workspace $workspace, string $equipment): JsonResponse
    {
        Equipment::where('workspace_id', $workspace->id)->findOrFail($equipment);

        $inspections = EquipmentInspection::where('equipment_id', $equipment)
            ->with('inspector')
            ->withCount('items')
            ->orderBy('inspected_at', 'desc')
            ->get();

        return response()->json(['data' => $inspections]);
    }

    public function storeInspection(Request $request, Workspace $workspace, string $equipment): JsonResponse
    {
        Equipment::where('workspace_id', $workspace->id)->findOrFail($equipment);

        $validated = $request->validate([
            'inspected_by' => 'nullable|string|exists:users,id',
            'shift' => 'nullable|string|max:20',
            'status' => 'sometimes|string|max:30',
            'notes' => 'nullable|string|max:5000',
            'inspected_at' => 'sometimes|date',
            'items' => 'sometimes|array',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.passed' => 'required|boolean',
            'items.*.notes' => 'nullable|string|max:1000',
        ]);

        $inspection = EquipmentInspection::create([
            'workspace_id' => $workspace->id,
            'equipment_id' => $equipment,
            'inspected_by' => $validated['inspected_by'] ?? $request->user()->id,
            'shift' => $validated['shift'] ?? null,
            'status' => $validated['status'] ?? 'passed',
            'notes' => $validated['notes'] ?? null,
            'inspected_at' => $validated['inspected_at'] ?? now(),
        ]);

        if (! empty($validated['items'])) {
            foreach ($validated['items'] as $i => $item) {
                EquipmentInspectionItem::create([
                    'inspection_id' => $inspection->id,
                    'item_name' => $item['item_name'],
                    'passed' => $item['passed'],
                    'notes' => $item['notes'] ?? null,
                    'position' => $i,
                ]);
            }
        }

        $inspection->load('items');

        return response()->json(['data' => $inspection], 201);
    }

    public function showInspection(Workspace $workspace, string $inspection): JsonResponse
    {
        $inspection = EquipmentInspection::whereHas('equipment', fn ($q) => $q->where('workspace_id', $workspace->id))
            ->with(['equipment', 'inspector', 'items'])
            ->findOrFail($inspection);

        return response()->json(['data' => $inspection]);
    }

    // ===== Breakdowns =====

    public function indexBreakdowns(Request $request, Workspace $workspace, string $equipment): JsonResponse
    {
        Equipment::where('workspace_id', $workspace->id)->findOrFail($equipment);

        $breakdowns = EquipmentBreakdown::where('equipment_id', $equipment)
            ->with('reporter')
            ->orderBy('reported_at', 'desc')
            ->get();

        return response()->json(['data' => $breakdowns]);
    }

    public function storeBreakdown(Request $request, Workspace $workspace, string $equipment): JsonResponse
    {
        Equipment::where('workspace_id', $workspace->id)->findOrFail($equipment);

        $validated = $request->validate([
            'description' => 'required|string|max:5000',
            'root_cause' => 'nullable|string|max:5000',
            'action_taken' => 'nullable|string|max:5000',
            'downtime_minutes' => 'nullable|integer|min:0',
            'status' => 'sometimes|string|max:30',
        ]);

        $breakdown = EquipmentBreakdown::create([
            'workspace_id' => $workspace->id,
            'equipment_id' => $equipment,
            'reported_by' => $request->user()->id,
            'description' => $validated['description'],
            'root_cause' => $validated['root_cause'] ?? null,
            'action_taken' => $validated['action_taken'] ?? null,
            'downtime_minutes' => $validated['downtime_minutes'] ?? null,
            'status' => $validated['status'] ?? 'reported',
            'reported_at' => now(),
        ]);

        return response()->json(['data' => $breakdown], 201);
    }

    public function updateBreakdown(Request $request, Workspace $workspace, string $breakdown): JsonResponse
    {
        $breakdown = EquipmentBreakdown::whereHas('equipment', fn ($q) => $q->where('workspace_id', $workspace->id))
            ->findOrFail($breakdown);

        $validated = $request->validate([
            'root_cause' => 'nullable|string|max:5000',
            'action_taken' => 'nullable|string|max:5000',
            'downtime_minutes' => 'nullable|integer|min:0',
            'status' => 'sometimes|string|max:30',
            'resolved_at' => 'nullable|date',
        ]);

        if (($validated['status'] ?? null) === 'resolved' && ! $breakdown->resolved_at) {
            $validated['resolved_at'] = now();
        }

        $breakdown->update($validated);

        return response()->json(['data' => $breakdown]);
    }

    // ===== Maintenance Schedules =====

    public function indexSchedules(Request $request, Workspace $workspace, string $equipment): JsonResponse
    {
        Equipment::where('workspace_id', $workspace->id)->findOrFail($equipment);

        $schedules = MaintenanceSchedule::where('equipment_id', $equipment)
            ->orderBy('next_due_at')
            ->get();

        return response()->json(['data' => $schedules]);
    }

    public function storeSchedule(Request $request, Workspace $workspace, string $equipment): JsonResponse
    {
        Equipment::where('workspace_id', $workspace->id)->findOrFail($equipment);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'frequency_type' => 'required|string|in:hours,days,weeks,months',
            'frequency_value' => 'required|integer|min:1',
            'trigger_type' => 'sometimes|string|in:meter,calendar',
            'last_performed_at' => 'nullable|date',
            'next_due_at' => 'nullable|date',
            'last_meter_reading' => 'nullable|integer|min:0',
            'template_id' => 'nullable|string|exists:job_card_templates,id',
            'is_active' => 'sometimes|boolean',
            'notes' => 'nullable|string|max:5000',
        ]);

        $schedule = MaintenanceSchedule::create(array_merge(
            $validated,
            ['workspace_id' => $workspace->id, 'equipment_id' => $equipment]
        ));

        return response()->json(['data' => $schedule], 201);
    }

    public function updateSchedule(Request $request, Workspace $workspace, string $schedule): JsonResponse
    {
        $schedule = MaintenanceSchedule::whereHas('equipment', fn ($q) => $q->where('workspace_id', $workspace->id))
            ->findOrFail($schedule);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'frequency_type' => 'sometimes|required|string|in:hours,days,weeks,months',
            'frequency_value' => 'sometimes|required|integer|min:1',
            'trigger_type' => 'sometimes|string|in:meter,calendar',
            'last_performed_at' => 'nullable|date',
            'next_due_at' => 'nullable|date',
            'last_meter_reading' => 'nullable|integer|min:0',
            'template_id' => 'nullable|string|exists:job_card_templates,id',
            'is_active' => 'sometimes|boolean',
            'notes' => 'nullable|string|max:5000',
        ]);

        $schedule->update($validated);

        return response()->json(['data' => $schedule]);
    }

    public function destroySchedule(Workspace $workspace, string $schedule): JsonResponse
    {
        $schedule = MaintenanceSchedule::whereHas('equipment', fn ($q) => $q->where('workspace_id', $workspace->id))
            ->findOrFail($schedule);

        $schedule->delete();

        return response()->json(null, 204);
    }
}
