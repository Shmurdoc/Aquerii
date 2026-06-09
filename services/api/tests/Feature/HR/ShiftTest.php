<?php

use App\Core\Models\Shift;
use App\Core\Models\ShiftAssignment;
use App\Core\Models\ShiftHandover;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Support\Str;
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

// ===== Shift Definitions =====

it('creates a shift type', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/shifts",
        [
            'name' => 'Day Shift',
            'start_time' => '06:00',
            'end_time' => '14:00',
            'duration_hours' => 8,
            'type' => 'day',
            'color' => '#FFD700',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Day Shift');
});

it('lists shift types', function () {
    Shift::factory()->count(3)->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/shifts");

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('updates a shift type', function () {
    $shift = Shift::factory()->create(['workspace_id' => $this->workspace->id, 'name' => 'Day Shift']);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hr/shifts/{$shift->id}",
        ['name' => 'Early Shift'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Early Shift');
});

it('deletes a shift type', function () {
    $shift = Shift::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/hr/shifts/{$shift->id}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(204);
});

// ===== Shift Assignments =====

it('assigns a user to a shift', function () {
    $shift = Shift::factory()->create(['workspace_id' => $this->workspace->id]);
    $employee = User::factory()->create();

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/shifts/assignments",
        [
            'shift_id' => $shift->id,
            'user_id' => $employee->id,
            'date' => now()->addDay()->toDateString(),
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.status', 'scheduled');
});

it('bulk assigns users to a shift', function () {
    $shift = Shift::factory()->create(['workspace_id' => $this->workspace->id]);
    $employees = User::factory()->count(3)->create();

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/shifts/assignments/bulk",
        [
            'shift_id' => $shift->id,
            'user_ids' => $employees->pluck('id')->toArray(),
            'date' => now()->addDay()->toDateString(),
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201);
    expect($response->json('data'))->toHaveCount(3);
});

it('lists assignments filtered by date', function () {
    $shift = Shift::factory()->create(['workspace_id' => $this->workspace->id]);
    $date = now()->addDay()->toDateString();
    ShiftAssignment::factory()->create([
        'workspace_id' => $this->workspace->id,
        'shift_id' => $shift->id,
        'user_id' => $this->user->id,
        'date' => $date,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/hr/shifts/assignments?date={$date}"
    );

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(1);
});

it('rejects duplicate assignment for same user and date', function () {
    $shift = Shift::factory()->create(['workspace_id' => $this->workspace->id]);
    $date = now()->addDay()->toDateString();

    ShiftAssignment::factory()->create([
        'workspace_id' => $this->workspace->id,
        'shift_id' => $shift->id,
        'user_id' => $this->user->id,
        'date' => $date,
        'status' => 'scheduled',
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/shifts/assignments",
        [
            'shift_id' => $shift->id,
            'user_id' => $this->user->id,
            'date' => $date,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422);
});

// ===== Shift Handovers =====

it('creates a shift handover', function () {
    $shift = Shift::factory()->create(['workspace_id' => $this->workspace->id]);
    $date = now()->toDateString();
    $assignment = ShiftAssignment::factory()->create([
        'workspace_id' => $this->workspace->id,
        'shift_id' => $shift->id,
        'user_id' => $this->user->id,
        'date' => $date,
    ]);
    $incomingUser = User::factory()->create();

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/shifts/handovers",
        [
            'from_assignment_id' => $assignment->id,
            'incoming_user_id' => $incomingUser->id,
            'departing_notes' => 'Crusher vibrating excessively, monitor throughout shift. All other equipment nominal.',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.departing_user_id', $this->user->id);
});

it('acknowledges a shift handover', function () {
    $incomingUser = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $incomingUser->id,
        'role' => 'member',
    ]);
    $handover = ShiftHandover::factory()->create([
        'workspace_id' => $this->workspace->id,
        'departing_user_id' => $this->user->id,
        'incoming_user_id' => $incomingUser->id,
        'status' => 'pending',
    ]);

    Sanctum::actingAs($incomingUser);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/shifts/handovers/{$handover->id}/acknowledge",
        ['incoming_notes' => 'Acknowledged, will monitor crusher.'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'acknowledged');
});

it('lists handovers', function () {
    ShiftHandover::factory()->count(2)->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/shifts/handovers");

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(2);
});

it('rejects cross-workspace shift access', function () {
    $otherWorkspace = Workspace::factory()->create();
    $shift = Shift::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$otherWorkspace->id}/hr/shifts/{$shift->id}");

    $response->assertStatus(403);
});
