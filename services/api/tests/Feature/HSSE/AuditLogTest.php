<?php

use App\Core\Models\AuditLog;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\HSSE\Models\CorrectiveAction;
use App\Modules\HSSE\Models\Hazard;
use App\Modules\HSSE\Models\Incident;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($this->user);
});

it('writes an audit log when an incident is reported', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents",
        [
            'title' => 'Slip and fall at shaft entrance',
            'description' => 'Worker slipped on wet surface near shaft 1 entrance',
            'type' => 'first_aid',
            'severity' => 'medium',
            'occurred_at' => now()->subHour()->toIso8601String(),
            'location' => 'Shaft 1 entrance',
            'coida_reportable' => true,
        ]
    );

    $response->assertStatus(201);
    $incident = Incident::withoutGlobalScopes()->firstOrFail();

    $log = AuditLog::where('resource_type', 'incident')
        ->where('resource_id', $incident->id)
        ->where('action', 'hsse.incident.reported')
        ->firstOrFail();

    expect($log->workspace_id)->toBe($this->workspace->id);
    expect($log->user_id)->toBe($this->user->id);
    expect($log->after)->toHaveKey('reference');
    expect($log->meta['coida_reportable'])->toBeTrue();
});

it('writes a separate audit action when an incident is closed', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
    ]);

    $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents/{$incident->id}",
        ['status' => 'closed']
    )->assertStatus(200);

    $log = AuditLog::where('resource_type', 'incident')
        ->where('resource_id', $incident->id)
        ->where('action', 'hsse.incident.closed')
        ->firstOrFail();

    expect($log->before['status'])->toBe($incident->getOriginal('status'));
    expect($log->after['status'])->toBe('closed');
});

it('writes audit log on hazard identification with risk metadata', function () {
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hsse/hazards",
        [
            'title' => 'Unprotected edge on conveyor',
            'description' => 'Edge drop not guarded per MHSA S.21',
            'category' => 'mechanical',
            'likelihood' => 4,
            'severity' => 5,
        ]
    )->assertStatus(201);

    $hazard = Hazard::firstOrFail();
    expect($hazard->risk_level)->toBe('extreme');

    $log = AuditLog::where('resource_type', 'hazard')
        ->where('resource_id', $hazard->id)
        ->where('action', 'hsse.hazard.identified')
        ->firstOrFail();

    expect($log->meta['risk_score'])->toBe(20);
});

it('writes distinct audit actions when a corrective action is completed vs verified', function () {
    $action = CorrectiveAction::factory()->create([
        'workspace_id' => $this->workspace->id,
        'assigned_to' => $this->user->id,
        'status' => CorrectiveAction::STATUS_OPEN,
    ]);

    $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hsse/corrective-actions/{$action->id}",
        ['status' => 'completed', 'completion_evidence' => 'Done — guard rails installed']
    )->assertStatus(200);

    $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hsse/corrective-actions/{$action->id}",
        ['status' => 'verified']
    )->assertStatus(200);

    $actions = AuditLog::where('resource_id', $action->id)
        ->orderBy('created_at')
        ->pluck('action')
        ->all();

    expect($actions)->toContain('hsse.corrective_action.completed');
    expect($actions)->toContain('hsse.corrective_action.verified');
});
