<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\CRM\Models\CrmCompany;
use App\Modules\CRM\Models\CrmContact;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Models\CrmLead;
use App\Modules\CRM\Models\CrmPipeline;
use App\Modules\CRM\Models\CrmPipelineStage;
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

it('creates a pipeline', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/pipelines",
        ['name' => 'Sales Pipeline'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Sales Pipeline');
});

it('lists pipelines', function () {
    CrmPipeline::factory()->count(2)->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/pipelines");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('creates a stage on a pipeline', function () {
    $pipeline = CrmPipeline::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/pipelines/{$pipeline->id}/stages",
        ['name' => 'Qualified', 'position' => 1, 'win_probability' => 50],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Qualified');
});

it('creates a company', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/companies",
        ['name' => 'Acme Corp', 'domain' => 'acme.com'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Acme Corp');
});

it('lists companies', function () {
    CrmCompany::factory()->count(3)->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/companies");

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('creates a contact', function () {
    $company = CrmCompany::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/contacts",
        [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@acme.com',
            'company_id' => $company->id,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.first_name', 'John');
});

it('lists contacts', function () {
    CrmContact::factory()->count(3)->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/contacts");

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('shows a contact', function () {
    $contact = CrmContact::factory()->create([
        'workspace_id' => $this->workspace->id,
        'first_name' => 'Jane',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/contacts/{$contact->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.first_name', 'Jane');
});

it('updates a contact', function () {
    $contact = CrmContact::factory()->create([
        'workspace_id' => $this->workspace->id,
        'first_name' => 'Old',
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/crm/contacts/{$contact->id}",
        ['first_name' => 'Updated'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.first_name', 'Updated');
});

it('deletes a contact', function () {
    $contact = CrmContact::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/crm/contacts/{$contact->id}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    expect(in_array($response->status(), [200, 204]))->toBeTrue();
});

it('creates a deal', function () {
    $pipeline = CrmPipeline::factory()->create(['workspace_id' => $this->workspace->id]);
    $stage = CrmPipelineStage::factory()->create([
        'pipeline_id' => $pipeline->id,
        'workspace_id' => $this->workspace->id,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/deals",
        [
            'title' => 'Big Deal',
            'value' => 50000,
            'pipeline_id' => $pipeline->id,
            'stage_id' => $stage->id,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.title', 'Big Deal');
});

it('lists deals', function () {
    CrmDeal::factory()->count(2)->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/deals");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('marks a deal as won', function () {
    $deal = CrmDeal::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/deals/{$deal->id}/won",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200);
});

it('creates a lead', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/leads",
        [
            'first_name' => 'Lead',
            'last_name' => 'User',
            'email' => 'lead@example.com',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.first_name', 'Lead');
});

it('returns 404 for contact in different workspace', function () {
    $other = Workspace::factory()->create();
    $contact = CrmContact::factory()->create(['workspace_id' => $other->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/contacts/{$contact->id}");

    $response->assertStatus(404);
});
