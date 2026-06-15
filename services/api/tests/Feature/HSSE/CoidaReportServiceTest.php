<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\HSSE\Models\Incident;
use App\Modules\HSSE\Services\CoidaReportService;
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
    $this->service = app(CoidaReportService::class);
});

it('rejects buildWcl2Payload when incident is not coida_reportable', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => false,
    ]);

    expect(fn () => $this->service->buildWcl2Payload($this->workspace, $incident))
        ->toThrow(\Symfony\Component\HttpKernel\Exception\HttpException::class, 'COIDA-reportable');
});

it('builds a complete W.Cl.2 payload for a reportable incident', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
        'coida_reference' => 'W.Cl.2/2026/9999',
        'type' => 'lost_time',
        'severity' => 'high',
        'occurred_at' => now()->subDays(3),
        'mhsa_classification' => 'B',
        'body_part_affected' => 'Left arm',
        'injury_type' => 'Laceration',
    ]);

    $payload = $this->service->buildWcl2Payload($this->workspace, $incident);

    expect($payload['form'])->toBe('W.Cl.2');
    expect($payload['workspace']['id'])->toBe($this->workspace->id);
    expect($payload['incident']['reference'])->toBe($incident->reference);
    expect($payload['incident']['coida_reference'])->toBe('W.Cl.2/2026/9999');
    expect($payload['incident']['mhsa_classification'])->toBe('B');
    expect($payload['reporter']['id'])->toBe($this->user->id);
    expect($payload['submission_deadline'])->not->toBeNull();
});

it('handles null reporter and investigator in W.Cl.2 payload', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
        'investigator_id' => null,
    ]);

    $payload = $this->service->buildWcl2Payload($this->workspace, $incident);

    expect($payload['reporter'])->not->toBeNull();
    expect($payload['investigator'])->toBeNull();
});

it('includes employer details from workspace settings', function () {
    $this->workspace->settings = ['coida_registration_number' => 'REG-42', 'industry' => 'Mining'];
    $this->workspace->save();

    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
    ]);

    $payload = $this->service->buildWcl2Payload($this->workspace, $incident);

    expect($payload['employer']['registration_number'])->toBe('REG-42');
    expect($payload['employer']['industry'])->toBe('Mining');
});

it('calculates the 7-day submission deadline from occurred_at', function () {
    $occurredAt = now()->subDays(3);
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
        'occurred_at' => $occurredAt,
    ]);

    $payload = $this->service->buildWcl2Payload($this->workspace, $incident);

    $expectedDeadline = (new Carbon($occurredAt))->addDays(7)->toIso8601String();
    expect($payload['submission_deadline'])->toBe($expectedDeadline);
});

it('summary returns default one-year range when no dates given', function () {
    Incident::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
        'occurred_at' => now()->subMonths(2),
    ]);

    $result = $this->service->summary($this->workspace->id);

    expect($result['total'])->toBe(2);
    expect($result['period']['from'])->not->toBeNull();
    expect($result['period']['to'])->not->toBeNull();
});

it('summary respects custom date range', function () {
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
        'occurred_at' => now()->subMonths(6),
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
        'occurred_at' => now()->subDays(5),
    ]);

    $from = now()->subMonth(3);
    $to = now();
    $result = $this->service->summary($this->workspace->id, $from, $to);

    expect($result['total'])->toBe(1);
});

it('summary returns empty for workspace with no coida-reportable incidents', function () {
    $result = $this->service->summary($this->workspace->id);

    expect($result['total'])->toBe(0);
    expect($result['by_type'])->toBeEmpty();
    expect($result['by_severity'])->toBeEmpty();
});

it('summary aggregates by type and severity', function () {
    Incident::factory()->count(3)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
        'type' => 'first_aid',
        'severity' => 'low',
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
        'type' => 'lost_time',
        'severity' => 'high',
    ]);

    $result = $this->service->summary($this->workspace->id);

    expect($result['by_type']['first_aid'])->toBe(3);
    expect($result['by_type']['lost_time'])->toBe(1);
    expect($result['by_severity']['low'])->toBe(3);
    expect($result['by_severity']['high'])->toBe(1);
});

it('summary counts fatalities and lost-time incidents separately', function () {
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
        'type' => 'fatality',
    ]);
    Incident::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
        'type' => 'lost_time',
    ]);

    $result = $this->service->summary($this->workspace->id);

    expect($result['fatalities'])->toBe(1);
    expect($result['lost_time'])->toBe(2);
});
