<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Templates\Models\Template;
use Illuminate\Support\Facades\Gate;
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

it('creates a template', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/templates",
        [
            'name' => 'Board Template',
            'type' => 'board',
            'description' => 'Standard project board',
            'content' => ['columns' => ['To Do', 'In Progress', 'Done']],
            'variables' => ['project_name' => 'My Project'],
        ]
    );
    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Board Template');
});

it('lists templates', function () {
    Template::factory()->count(3)->create(['workspace_id' => $this->workspace->id]);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/templates");
    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('filters templates by type', function () {
    Template::factory()->create(['workspace_id' => $this->workspace->id, 'type' => 'board']);
    Template::factory()->create(['workspace_id' => $this->workspace->id, 'type' => 'invoice']);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/templates?type=board");
    $response->assertStatus(200)
        ->assertJsonCount(1, 'data');
});

it('shows a template', function () {
    $template = Template::factory()->create(['workspace_id' => $this->workspace->id]);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/templates/{$template->id}");
    $response->assertStatus(200)
        ->assertJsonPath('data.name', $template->name);
});

it('updates a template', function () {
    $template = Template::factory()->create(['workspace_id' => $this->workspace->id]);
    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/templates/{$template->id}",
        ['name' => 'Updated Template']
    );
    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Updated Template');
});

it('deletes a template', function () {
    $template = Template::factory()->create(['workspace_id' => $this->workspace->id]);
    $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/templates/{$template->id}");
    $response->assertStatus(200);
    $this->assertDatabaseMissing('templates', ['id' => $template->id]);
});

it('applies a template with variables', function () {
    $template = Template::factory()->create([
        'workspace_id' => $this->workspace->id,
        'content' => ['greeting' => 'Hello {{name}}'],
    ]);
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/templates/{$template->id}/apply",
        ['variables' => ['name' => 'World']]
    );
    $response->assertStatus(200)
        ->assertJsonPath('data.applied_content.greeting', 'Hello World');
});

it('rejects cross-workspace template access', function () {
    $otherWorkspace = Workspace::factory()->create();
    $template = Template::factory()->create(['workspace_id' => $otherWorkspace->id]);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/templates/{$template->id}");
    $response->assertStatus(404);
});
