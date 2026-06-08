<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\HSSE\Models\CorrectiveAction;
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

it('creates all incident types returning 201 each', function () {
    $types = Incident::$types;

    foreach ($types as $type) {
        $response = $this->postJson(
            "/api/workspaces/{$this->workspace->id}/hsse/incidents",
            [
                'title' => "Test {$type} incident",
                'description' => "A test {$type} incident for QA validation.",
                'type' => $type,
                'severity' => Incident::SEVERITY_MEDIUM,
                'occurred_at' => now()->subHour()->toIso8601String(),
                'location' => 'Workshop Bay 2',
            ]
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.type', $type)
            ->assertJsonPath('data.status', 'open');
    }
});

it('assigns an investigator to an incident returning 200', function () {
    $investigator = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $investigator->id,
        'role' => 'admin',
    ]);

    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'status' => Incident::STATUS_OPEN,
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents/{$incident->id}",
        [
            'investigator_id' => $investigator->id,
        ]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.investigator_id', $investigator->id);
});

it('adds a root cause to an incident returning 200', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents/{$incident->id}",
        [
            'root_cause' => 'Inadequate lockout-tagout procedure not followed by shift supervisor.',
            'immediate_cause' => 'Worker bypassed isolation switch without authorisation.',
        ]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.root_cause', 'Inadequate lockout-tagout procedure not followed by shift supervisor.')
        ->assertJsonPath('data.immediate_cause', 'Worker bypassed isolation switch without authorisation.');
});

it('adds corrective actions to an incident returning 200', function () {
    $assignee = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $assignee->id,
        'role' => 'member',
    ]);

    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hsse/corrective-actions",
        [
            'source_type' => 'incident',
            'source_id' => $incident->id,
            'description' => 'Implement mandatory LOTO training for all shift supervisors.',
            'assigned_to' => $assignee->id,
            'priority' => CorrectiveAction::PRIORITY_HIGH,
            'due_date' => now()->addWeeks(2)->toDateString(),
        ]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.source_type', 'incident')
        ->assertJsonPath('data.source_id', $incident->id)
        ->assertJsonPath('data.status', 'open');
});

it('closes an incident returning 200', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'status' => Incident::STATUS_INVESTIGATING,
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents/{$incident->id}",
        [
            'status' => Incident::STATUS_CLOSED,
            'root_cause' => 'Wet floor due to leaking pipe — inadequate drainage.',
        ]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'closed');

    expect($response->json('data.closed_at'))->not->toBeNull();
});

it('sets DMR reportable flag correctly for reportable types', function () {
    $reportable = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'type' => Incident::TYPE_FATALITY,
        'coida_reportable' => true,
    ]);

    expect($reportable->coida_reportable)->toBeTrue();

    $nonReportable = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'type' => Incident::TYPE_FIRST_AID,
        'coida_reportable' => false,
    ]);

    expect($nonReportable->coida_reportable)->toBeFalse();
});

it('fails with 422 when required fields are missing on create', function () {
    $fields = ['title', 'type', 'severity', 'occurred_at'];
    $payloads = [
        ['description' => 'missing title'],
        ['title' => 'Test', 'description' => 'missing type', 'severity' => 'medium', 'occurred_at' => now()->toIso8601String()],
        ['title' => 'Test', 'description' => 'missing severity', 'type' => 'first_aid', 'occurred_at' => now()->toIso8601String()],
        ['title' => 'Test', 'description' => 'missing occurred_at', 'type' => 'first_aid', 'severity' => 'medium'],
    ];

    foreach ($payloads as $payload) {
        $response = $this->postJson(
            "/api/workspaces/{$this->workspace->id}/hsse/incidents",
            $payload
        );

        $response->assertStatus(422);
    }
});

it('lists incidents filtered by type', function () {
    Incident::factory()->count(3)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'type' => Incident::TYPE_NEAR_MISS,
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'type' => Incident::TYPE_FATALITY,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents?type=near_miss"
    );

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');

    foreach ($response->json('data') as $incident) {
        expect($incident['type'])->toBe('near_miss');
    }
});

it('fails with 422 for invalid incident type', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents",
        [
            'title' => 'Invalid type test',
            'description' => 'Should fail.',
            'type' => 'not_a_valid_type',
            'severity' => Incident::SEVERITY_MEDIUM,
            'occurred_at' => now()->toIso8601String(),
        ]
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['type']);
});

it('adds contributing factors to an incident', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents/{$incident->id}",
        [
            'contributing_factors' => [
                'Inadequate PPE',
                'Insufficient training',
                'Equipment failure',
            ],
        ]
    );

    $response->assertStatus(200);

    expect($response->json('data.contributing_factors'))->toHaveCount(3);
});

it('creates each DMR-reportable incident type explicitly', function () {
    $reportableTypes = [
        Incident::TYPE_FATALITY,
        Incident::TYPE_LOST_TIME,
        Incident::TYPE_MEDICAL_TREATMENT,
        Incident::TYPE_NEAR_MISS,
    ];

    foreach ($reportableTypes as $type) {
        $response = $this->postJson(
            "/api/workspaces/{$this->workspace->id}/hsse/incidents",
            [
                'title' => "Reportable {$type} incident",
                'description' => "A {$type} incident for DMR reportability validation.",
                'type' => $type,
                'severity' => Incident::SEVERITY_HIGH,
                'occurred_at' => now()->subHour()->toIso8601String(),
                'location' => 'Workshop Bay 1',
                'coida_reportable' => true,
            ]
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.type', $type)
            ->assertJsonPath('data.coida_reportable', true);
    }
});

it('creates dangerous occurrence and environmental incident types', function () {
    $extraTypes = [
        Incident::TYPE_PROPERTY_DAMAGE,
        Incident::TYPE_ENVIRONMENTAL,
    ];

    foreach ($extraTypes as $type) {
        $response = $this->postJson(
            "/api/workspaces/{$this->workspace->id}/hsse/incidents",
            [
                'title' => "Test {$type} incident",
                'description' => "Creating a {$type} incident for QA.",
                'type' => $type,
                'severity' => Incident::SEVERITY_MEDIUM,
                'occurred_at' => now()->subHour()->toIso8601String(),
                'location' => 'Site Perimeter',
            ]
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.type', $type);
    }
});

it('lists incidents filtered by status', function () {
    Incident::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'status' => Incident::STATUS_OPEN,
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'status' => Incident::STATUS_CLOSED,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents?status=open"
    );

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('returns 404 for incident from different workspace', function () {
    $otherWorkspace = Workspace::factory()->create();
    $incident = Incident::factory()->create([
        'workspace_id' => $otherWorkspace->id,
        'reporter_id' => $this->user->id,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents/{$incident->id}"
    );

    $response->assertStatus(404);
});
