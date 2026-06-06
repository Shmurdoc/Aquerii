<?php

use App\Core\Models\FeatureFlag;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::factory()->create([
        'owner_id' => $this->user->id,
        'plan' => 'starter',
    ]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($this->user);
    FeatureFlag::updateOrCreate(['key' => 'module.ai'], ['enabled' => true]);
    Redis::del("ai_credits:{$this->workspace->id}");
});

it('forwards deal-summary request to AI service and deducts credits', function () {
    Http::fake([
        config('services.ai.url').'/crm/deal-summary' => Http::response([
            'summary' => 'Promising deal',
            'key_points' => ['Validated need'],
            'recommended_action' => 'Send proposal',
        ]),
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ai/deal-summary",
        [
            'deal_title' => 'Enterprise License',
            'deal_value' => 50000,
            'stage' => 'Negotiation',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200);
    expect((int) Redis::get("ai_credits:{$this->workspace->id}"))->toBeGreaterThan(0);
});

it('forwards churn-risk request to AI service and deducts credits', function () {
    Http::fake([
        config('services.ai.url').'/crm/churn-risk' => Http::response([
            'risk_score' => 75,
            'risk_level' => 'high',
            'reasoning' => 'Long inactivity',
            'suggested_actions' => ['Re-engage'],
        ]),
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ai/churn-risk",
        [
            'contact_name' => 'Alice',
            'days_since_last_contact' => 60,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200);
    expect((int) Redis::get("ai_credits:{$this->workspace->id}"))->toBeGreaterThan(0);
});

it('returns 502 when AI service fails for any CRM endpoint', function () {
    Http::fake([
        config('services.ai.url').'/*' => Http::response([], 500),
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ai/data-clean",
        [
            'dataset_type' => 'contacts',
            'data' => 'Name, Email\nAlice, alice@test.com',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(502);
});
