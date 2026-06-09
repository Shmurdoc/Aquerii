<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Models\CrmPipeline;
use App\Modules\CRM\Models\CrmPipelineStage;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
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

    $this->pipeline = CrmPipeline::factory()->create(['workspace_id' => $this->workspace->id]);
    $this->stage = CrmPipelineStage::factory()->create([
        'pipeline_id' => $this->pipeline->id,
        'workspace_id' => $this->workspace->id,
    ]);
});

it('creates a deal', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/deals",
        [
            'title' => 'Enterprise License',
            'value' => 50000,
            'pipeline_id' => $this->pipeline->id,
            'stage_id' => $this->stage->id,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.title', 'Enterprise License');
});

it('lists deals', function () {
    CrmDeal::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'pipeline_id' => $this->pipeline->id,
        'stage_id' => $this->stage->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/deals");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('shows a deal', function () {
    $deal = CrmDeal::factory()->create([
        'workspace_id' => $this->workspace->id,
        'pipeline_id' => $this->pipeline->id,
        'stage_id' => $this->stage->id,
        'title' => 'Big Deal',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/deals/{$deal->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.title', 'Big Deal');
});

it('updates a deal', function () {
    $deal = CrmDeal::factory()->create([
        'workspace_id' => $this->workspace->id,
        'pipeline_id' => $this->pipeline->id,
        'stage_id' => $this->stage->id,
        'title' => 'Original',
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/crm/deals/{$deal->id}",
        ['title' => 'Updated Deal', 'value' => 75000],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.title', 'Updated Deal');
});

it('deletes a deal', function () {
    $deal = CrmDeal::factory()->create([
        'workspace_id' => $this->workspace->id,
        'pipeline_id' => $this->pipeline->id,
        'stage_id' => $this->stage->id,
    ]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/crm/deals/{$deal->id}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    expect(in_array($response->status(), [200, 204]))->toBeTrue();
});

it('moves a deal between stages', function () {
    $newStage = CrmPipelineStage::factory()->create([
        'pipeline_id' => $this->pipeline->id,
        'workspace_id' => $this->workspace->id,
    ]);

    $deal = CrmDeal::factory()->create([
        'workspace_id' => $this->workspace->id,
        'pipeline_id' => $this->pipeline->id,
        'stage_id' => $this->stage->id,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/deals/{$deal->id}/move",
        ['stage_id' => $newStage->id],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.stage_id', $newStage->id);
});

it('scores a deal via AI service', function () {
    $deal = CrmDeal::factory()->create([
        'workspace_id' => $this->workspace->id,
        'pipeline_id' => $this->pipeline->id,
        'stage_id' => $this->stage->id,
    ]);

    Http::fake([
        config('services.ai.url').'/internal/score-deal' => Http::response([
            'score' => 85,
            'recommendation' => 'pursue',
        ]),
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/deals/{$deal->id}/score",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200);
});

it('returns 502 when AI scoring service fails', function () {
    $deal = CrmDeal::factory()->create([
        'workspace_id' => $this->workspace->id,
        'pipeline_id' => $this->pipeline->id,
        'stage_id' => $this->stage->id,
    ]);

    Http::fake([
        config('services.ai.url').'/internal/score-deal' => Http::response([], 500),
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/deals/{$deal->id}/score",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(502);
});

it('returns 404 for deal in a different workspace', function () {
    $other = Workspace::factory()->create();
    $deal = CrmDeal::factory()->create([
        'workspace_id' => $other->id,
        'pipeline_id' => $this->pipeline->id,
        'stage_id' => $this->stage->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/deals/{$deal->id}");

    $response->assertStatus(404);
});
