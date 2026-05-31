<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\JobCards\Models\JobCard;
use Illuminate\Support\Facades\Gate;
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

    Gate::define('create', fn ($user, $model, $workspace) => true);
    Gate::define('view', fn ($user, $model) => true);
    Gate::define('update', fn ($user, $model) => true);
    Gate::define('delete', fn ($user, $model) => true);
});

it('creates a job card', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/job-cards",
        ['title' => 'Fix conveyor belt at Level 3'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(201)
        ->assertJsonPath('data.title', 'Fix conveyor belt at Level 3')
        ->assertJsonPath('data.status', 'new');
});

it('lists job cards', function () {
    JobCard::factory()->count(3)->create(['workspace_id' => $this->workspace->id]);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/job-cards");
    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('shows a job card', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id]);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}");
    $response->assertStatus(200)
        ->assertJsonPath('data.id', $card->id);
});

it('updates a job card', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id]);
    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}",
        ['title' => 'Updated job'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(200)
        ->assertJsonPath('data.title', 'Updated job');
});

it('deletes a job card', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id]);
    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(200)
        ->assertJsonPath('data.deleted', true);
});

it('filters job cards by status', function () {
    JobCard::factory()->create(['workspace_id' => $this->workspace->id, 'status' => 'new']);
    JobCard::factory()->create(['workspace_id' => $this->workspace->id, 'status' => 'completed']);
    JobCard::factory()->create(['workspace_id' => $this->workspace->id, 'status' => 'in_progress']);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/job-cards?status=completed");
    $response->assertStatus(200)
        ->assertJsonCount(1, 'data');
});

it('signs off a job card', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id, 'status' => 'completed']);
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}/sign-off",
        ['notes' => 'Work looks good'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'signed_off')
        ->assertJsonPath('data.signoff_notes', 'Work looks good');
});

it('rejects a job card', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id, 'status' => 'in_progress']);
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}/reject",
        ['rejection_reason' => 'Not up to standard'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.rejection_reason', 'Not up to standard');
});

it('creates a job card with tasks', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/job-cards",
        [
            'title' => 'Electrical maintenance',
            'tasks' => [
                ['description' => 'Check main breaker', 'category' => 'safety'],
                ['description' => 'Test voltage output'],
            ],
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(201);
    $this->assertDatabaseHas('job_card_tasks', ['description' => 'Check main breaker']);
});

it('rejects cross-workspace access', function () {
    $otherWorkspace = Workspace::factory()->create();
    $card = JobCard::factory()->create(['workspace_id' => $otherWorkspace->id]);
    $response = $this->getJson("/api/workspaces/{$otherWorkspace->id}/job-cards/{$card->id}");
    $response->assertStatus(404);
});

// ─── Task / Checklist tests (JOB-12) ────────────────────────────────────────

it('adds a task to a job card', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id]);
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}/tasks",
        ['description' => 'Wear safety harness', 'category' => 'safety']
    );
    $response->assertStatus(201)
        ->assertJsonPath('data.description', 'Wear safety harness')
        ->assertJsonPath('data.category', 'safety');
});

it('toggles a task', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id]);
    $task = $card->tasks()->create(['description' => 'Test voltage', 'position' => 0]);
    $response = $this->patchJson("/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}/tasks/{$task->id}", [
        'is_checked' => true,
    ]);
    $response->assertStatus(200)
        ->assertJsonPath('data.is_checked', true);
});

it('deletes a task', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id]);
    $task = $card->tasks()->create(['description' => 'Remove debris', 'position' => 0]);
    $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}/tasks/{$task->id}");
    $response->assertStatus(200)
        ->assertJsonPath('data.deleted', true);
});

// ─── Materials tests (JOB-10) ───────────────────────────────────────────────

it('adds material to a job card', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id]);
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}/materials",
        ['name' => 'Steel pipe', 'quantity' => 5, 'unit_price' => 150.00, 'unit' => 'm']
    );
    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Steel pipe');
});

it('lists materials on a job card', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id]);
    $card->materials()->create(['name' => 'Cement', 'quantity' => 10, 'unit_price' => 85, 'total' => 850, 'created_by' => $this->user->id]);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}/materials");
    $response->assertStatus(200)
        ->assertJsonCount(1, 'data');
});

it('deletes a material', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id]);
    $material = $card->materials()->create(['name' => 'Nails', 'quantity' => 1, 'unit_price' => 50, 'total' => 50, 'created_by' => $this->user->id]);
    $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}/materials/{$material->id}");
    $response->assertStatus(200)
        ->assertJsonPath('data.deleted', true);
});

// ─── Time / Labour tests (JOB-11) ───────────────────────────────────────────

it('starts a timer on a job card', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id]);
    $response = $this->postJson("/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}/timer/start");
    $response->assertStatus(201)
        ->assertJsonPath('data.user_id', $this->user->id);
});

it('stops a timer on a job card', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id]);
    $card->timeEntries()->create(['user_id' => $this->user->id, 'started_at' => now()->subHour()]);
    $response = $this->postJson("/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}/timer/stop");
    $response->assertStatus(200);
});

it('lists time entries', function () {
    $card = JobCard::factory()->create(['workspace_id' => $this->workspace->id]);
    $card->timeEntries()->create(['user_id' => $this->user->id, 'started_at' => now()->subHour(), 'ended_at' => now(), 'duration_minutes' => 60]);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/job-cards/{$card->id}/time-entries");
    $response->assertStatus(200)
        ->assertJsonCount(1, 'data');
});
