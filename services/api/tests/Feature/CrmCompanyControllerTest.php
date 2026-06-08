<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\CRM\Models\CrmCompany;
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

it('creates a company', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/companies",
        ['name' => 'Acme Corp', 'domain' => 'acme.com', 'industry' => 'Technology'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Acme Corp');

    $this->assertDatabaseHas('crm_companies', [
        'workspace_id' => $this->workspace->id,
        'name' => 'Acme Corp',
    ]);
});

it('lists companies', function () {
    CrmCompany::factory()->count(3)->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/companies");

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('shows a company', function () {
    $company = CrmCompany::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Visible Corp',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/companies/{$company->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Visible Corp');
});

it('updates a company', function () {
    $company = CrmCompany::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Old Name',
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/crm/companies/{$company->id}",
        ['name' => 'New Name'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.updated', true);

    $this->assertDatabaseHas('crm_companies', [
        'id' => $company->id,
        'name' => 'New Name',
    ]);
});

it('deletes a company', function () {
    $company = CrmCompany::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/crm/companies/{$company->id}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.deleted', true);

    $this->assertDatabaseMissing('crm_companies', ['id' => $company->id]);
});

it('returns 404 for company in a different workspace', function () {
    $other = Workspace::factory()->create();
    $company = CrmCompany::factory()->create(['workspace_id' => $other->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/companies/{$company->id}");

    $response->assertStatus(404);
});
