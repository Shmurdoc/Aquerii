<?php

namespace App\Modules\PTW\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Core\Services\AuditService;
use App\Core\Services\ReferenceSequenceService;
use App\Modules\PTW\Models\Permit;
use App\Modules\PTW\Models\PermitHazard;
use App\Modules\PTW\Models\PermitIsolation;
use App\Modules\PTW\Services\DmrPermitRegisterService;
use App\Modules\PTW\Services\PermitWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PermitController extends Controller
{
    public function __construct(
        private ReferenceSequenceService $sequences,
        private AuditService $audit,
        private PermitWorkflowService $workflow,
        private DmrPermitRegisterService $dmrRegister,
    ) {}

    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $this->assertMember($request, $workspace);

        $query = Permit::where('workspace_id', $workspace->id)
            ->with(['issuer:id,name', 'approver:id,name', 'holder:id,name']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($risk = $request->query('risk_level')) {
            $query->where('risk_level', $risk);
        }
        if ($active = $request->query('active')) {
            $query->whereIn('status', [Permit::STATUS_ISSUED, Permit::STATUS_ACTIVE]);
        }

        $permits = $query->orderByDesc('created_at')
            ->limit((int) $request->query('limit', 100))
            ->get();

        return response()->json(['data' => $permits]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $this->assertMember($request, $workspace);

        $validated = $request->validate([
            'type' => 'required|string|in:'.implode(',', Permit::$types),
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'location' => 'required|string|max:255',
            'location_details' => 'nullable|array',
            'equipment_id' => 'nullable|string|max:100',
            'risk_level' => 'required|string|in:'.implode(',', Permit::$riskLevels),
            'pre_conditions' => 'nullable|array',
            'pre_conditions.*' => 'string',
            'work_method_statement' => 'required|string',
            'ppe_required' => 'required|string',
            'hazards' => 'nullable|array',
            'hazards.*.description' => 'required_with:hazards|string',
            'hazards.*.control_measure' => 'required_with:hazards|string',
            'hazards.*.residual_risk' => 'required_with:hazards|string|in:'.implode(',', PermitHazard::$residualRisks),
            'isolations' => 'nullable|array',
            'isolations.*.isolation_point' => 'required_with:isolations|string',
            'isolations.*.energy_type' => 'required_with:isolations|string|in:'.implode(',', PermitIsolation::$energyTypes),
            'isolations.*.method' => 'required_with:isolations|string',
            'isolations.*.lock_number' => 'nullable|string',
            'isolations.*.tag_number' => 'nullable|string',
        ]);

        $permit = DB::transaction(function () use ($request, $workspace, $validated) {
            $permit = Permit::create([
                'workspace_id' => $workspace->id,
                'reference' => $this->sequences->next(
                    $workspace->id,
                    ReferenceSequenceService::ENTITY_PERMIT
                ),
                'type' => $validated['type'],
                'status' => Permit::STATUS_DRAFT,
                'title' => $validated['title'],
                'description' => $validated['description'],
                'location' => $validated['location'],
                'location_details' => $validated['location_details'] ?? null,
                'equipment_id' => $validated['equipment_id'] ?? null,
                'issuer_id' => $request->user()->id,
                'risk_level' => $validated['risk_level'],
                'pre_conditions' => $validated['pre_conditions'] ?? null,
                'work_method_statement' => $validated['work_method_statement'],
                'ppe_required' => $validated['ppe_required'],
            ]);

            foreach (($validated['hazards'] ?? []) as $i => $h) {
                PermitHazard::create([
                    'workspace_id' => $workspace->id,
                    'permit_id' => $permit->id,
                    'description' => $h['description'],
                    'control_measure' => $h['control_measure'],
                    'residual_risk' => $h['residual_risk'],
                    'sort_order' => $i,
                ]);
            }

            foreach (($validated['isolations'] ?? []) as $i) {
                PermitIsolation::create([
                    'workspace_id' => $workspace->id,
                    'permit_id' => $permit->id,
                    'isolation_point' => $i['isolation_point'],
                    'energy_type' => $i['energy_type'],
                    'method' => $i['method'],
                    'lock_number' => $i['lock_number'] ?? null,
                    'tag_number' => $i['tag_number'] ?? null,
                ]);
            }

            return $permit;
        });

        $permit->load(['issuer:id,name', 'hazards', 'isolations']);

        $this->audit->log(
            action: 'ptw.permit.created',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'permit',
            resourceId: $permit->id,
            after: $permit->only(['reference', 'type', 'status', 'risk_level']),
            meta: [
                'hazard_count' => $permit->hazards->count(),
                'isolation_count' => $permit->isolations->count(),
                'is_high_risk' => $permit->isHighRisk(),
            ],
        );

        return response()->json(['data' => $permit], 201);
    }

    public function show(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        $this->assertPermitBelongs($request, $workspace, $permit);

        $permit->load([
            'issuer:id,name', 'approver:id,name', 'holder:id,name',
            'recipient:id,name', 'closer:id,name',
            'hazards', 'isolations',
        ]);

        $available = $this->workflow->availableTransitions($permit, $request->user());

        return response()->json([
            'data' => $permit,
            'available_transitions' => $available,
        ]);
    }

    public function update(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        $this->assertPermitBelongs($request, $workspace, $permit);

        if (! in_array($permit->status, [Permit::STATUS_DRAFT, Permit::STATUS_REJECTED], true)) {
            throw ValidationException::withMessages([
                'status' => 'Only draft or rejected permits can be edited.',
            ]);
        }

        $validated = $request->validate([
            'type' => 'sometimes|string|in:'.implode(',', Permit::$types),
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'location' => 'sometimes|string|max:255',
            'location_details' => 'nullable|array',
            'equipment_id' => 'nullable|string|max:100',
            'risk_level' => 'sometimes|string|in:'.implode(',', Permit::$riskLevels),
            'pre_conditions' => 'nullable|array',
            'work_method_statement' => 'sometimes|string',
            'ppe_required' => 'sometimes|string',
        ]);

        $permit->update($validated);
        $permit->refresh();

        $this->audit->log(
            action: 'ptw.permit.updated',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'permit',
            resourceId: $permit->id,
            before: ['status' => $permit->getOriginal('status')],
            after: ['status' => $permit->status, 'risk_level' => $permit->risk_level],
            meta: ['reference' => $permit->reference],
        );

        return response()->json(['data' => $permit]);
    }

    public function destroy(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        $this->assertPermitBelongs($request, $workspace, $permit);

        if ($permit->status !== Permit::STATUS_DRAFT) {
            throw ValidationException::withMessages([
                'status' => 'Only draft permits can be deleted. Use close to terminate an issued permit.',
            ]);
        }

        $reference = $permit->reference;
        $permit->delete();

        $this->audit->log(
            action: 'ptw.permit.deleted',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'permit',
            resourceId: $permit->id,
            before: ['reference' => $reference],
        );

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function transitions(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        $this->assertPermitBelongs($request, $workspace, $permit);

        return response()->json([
            'data' => $this->workflow->availableTransitions($permit, $request->user()),
        ]);
    }

    public function request(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        return $this->applyTransition($request, $workspace, $permit, PermitWorkflowService::TRANSITION_REQUEST);
    }

    public function approve(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        $meta = [];
        if ($request->has('approver_id')) {
            $validated = $request->validate(['approver_id' => 'required|uuid']);
            $meta['approver_id'] = $validated['approver_id'];
        }

        return $this->applyTransition(
            $request, $workspace, $permit,
            PermitWorkflowService::TRANSITION_APPROVE, meta: $meta
        );
    }

    public function reject(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        $request->validate(['reason' => 'required|string|min:3|max:1000']);

        return $this->applyTransition(
            $request, $workspace, $permit,
            PermitWorkflowService::TRANSITION_REJECT,
            reason: $request->input('reason')
        );
    }

    public function issue(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        $validated = $request->validate([
            'valid_from' => 'sometimes|date',
            'valid_until' => 'required|date|after:now',
            'max_extension_minutes' => 'sometimes|integer|min:0|max:1440',
            'holder_id' => 'sometimes|uuid',
            'recipient_id' => 'sometimes|uuid',
        ]);

        $permit->fill([
            'holder_id' => $validated['holder_id'] ?? $permit->holder_id,
            'recipient_id' => $validated['recipient_id'] ?? $permit->recipient_id,
        ])->save();

        return $this->applyTransition(
            $request, $workspace, $permit,
            PermitWorkflowService::TRANSITION_ISSUE, meta: [
                'valid_from' => isset($validated['valid_from']) ? Carbon::parse($validated['valid_from']) : null,
                'valid_until' => Carbon::parse($validated['valid_until']),
                'max_extension_minutes' => $validated['max_extension_minutes'] ?? 60,
            ]
        );
    }

    public function activate(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        return $this->applyTransition(
            $request, $workspace, $permit,
            PermitWorkflowService::TRANSITION_ACTIVATE
        );
    }

    public function suspend(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        $request->validate(['reason' => 'required|string|min:3|max:1000']);

        return $this->applyTransition(
            $request, $workspace, $permit,
            PermitWorkflowService::TRANSITION_SUSPEND,
            reason: $request->input('reason')
        );
    }

    public function resume(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        return $this->applyTransition(
            $request, $workspace, $permit,
            PermitWorkflowService::TRANSITION_RESUME
        );
    }

    public function close(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        $request->validate(['notes' => 'required|string|min:3|max:2000']);

        return $this->applyTransition(
            $request, $workspace, $permit,
            PermitWorkflowService::TRANSITION_CLOSE,
            reason: $request->input('notes')
        );
    }

    public function addHazard(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        $this->assertPermitBelongs($request, $workspace, $permit);

        $validated = $request->validate([
            'description' => 'required|string',
            'control_measure' => 'required|string',
            'residual_risk' => 'required|string|in:'.implode(',', PermitHazard::$residualRisks),
            'hazard_id' => 'nullable|uuid',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $hazard = PermitHazard::create([
            'workspace_id' => $workspace->id,
            'permit_id' => $permit->id,
            'hazard_id' => $validated['hazard_id'] ?? null,
            'description' => $validated['description'],
            'control_measure' => $validated['control_measure'],
            'residual_risk' => $validated['residual_risk'],
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        $this->audit->log(
            action: 'ptw.permit.hazard_added',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'permit',
            resourceId: $permit->id,
            after: $hazard->only(['description', 'residual_risk']),
            meta: ['reference' => $permit->reference],
        );

        return response()->json(['data' => $hazard], 201);
    }

    public function verifyHazard(Request $request, Workspace $workspace, Permit $permit, string $hazardId): JsonResponse
    {
        $this->assertPermitBelongs($request, $workspace, $permit);

        $hazard = PermitHazard::where('id', $hazardId)
            ->where('permit_id', $permit->id)
            ->where('workspace_id', $workspace->id)
            ->firstOrFail();

        $hazard->update([
            'verified' => true,
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);

        $this->audit->log(
            action: 'ptw.permit.hazard_verified',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'permit',
            resourceId: $permit->id,
            after: ['hazard_id' => $hazard->id, 'residual_risk' => $hazard->residual_risk],
            meta: ['reference' => $permit->reference],
        );

        return response()->json(['data' => $hazard]);
    }

    public function addIsolation(Request $request, Workspace $workspace, Permit $permit): JsonResponse
    {
        $this->assertPermitBelongs($request, $workspace, $permit);

        $validated = $request->validate([
            'isolation_point' => 'required|string|max:255',
            'energy_type' => 'required|string|in:'.implode(',', PermitIsolation::$energyTypes),
            'method' => 'required|string',
            'lock_number' => 'nullable|string|max:100',
            'tag_number' => 'nullable|string|max:100',
        ]);

        $isolation = PermitIsolation::create([
            'workspace_id' => $workspace->id,
            'permit_id' => $permit->id,
            'isolation_point' => $validated['isolation_point'],
            'energy_type' => $validated['energy_type'],
            'method' => $validated['method'],
            'lock_number' => $validated['lock_number'] ?? null,
            'tag_number' => $validated['tag_number'] ?? null,
            'applied_by' => $request->user()->id,
            'applied_at' => now(),
        ]);

        $this->audit->log(
            action: 'ptw.permit.isolation_applied',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'permit',
            resourceId: $permit->id,
            after: $isolation->only(['isolation_point', 'energy_type', 'lock_number', 'tag_number']),
            meta: ['reference' => $permit->reference],
        );

        return response()->json(['data' => $isolation], 201);
    }

    public function removeIsolation(Request $request, Workspace $workspace, Permit $permit, string $isolationId): JsonResponse
    {
        $this->assertPermitBelongs($request, $workspace, $permit);

        $isolation = PermitIsolation::where('id', $isolationId)
            ->where('permit_id', $permit->id)
            ->where('workspace_id', $workspace->id)
            ->firstOrFail();

        $isolation->update([
            'removed_by' => $request->user()->id,
            'removed_at' => now(),
        ]);

        $this->audit->log(
            action: 'ptw.permit.isolation_removed',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'permit',
            resourceId: $permit->id,
            before: ['isolation_id' => $isolation->id, 'energy_type' => $isolation->energy_type],
            meta: ['reference' => $permit->reference],
        );

        return response()->json(['data' => $isolation]);
    }

    public function register(Request $request, Workspace $workspace): Response
    {
        $this->assertMember($request, $workspace);

        $request->validate([
            'from' => 'sometimes|date',
            'to' => 'sometimes|date|after_or_equal:from',
        ]);

        $register = $this->dmrRegister->buildRegister(
            $workspace->id,
            $request->query('from') ? Carbon::parse($request->query('from')) : null,
            $request->query('to') ? Carbon::parse($request->query('to')) : null,
        );

        $this->audit->log(
            action: 'ptw.register.generated',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'permit_register',
            resourceId: $workspace->id,
            meta: [
                'period' => $register['register']['period'],
                'total' => $register['register']['summary']['total'],
            ],
        );

        if ($request->query('format') === 'csv') {
            $csv = $this->dmrRegister->toCsv($register);

            return response($csv, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="dmr-permit-register-'.now()->format('Ymd').'.csv"',
            ]);
        }

        return response()->json($register);
    }

    private function applyTransition(
        Request $request,
        Workspace $workspace,
        Permit $permit,
        string $action,
        ?string $reason = null,
        array $meta = []
    ): JsonResponse {
        $this->assertPermitBelongs($request, $workspace, $permit);

        $updated = $this->workflow->transition(
            $permit, $action, $request->user(), $reason, $meta
        );

        return response()->json(['data' => $updated]);
    }

    private function assertMember(Request $request, Workspace $workspace): void
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );
    }

    private function assertPermitBelongs(Request $request, Workspace $workspace, Permit $permit): void
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $permit->workspace_id === $workspace->id,
            404
        );
    }
}
