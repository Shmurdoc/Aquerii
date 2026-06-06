<?php

use App\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

// The CI test database is pre-migrated by the deployment pipeline, so the
// RefreshDatabase trait does not need to run `migrate:fresh` between test
// runs. Setting $migrated = true here causes the trait to skip its initial
// migration and only wrap each test in a transaction.
beforeAll(function () {
    RefreshDatabaseState::$migrated = true;
});

beforeEach(function () {
    $this->user = User::factory()->create();
});

// Helper: act as the given user via the test framework's Sanctum helper.
function actAsUser(User $user): void
{
    \Laravel\Sanctum\Sanctum::actingAs($user);
}

// ─── index ───────────────────────────────────────────────────────────────────

it('returns the calling users tokens only', function () {
    actAsUser($this->user);

    // Two tokens for our caller, one for a stranger — caller must never see the stranger's.
    $this->user->createToken('cli-1');
    $this->user->createToken('cli-2');

    $stranger = User::factory()->create();
    $stranger->createToken('stranger-cli');

    $response = $this->getJson('/api/me/personal-access-tokens');

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');

    $names = collect($response->json('data'))->pluck('name')->all();
    expect($names)->toContain('cli-1', 'cli-2');
    expect($names)->not->toContain('stranger-cli');

    // The response should expose the safe fields and never the hash or the plaintext.
    $first = $response->json('data.0');
    expect($first)->toHaveKeys(['id', 'name', 'abilities', 'last_used_at', 'created_at']);
    expect($first)->not->toHaveKey('token');
    expect($first)->not->toHaveKey('plainTextToken');
    expect($first)->not->toHaveKey('plain_text');
});

// ─── store ───────────────────────────────────────────────────────────────────

it('creates a token, returns the plaintext once, and persists the row', function () {
    actAsUser($this->user);

    $response = $this->postJson(
        '/api/me/personal-access-tokens',
        [
            'name' => 'ci-deploy',
            'abilities' => ['read:deals', 'write:deals'],
        ],
        ['Idempotency-Key' => Str::uuid()->toString()],
    );

    $response->assertStatus(201)
        ->assertJsonStructure([
            'data' => [
                'token' => ['id', 'name', 'abilities', 'last_used_at', 'expires_at', 'created_at'],
                'plain_text',
            ],
        ])
        ->assertJsonPath('data.token.name', 'ci-deploy')
        ->assertJsonPath('data.token.abilities', ['read:deals', 'write:deals']);

    $plain = $response->json('data.plain_text');
    expect($plain)->toBeString()->not->toBeEmpty();

    // The token is the Sanctum `<id>|<secret>` shape.
    expect($plain)->toContain('|');

    // The hash, not the plaintext, is what got persisted.
    [$id, $secret] = explode('|', $plain, 2);
    $this->assertDatabaseHas('personal_access_tokens', [
        'id' => (int) $id,
        'tokenable_type' => User::class,
        'tokenable_id' => $this->user->id,
        'name' => 'ci-deploy',
    ]);
    $persisted = PersonalAccessToken::find((int) $id);
    expect($persisted->token)->not->toBe($secret);
    expect($persisted->token)->toBe(hash('sha256', $secret));
});

// ─── destroy ────────────────────────────────────────────────────────────────

it('revokes a token scoped to the calling user and 404s for strangers', function () {
    actAsUser($this->user);

    $tokenId = $this->user->createToken('to-delete')->accessToken->id;

    $stranger = User::factory()->create();
    $strangerTokenId = $stranger->createToken('stranger')->accessToken->id;

    // Caller can revoke their own token.
    $ok = $this->deleteJson(
        "/api/me/personal-access-tokens/{$tokenId}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()],
    );
    expect(in_array($ok->status(), [200, 204], true))->toBeTrue();
    $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);

    // Caller cannot revoke someone else's token — should 404 (existence
    // not leaked), and the stranger's row must still be there.
    $blocked = $this->deleteJson(
        "/api/me/personal-access-tokens/{$strangerTokenId}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()],
    );
    $blocked->assertStatus(404);
    $this->assertDatabaseHas('personal_access_tokens', ['id' => $strangerTokenId]);
});

// ─── end-to-end: plaintext returned on create can authenticate ───────────────

it('returns a plaintext token that can authenticate subsequent requests', function () {
    // Create the token while acting-as the user via the test helper.
    actAsUser($this->user);

    $create = $this->postJson(
        '/api/me/personal-access-tokens',
        ['name' => 'e2e-cli'],
        ['Idempotency-Key' => Str::uuid()->toString()],
    );
    $create->assertStatus(201);
    $plain = $create->json('data.plain_text');
    expect($plain)->toBeString()->not->toBeEmpty();

    // Drop both the resolved guard state and the default-guard choice so
    // the next request goes through the real Bearer-token middleware
    // path instead of seeing the cached acting-as user.
    Auth::forgetGuards();

    $me = $this->withToken($plain)->getJson('/api/me');

    $me->assertStatus(200)
        ->assertJsonPath('data.id', $this->user->id)
        ->assertJsonPath('data.email', $this->user->email);

    // And after revoking it, the same plaintext must stop working.
    $tokenId = (int) explode('|', $plain, 2)[0];
    Auth::forgetGuards();
    $revoke = $this->withToken($plain)->deleteJson(
        "/api/me/personal-access-tokens/{$tokenId}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()],
    );
    expect(in_array($revoke->status(), [200, 204], true))->toBeTrue();

    Auth::forgetGuards();
    $this->withToken($plain)->getJson('/api/me')->assertStatus(401);
});
