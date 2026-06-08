<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Carbon\Carbon;
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

it('returns ROI dashboard structure', function () {
    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/roi/dashboard"
    );

    $response->assertStatus(200);

    $data = $response->json('data');
    expect($data)->toHaveKeys([
        'certificates_prevented_expiring',
        'access_denials_prevented',
        'avoided_downtime_hours',
        'avoided_downtime_cost',
        'compliance_rate',
        'compliance_rate_trend',
        'ptw_processing_time_avg',
        'ptw_processing_time_before',
        'time_saved_ptw',
        'total_potential_savings',
        'platform_cost',
        'roi_ratio',
        'period',
    ]);
});

it('returns zeros when no data exists', function () {
    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/roi/dashboard"
    );

    $response->assertStatus(200);
    $data = $response->json('data');

    expect($data['certificates_prevented_expiring'])->toBe(0);
    expect($data['access_denials_prevented'])->toBe(0);
    expect($data['avoided_downtime_hours'])->toEqual(0.0);
    expect($data['avoided_downtime_cost'])->toEqual(0.0);
    expect($data['compliance_rate'])->toEqual(0.0);
    expect($data['ptw_processing_time_avg'])->toEqual(0.0);
    expect($data['time_saved_ptw'])->toEqual(0.0);
});

it('returns ROI dashboard with from and to date parameters', function () {
    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/roi/dashboard?".http_build_query([
            'from' => Carbon::now()->subDays(60)->toDateString(),
            'to' => Carbon::now()->toDateString(),
        ])
    );

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data['period']['from'])->not->toBeNull();
    expect($data['period']['to'])->not->toBeNull();
});

it('returns message when less than 30 days of data', function () {
    $this->freezeTime();

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/roi/dashboard?".http_build_query([
            'from' => Carbon::now()->subDays(7)->toDateString(),
            'to' => Carbon::now()->toDateString(),
        ])
    );

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data['message'])->toContain('Not enough data');
});

it('rejects non-member with 403', function () {
    $other = User::factory()->create();
    Sanctum::actingAs($other);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/roi/dashboard"
    );

    $response->assertStatus(403);
});

it('rejects non-existent workspace with 404', function () {
    $response = $this->getJson(
        '/api/workspaces/non-existent-workspace-id/roi/dashboard'
    );

    $response->assertStatus(404);
});
