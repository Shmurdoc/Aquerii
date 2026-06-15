<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\HSSE\Models\Incident;
use App\Modules\HSSE\Services\MhsaReportService;
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
    $this->service = app(MhsaReportService::class);
});

it('aggregates A/B/C classifications correctly', function () {
    Incident::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'A',
        'type' => 'fatality',
    ]);
    Incident::factory()->count(3)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'B',
        'type' => 'lost_time',
    ]);
    Incident::factory()->count(5)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'C',
        'type' => 'near_miss',
    ]);

    $report = $this->service->buildSection11Report($this->workspace->id);

    expect($report['act'])->toBe('Mine Health and Safety Act, 1996');
    expect($report['section'])->toBe('11');
    expect($report['totals']['all'])->toBe(10);
    expect($report['totals']['class_a'])->toBe(2);
    expect($report['totals']['class_b'])->toBe(3);
    expect($report['totals']['class_c'])->toBe(5);
    expect($report['by_classification']['A']['count'])->toBe(2);
    expect($report['by_classification']['B']['count'])->toBe(3);
    expect($report['by_classification']['C']['count'])->toBe(5);
});

it('excludes incidents without mhsa_classification', function () {
    Incident::factory()->count(3)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'A',
    ]);
    Incident::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => null,
    ]);

    $report = $this->service->buildSection11Report($this->workspace->id);

    expect($report['totals']['all'])->toBe(3);
});

it('respects custom date range', function () {
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'A',
        'occurred_at' => now()->subMonths(6),
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'A',
        'occurred_at' => now()->subDays(5),
    ]);

    $from = now()->subMonth(3);
    $to = now();
    $report = $this->service->buildSection11Report($this->workspace->id, $from, $to);

    expect($report['totals']['all'])->toBe(1);
});

it('counts open investigations', function () {
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'A',
        'status' => 'open',
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'B',
        'status' => 'under_investigation',
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'C',
        'status' => 'closed',
    ]);

    $report = $this->service->buildSection11Report($this->workspace->id);

    expect($report['open_investigations'])->toBe(2);
});

it('tracks coida_overlap count', function () {
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'A',
        'coida_reportable' => true,
    ]);
    Incident::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'A',
        'coida_reportable' => false,
    ]);

    $report = $this->service->buildSection11Report($this->workspace->id);

    expect($report['totals']['coida_overlap'])->toBe(1);
});

it('includes classification breakdown by type and severity', function () {
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'A',
        'type' => 'fatality',
        'severity' => 'critical',
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'A',
        'type' => 'lost_time',
        'severity' => 'high',
    ]);

    $report = $this->service->buildSection11Report($this->workspace->id);

    expect($report['by_classification']['A']['by_type']['fatality'])->toBe(1);
    expect($report['by_classification']['A']['by_type']['lost_time'])->toBe(1);
    expect($report['by_classification']['A']['by_severity']['critical'])->toBe(1);
    expect($report['by_classification']['A']['by_severity']['high'])->toBe(1);
});

it('returns location breakdown grouped by location', function () {
    Incident::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'A',
        'location' => 'Shaft 1',
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'B',
        'location' => 'Shaft 1',
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'C',
        'location' => 'Plant',
    ]);

    $report = $this->service->buildSection11Report($this->workspace->id);

    $byLocation = collect($report['by_location']);
    $shaft1 = $byLocation->firstWhere('location', 'Shaft 1');
    $plant = $byLocation->firstWhere('location', 'Plant');

    expect($shaft1['count'])->toBe(3);
    expect($shaft1['class_a'])->toBe(2);
    expect($shaft1['class_b'])->toBe(1);
    expect($plant['count'])->toBe(1);
    expect($plant['class_c'])->toBe(1);
});

it('falls back to unspecified for incidents without location', function () {
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'A',
        'location' => null,
    ]);

    $report = $this->service->buildSection11Report($this->workspace->id);

    $unspecified = collect($report['by_location'])->firstWhere('location', 'unspecified');
    expect($unspecified['count'])->toBe(1);
});

it('returns empty totals when no mhsa-classified incidents exist', function () {
    $report = $this->service->buildSection11Report($this->workspace->id);

    expect($report['totals']['all'])->toBe(0);
    expect($report['totals']['class_a'])->toBe(0);
    expect($report['totals']['class_b'])->toBe(0);
    expect($report['totals']['class_c'])->toBe(0);
    expect($report['by_location'])->toBeEmpty();
});
