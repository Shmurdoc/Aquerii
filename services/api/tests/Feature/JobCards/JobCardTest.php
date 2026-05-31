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
