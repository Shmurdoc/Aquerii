<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Competency\Models\CofRecord;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\Competency\Models\CompetencyType;
use App\Modules\PTW\Models\Permit;
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

it('creates a permit with all required fields returning 201', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits",
        [
            'type' => Permit::TYPE_HOT_WORK,
            'title' => 'Welding on conveyor 2',
            'description' => 'Hot work permit for welding repairs on main conveyor.',
            'location' => 'Processing Plant',
            'risk_level' => Permit::RISK_MEDIUM,
            'work_method_statement' => '1. Isolate power to conveyor 2 at main breaker panel. 2. Test gas levels in work area with calibrated detector. 3. Begin welding operations with appropriate PPE. 4. Inspect all welds before de-isolation.',
            'ppe_required' => 'Hard hat, gloves, face shield, fire retardant suit',
        ]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.title', 'Welding on conveyor 2')
        ->assertJsonPath('data.issuer_id', $this->user->id);
});

it('submits a permit from draft to requested returning 200', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/request"
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'requested');
});

it('approves a permit from requested to approved returning 200', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_REQUESTED,
        'requested_at' => now()->subHour(),
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/approve"
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('data.approved_at', fn ($v) => $v !== null);
});

it('rejects a permit with a reason returning 200', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_REQUESTED,
        'requested_at' => now()->subHour(),
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/reject",
        ['reason' => 'Insufficient hazard controls identified — additional controls required.']
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.rejection_reason', 'Insufficient hazard controls identified — additional controls required.');
});

it('activates a permit from issued to active returning 200', function () {
    $holder = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'role' => 'member',
    ]);

    CofRecord::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'status' => 'active',
        'issued_at' => Carbon::now()->subDay(),
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);
    $inductionType = CompetencyType::create(['name' => 'Site Induction', 'workspace_id' => $this->workspace->id]);
    CompetencyRecord::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'issued_at' => Carbon::now()->subDays(30),
        'verified_at' => Carbon::now(),
    ]);

    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'holder_id' => $holder->id,
        'status' => Permit::STATUS_ISSUED,
        'valid_from' => now(),
        'valid_until' => now()->addHours(8),
    ]);

    Sanctum::actingAs($holder);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/activate"
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.activated_at', fn ($v) => $v !== null);
});

it('closes an active permit returning 200', function () {
    $permit = Permit::factory()->active()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
    ]);

    Sanctum::actingAs($this->user);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/close",
        ['notes' => 'Work completed, area cleaned, tools removed, equipment de-energised.']
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'closed')
        ->assertJsonPath('data.closed_at', fn ($v) => $v !== null);
});

it('fails with 422 when required fields are missing on create', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits",
        ['description' => 'missing almost everything']
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['type', 'title', 'location', 'risk_level', 'work_method_statement', 'ppe_required']);
});

it('fails with 422 when submitting a permit from an illegal source state', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_ACTIVE,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/request"
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});

it('refuses approve by a non-owner non-admin member', function () {
    $member = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_REQUESTED,
        'requested_at' => now()->subHour(),
    ]);

    Sanctum::actingAs($member);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/approve"
    );

    $response->assertStatus(403);
});

it('refuses non-member with 403', function () {
    $other = User::factory()->create();
    Sanctum::actingAs($other);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits"
    );

    $response->assertStatus(403);
});

it('lists permits filtered by status', function () {
    Permit::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);
    Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_ACTIVE,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits?status=draft"
    );

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.status', 'draft');
});

it('creates all permit types returning 201 each', function () {
    $types = Permit::$types;

    foreach ($types as $type) {
        $response = $this->postJson(
            "/api/workspaces/{$this->workspace->id}/ptw/permits",
            [
                'type' => $type,
                'title' => "Permit for {$type}",
                'description' => "Testing creation of {$type} permit type.",
                'location' => 'Test Location',
                'risk_level' => Permit::RISK_LOW,
                'work_method_statement' => 'Standard work method statement for testing that is long enough to pass the minimum length validation rule for this field.',
                'ppe_required' => 'Hard hat, boots',
            ]
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.type', $type);
    }
});

it('extends an issued permit via issue endpoint returning 200', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_APPROVED,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/issue",
        [
            'valid_until' => now()->addHours(12)->toIso8601String(),
            'max_extension_minutes' => 120,
        ]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'issued')
        ->assertJsonPath('data.max_extension_minutes', 120);

    expect(Carbon::parse($response->json('data.valid_until'))->isFuture())->toBeTrue();
});

