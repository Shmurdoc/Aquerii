<?php

use App\Core\Models\FeatureFlag;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->member = User::factory()->create();

    $this->workspace = Workspace::factory()->create([
        'owner_id' => $this->owner->id,
        'plan' => 'enterprise',
    ]);

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'role' => 'owner',
        'status' => 'active',
    ]);

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->member->id,
        'role' => 'member',
        'status' => 'active',
    ]);

    // Enable required feature flags
    FeatureFlag::updateOrCreate(['key' => 'module.erp'], ['enabled' => true]);
    FeatureFlag::updateOrCreate(['key' => 'module.boards'], ['enabled' => true]);
    FeatureFlag::updateOrCreate(['key' => 'module.ai'], ['enabled' => true]);
    FeatureFlag::updateOrCreate(['key' => 'module.automation'], ['enabled' => true]);
    FeatureFlag::updateOrCreate(['key' => 'module.support'], ['enabled' => true]);
    FeatureFlag::updateOrCreate(['key' => 'module.marketing'], ['enabled' => true]);
    FeatureFlag::updateOrCreate(['key' => 'module.hr'], ['enabled' => true]);
    FeatureFlag::updateOrCreate(['key' => 'module.email'], ['enabled' => true]);
});

it('lets owner create report schedules', function () {
    Sanctum::actingAs($this->owner);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/reports/schedules",
        [
            'name' => 'Weekly Revenue',
            'report_type' => 'invoices',
            'format' => 'csv',
            'recipients' => ['ops@example.com'],
            'frequency' => 'weekly',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(201)
        ->assertJsonPath('data.id', fn ($id) => is_string($id) && strlen($id) > 0);
});

it('blocks member from creating report schedules', function () {
    Sanctum::actingAs($this->member);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/reports/schedules",
        [
            'name' => 'Weekly Revenue',
            'report_type' => 'invoices',
            'frequency' => 'weekly',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(403);
});

it('supports invoice approval lifecycle for finance controls', function () {
    Sanctum::actingAs($this->owner);

    $invoiceId = (string) Str::uuid();
    DB::table('invoices')->insert([
        'id' => $invoiceId,
        'workspace_id' => $this->workspace->id,
        'invoice_number' => 'INV-READINESS-1',
        'status' => 'draft',
        'currency' => 'USD',
        'subtotal' => 100,
        'tax_total' => 0,
        'total' => 100,
        'customer_name' => 'Acme Corp',
        'issue_date' => now()->toDateString(),
        'due_date' => now()->addDays(7)->toDateString(),
        'created_by' => $this->owner->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $submit = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/finance/invoices/{$invoiceId}/submit-approval",
        ['note' => 'Please approve'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $submit->assertStatus(201);
    $approvalId = $submit->json('data.approval_request_id');

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/finance/invoice-approvals/{$approvalId}/approve",
        ['note' => 'Approved for posting'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(200)
        ->assertJsonPath('data.approved', true);

    $this->assertDatabaseHas('invoices', [
        'id' => $invoiceId,
        'status' => 'approved',
    ]);
});

it('allows owner to mark integration webhook event for retry', function () {
    Queue::fake();

    Sanctum::actingAs($this->owner);

    $eventId = (string) Str::uuid();
    DB::table('integration_webhook_events')->insert([
        'id' => $eventId,
        'workspace_id' => $this->workspace->id,
        'processor' => 'stripe',
        'processor_event_id' => 'evt_test_1',
        'event_type' => 'invoice.payment_failed',
        'payload' => json_encode(['id' => 'evt_test_1']),
        'headers' => json_encode([]),
        'status' => 'failed',
        'retry_count' => 0,
        'next_retry_at' => null,
        'processed_at' => null,
        'last_error' => 'temporary failure',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/integrations/webhook-events/{$eventId}/retry",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(200)
        ->assertJsonPath('data.retry_requested', true);

    $this->assertDatabaseHas('integration_webhook_events', [
        'id' => $eventId,
        'status' => 'retrying',
        'retry_count' => 1,
    ]);
});

it('enforces immutable posted invoice status and allows explicit reversal workflow', function () {
    Sanctum::actingAs($this->owner);

    $invoiceId = (string) Str::uuid();
    DB::table('invoices')->insert([
        'id' => $invoiceId,
        'workspace_id' => $this->workspace->id,
        'invoice_number' => 'INV-POSTED-1',
        'status' => 'posted',
        'currency' => 'USD',
        'subtotal' => 120,
        'tax_total' => 0,
        'total' => 120,
        'customer_name' => 'Acme Corp',
        'issue_date' => now()->toDateString(),
        'due_date' => now()->addDays(7)->toDateString(),
        'posted_at' => now(),
        'created_by' => $this->owner->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/invoices/{$invoiceId}/status",
        ['status' => 'draft'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(422);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/finance/invoices/{$invoiceId}/reverse",
        ['reason' => 'Accounting correction'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(200)
        ->assertJsonPath('data.reversed', true);

    $this->assertDatabaseHas('invoices', [
        'id' => $invoiceId,
        'status' => 'reversed',
    ]);
});

it('replays webhook events immediately via replay-now endpoint', function () {
    Sanctum::actingAs($this->owner);

    $eventId = (string) Str::uuid();
    DB::table('integration_webhook_events')->insert([
        'id' => $eventId,
        'workspace_id' => $this->workspace->id,
        'processor' => 'payfast',
        'processor_event_id' => 'pf_test_1',
        'event_type' => 'payment_notification',
        'payload' => json_encode([
            'custom_str1' => $this->workspace->id,
            'custom_str2' => 'growth',
            'payment_status' => 'COMPLETE',
            'pf_payment_id' => 'pf_test_1',
        ]),
        'headers' => json_encode([]),
        'status' => 'failed',
        'retry_count' => 0,
        'next_retry_at' => null,
        'processed_at' => null,
        'last_error' => 'temporary failure',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/integrations/webhook-events/{$eventId}/replay-now",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(200)
        ->assertJsonPath('data.replayed', true);

    $this->assertDatabaseHas('integration_webhook_events', [
        'id' => $eventId,
        'status' => 'processed',
    ]);
});

it('returns schedule exception summary for overdue schedules', function () {
    Sanctum::actingAs($this->owner);

    DB::table('report_schedules')->insert([
        'id' => (string) Str::uuid(),
        'workspace_id' => $this->workspace->id,
        'name' => 'Overdue Revenue Digest',
        'report_type' => 'invoices',
        'format' => 'csv',
        'recipients' => json_encode(['ops@example.com']),
        'filters' => json_encode([]),
        'frequency' => 'weekly',
        'next_run_at' => now()->subHours(2),
        'last_run_at' => now()->subDays(40),
        'is_active' => true,
        'created_by' => $this->owner->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->getJson("/api/workspaces/{$this->workspace->id}/reports/schedules/exceptions")
        ->assertStatus(200)
        ->assertJsonPath('data.summary.overdue_count', 1)
        ->assertJsonPath('data.summary.stale_count', 1);
});