it('requires a reason when rejecting', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_REQUESTED,
        'requested_at' => now()->subHour(),
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/reject"
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['reason']);
});

it('requires notes when closing', function () {
    $permit = Permit::factory()->active()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/close"
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['notes']);
});

// ===== Additional lifecycle tests for PROD-FIX-COMPLIANCE-ISSUES =====

it('cannot issue permit when holder is non-compliant — missing COF verified_at', function () {
    $holder = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'role' => 'member',
    ]);

    CofRecord::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'status' => 'active',
        'issued_at' => Carbon::now()->subDay(),
        'expires_at' => Carbon::now()->addYear(),
        // verified_at deliberately omitted — should make holder non-compliant
    ]);

    $inductionType = CompetencyType::create(['name' => 'Site Induction', 'workspace_id' => $this->workspace->id]);
    CompetencyRecord::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'issued_at' => Carbon::now()->subDays(30),
        'verified_at' => Carbon::now(),
    ]);

    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_APPROVED,
        'approved_at' => now(),
    ]);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/issue",
        [
            'valid_until' => now()->addHours(8)->toIso8601String(),
            'holder_id' => $holder->id,
        ]
    )->assertStatus(422)
        ->assertJsonPath('message', fn ($m) => str_contains($m, 'Cannot issue permit'));
});

it('fails with 422 when work_method_statement is shorter than 100 characters', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits",
        [
            'type' => Permit::TYPE_HOT_WORK,
            'title' => 'Short statement test',
            'description' => 'A permit with a very short work method statement that should fail validation.',
            'location' => 'Test Area',
            'risk_level' => Permit::RISK_LOW,
            'work_method_statement' => 'Too short.',
            'ppe_required' => 'Hard hat',
        ]
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['work_method_statement']);
});

it('refuses approve by a viewer role', function () {
    $viewer = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $viewer->id,
        'role' => 'viewer',
    ]);

    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_REQUESTED,
        'requested_at' => now()->subHour(),
    ]);

    Sanctum::actingAs($viewer);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/approve"
    )->assertStatus(403);
});

it('allows the issuer to request a permit', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/request"
    )->assertStatus(200)
        ->assertJsonPath('data.status', 'requested');
});

it('cannot close a draft permit', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/close",
        ['notes' => 'Should not be allowed']
    )->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});

it('lists permits filtered by type', function () {
    Permit::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'type' => Permit::TYPE_CONFINED_SPACE,
    ]);
    Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'type' => Permit::TYPE_HOT_WORK,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits?type=confined_space"
    );

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.type', 'confined_space');
});

it('lists permits filtered by risk_level', function () {
    Permit::factory()->count(3)->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'risk_level' => Permit::RISK_HIGH,
    ]);
    Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'risk_level' => Permit::RISK_LOW,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits?risk_level=high"
    );

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('cannot create a permit with an invalid risk_level', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits",
        [
            'type' => Permit::TYPE_HOT_WORK,
            'title' => 'Invalid risk',
            'description' => 'Testing invalid risk level rejection.',
            'location' => 'Test',
            'risk_level' => 'ultra_high',
            'work_method_statement' => 'Standard work method statement for testing the validation rules that enforces a minimum character count on this important safety document.',
            'ppe_required' => 'Boots',
        ]
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['risk_level']);
});

it('cannot approve a permit that was already rejected', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_REJECTED,
    ]);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/approve"
    )->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});

it('cannot activate an expired permit', function () {
    $holder = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'role' => 'member',
    ]);

    CofRecord::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'status' => 'active',
        'issued_at' => Carbon::now()->subDay(),
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);

    $inductionType = CompetencyType::create(['name' => 'Site Induction', 'workspace_id' => $this->workspace->id]);
    CompetencyRecord::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'issued_at' => Carbon::now()->subDays(30),
        'verified_at' => Carbon::now(),
    ]);

    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'holder_id' => $holder->id,
        'status' => Permit::STATUS_ISSUED,
        'valid_from' => now()->subDays(2),
        'valid_until' => now()->subDay(),
    ]);

    Sanctum::actingAs($holder);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/activate"
    )->assertStatus(422)
        ->assertJsonValidationErrors(['valid_until']);
});

it('returns 404 when permit belongs to a different workspace', function () {
    $otherWorkspace = Workspace::factory()->create();
    $permit = Permit::factory()->create([
        'workspace_id' => $otherWorkspace->id,
        'issuer_id' => $this->user->id,
    ]);

    $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}")
        ->assertStatus(404);
});
