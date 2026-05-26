# 04 — Brutal Testing Framework

> **Owner**: All 3 Groups. Every developer is responsible for testing their own code.
> **Rule**: If it's not tested, it doesn't exist. If the test doesn't pass, it doesn't ship.
> **Gate**: Every feature goes through ALL 4 testing tiers before it's considered done.

---

## TESTING PHILOSOPHY

We test to **prove guarantees**, not to check boxes. Every test answers a question:

| Question | Test Type | Guarantee |
|----------|-----------|-----------|
| Does the logic work? | Unit test | Correctness |
| Does the API work? | Feature test | Contract |
| Does the user journey work? | E2E test | Functionality |
| Does it handle load? | Performance test | Scalability |
| Is it secure? | Security test | Safety |
| Did we break anything? | Regression test | Stability |

**The Iron Rule**: If you ship a feature without a test that proves it works, you haven't shipped a feature. You've shipped a liability.

---

## TIER 1: UNIT TESTS (Guarantee: Correctness)

### What to Test

Every public method in:
- `App/Core/Services/*` — Business logic services
- `App/Core/Rules/*` — Validation rules
- `App/Modules/*/Services/*` — Module-specific services
- `App/Core/Jobs/*` — Job logic (with mocked dependencies)

### What NOT to Test

- Eloquent model scopes (test via feature tests)
- Config files
- Routes registration
- Blade templates (we're API-only, no Blade)

### Standard

```php
// Example: PasswordStrengthTest.php (exists)
test('rejects passwords shorter than 12 characters', function () {
    $rule = new PasswordStrength;
    $rule->validate('password', 'Short1!', fn($msg) => $failed = $msg);
    expect($failed)->toBe('The password must be at least 12 characters.');
});
```

**Pattern**: Construct → Call → Assert. No database. No HTTP. Pure logic.

### Coverage Target

- Services: 100% of public methods
- Rules: 100% of validation branches
- Jobs: 90% of execution paths
- Engine logic (AutomationEngine): 100% of trigger/action paths

---

## TIER 2: FEATURE TESTS (Guarantee: Contract)

### What to Test

Every API endpoint must have:
1. **Happy path test**: Send valid request → expect 200/201
2. **Validation test**: Send invalid request → expect 422 with field-level errors
3. **Auth test**: Send without token → expect 401
4. **Permission test**: Send without workspace access → expect 404
5. **Idempotency test**: Send same Idempotency-Key twice → expect same response

### Standard

```php
// Example: BoardTest.php (exists)
test('creates a board with default columns and group', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
    $workspace->members()->attach($user, ['role' => 'admin']);

    $response = $this->actingAs($user)->postJson("/api/workspaces/{$workspace->id}/boards", [
        'name' => 'My Board',
    ], ['Idempotency-Key' => Str::uuid()]);

    $response->assertStatus(201);
    $this->assertDatabaseHas('boards', ['name' => 'My Board']);
});
```

### Coverage Target

- Core endpoints (Auth, Board, Item, Comment, File): 100% route coverage
- Module endpoints (CRM, Documents, Inventory, Automation, AI): 100% route coverage
- Every 4xx/5xx error code should be reachable by a test

---

## MCP-AUGMENTED DEBUGGING (Cross-Cutting)

### Playwright MCP — Live Browser Debugging

The Playwright MCP server (`@playwright/mcp`) gives AI agents direct browser control for diagnosing
E2E failures. Instead of reading stack traces and guessing, the AI drives a real browser session.

**Setup** — Add to `.mcp.json` at project root:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--headless"]
    }
  }
}
```

**Debug Loop for E2E Failures:**
```
1. AI reads the failing test and reproduces the page state
2. AI calls browser_snapshot → gets accessibility tree (structured, pixel-independent)
3. AI calls browser_console_messages → finds JS errors blocking hydration
4. AI calls browser_network_requests → checks API responses, 422s, 500s
5. AI calls browser_take_screenshot → visual check (z-index, layout)
6. AI reasons about the gap between what the test expects and what the page shows
7. AI fixes the code and re-runs
```

**Use Instead Of:**
- Pasting 300 lines of CI output and guessing
- Manual reproduction in DevTools
- Adding temporary console.log() statements

### Han Validation Hooks

Han is a Rust-based validation plugin system that runs lint/test/typecheck
hooks after every AI coding session:

```bash
# Install
han plugin install --auto  # Detects PHP, Node, Python stack

# Auto-runs after every coding session:
# - PHP Lint (Pint)
# - PHPStan level 6
# - Pest unit tests
# - npm test (if applicable)
# - Playwright E2E (if config detected)
```

### MCP Server Tests

Every MCP server built with `laravel/mcp` MUST include tests using `Mcp::fake()`:

```php
// Basic pattern
Mcp::fake();
$response = $this->postJson('/mcp/aquerii/boards', [
    'method' => 'tools/call',
    'params' => ['name' => 'create-board', 'arguments' => ['name' => 'Test Board']],
]);
Mcp::assertToolCalled('create-board');

// Test auth enforcement
$response = $this->postJson('/mcp/aquerii/boards', [
    'method' => 'tools/list',
]);
$response->assertStatus(401); // No auth token

// Test RLS isolation (user A cannot see user B's data via MCP)
Mcp::fake();
$response = $this->actingAs(UserA)->postJson('/mcp/aquerii/crm', [
    'method' => 'tools/call',
    'params' => ['name' => 'search-deals', 'arguments' => ['query' => '']],
]);
$results = $response->json('result.content.0.text');
expect($results)->not->toContain('UserB_Deal');
```

---

## TIER 3: E2E TESTS (Guarantee: Functionality)

### What to Test

Critical user journeys that span the full stack:


Critical user journeys that span multiple API calls:
1. **Auth journey**: Visit / → redirect to /login → login → redirect to /boards → see boards
2. **Board journey**: Create board → see in list → open board → see kanban view → switch to table
3. **Item journey**: Create item → edit → add comment → upload file → verify all present
4. **Documents journey**: Create document → see document → edit content → save
5. **CRM journey**: View pipeline → create deal → move stage → verify
6. **Workspace journey**: Create workspace → invite member → member accepts → verify

### Standard

```typescript
// Example: app.spec.ts (target state)
test('can create a new board', async ({ page }) => {
    await loginAndGoToBoards(page);
    await page.click('button:has-text("New Board")');
    await page.fill('input[name="name"]', 'Test Board');
    await page.click('button:has-text("Create")');
    await expect(page).toHaveURL(/\/boards\/([a-f0-9-]+)/);
    await expect(page.locator('[data-testid="board-title"]')).toHaveText('Test Board');
});
```

### Coverage Target

- Critical journeys (Auth, Board, Item): 100%
- Secondary journeys (Documents, CRM): 80%
- All E2E tests pass on Chromium + Firefox
- Target: 20+ E2E tests covering all main features

### Configuration

```typescript
// playwright.config.ts (target state)
export default defineConfig({
  workers: 1,  // NEVER higher — rate limiter will block
  retries: 2,  // Flaky test retry
  use: {
    baseURL: 'https://localhost',
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
```

---

## TIER 4: SECURITY & PERFORMANCE TESTS (Guarantee: Safety & Scale)

### Security Tests

```php
// Example: SecurityTest.php (to be created)
test('file upload rejects invalid MIME type', function () {
    $response = $this->actingAs($user)->postJson("/api/workspaces/{$ws}/boards/{$board}/items/{$item}/files", [
        'file' => UploadedFile::fake()->create('malware.exe', 100),
    ]);
    $response->assertStatus(422);
});

test('RLS blocks cross-workspace query', function () {
    $otherWs = Workspace::factory()->create();
    $response = $this->actingAs($user)->getJson("/api/workspaces/{$otherWs->id}/boards");
    $response->assertStatus(404);
});
```

### Performance Tests

```javascript
// services/tests/load/smoke-test.js (to be created)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
};

export default function () {
  const res = http.get('http://api:8000/api/healthz');
  check(res, { 'health endpoint returns 200': (r) => r.status === 200 });
  sleep(1);
}
```

### Database Query Tests

```php
// PerformanceTest.php (to be created)
test('board list executes fewer than 10 queries', function () {
    Board::factory()->count(10)->create(['workspace_id' => $ws->id]);
    
    DB::enableQueryLog();
    $this->actingAs($user)->getJson("/api/workspaces/{$ws->id}/boards");
    $queries = count(DB::getQueryLog());
    
    expect($queries)->toBeLessThan(10);
});
```

---

## THE BRUTAL GATE PROCESS

Every feature follows this exact flow:

```
┌─────────────────────────────────────────────────────────┐
│                     DEVELOPER WRITES CODE                 │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                TIER 1: UNIT TESTS                         │
│   "Does the logic work?"                                  │
│   Run: vendor/bin/pest --filter=Unit                      │
│   Gate: 100% pass                                         │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                TIER 2: FEATURE TESTS                      │
│   "Does the API work?"                                    │
│   Run: vendor/bin/pest --filter=Feature                   │
│   Gate: 100% pass + new tests for the feature             │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                TIER 3: E2E TESTS                          │
│   "Does the user journey work?"                           │
│   Run: npx playwright test --project=chromium --workers=1 │
│   Gate: 100% pass (ALL tests, not just the new one)       │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                TIER 4: REGRESSION CHECK                   │
│   "Did we break anything?"                                │
│   Run: composer test (ALL tests)                          │
│   Gate: All existing tests still pass                     │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                ⭐ FEATURE IS DONE ⭐                       │
│   Ship it. Move to next feature.                         │
└─────────────────────────────────────────────────────────┘
```

**If any gate fails**, the developer stops, fixes the issue, and restarts from the failing gate. No exceptions. No "I'll fix it later." No "it's just a test issue."

---

## RE-EVALUATION CHECKPOINTS

After each Group Phase completes, run the **Full Brutal Gauntlet**:

### Full Gauntlet Checklist

```
[ ] PHPUnit: composer test — 0 failures
[ ] E2E Chromium: npx playwright test --project=chromium --workers=1 — 0 failures
[ ] E2E Firefox: npx playwright test --project=firefox --workers=1 — 0 failures
[ ] Security scan: composer audit — 0 advisories
[ ] Security scan: npm audit — 0 high/critical
[ ] Load test: k6 run services/tests/load/smoke-test.js — 0 failures
[ ] N+1 check: PerformanceTest — all query count assertions pass
[ ] Code review: No dead code, no commented-out code, no unnecessary imports
[ ] Documentation: README updated if API changed
```

### Phase Exit Decision

After the Full Gauntlet, answer these questions:

1. **Does every new endpoint have a test?** If no → don't exit.
2. **Do all existing tests still pass?** If no → don't exit.
3. **Are there any P0/P1/P2 bugs?** If yes → don't exit.
4. **Has the load test shown acceptable performance?** If no → don't exit.
5. **Has security scan found any issues?** If yes → don't exit.

**Only when ALL answers are "yes" does the Phase exit.**

---

## TESTING INFRASTRUCTURE

### Running Tests

```bash
# PHP Unit Tests (all)
cd services/api && composer test

# PHP Unit Tests (specific)
cd services/api && vendor/bin/pest --filter=BoardTest
cd services/api && vendor/bin/pest --filter=AutomationTest

# E2E Tests
cd services/web && npx playwright test --project=chromium --workers=1
cd services/web && npx playwright test --project=firefox --workers=1
cd services/web && npx playwright test --project=chromium --headed  # debug

# Load Tests (requires k6 installed)
k6 run services/tests/load/smoke-test.js

# Security Scan
composer audit
npm audit
trivy fs services/api
semgrep ci --config=auto
```

### Test Environment

```env
# .env.testing (already configured)
APP_ENV=testing
CACHE_STORE=file        # NOT database — avoids transaction visibility issues
QUEUE_CONNECTION=sync   # Jobs run synchronously in tests
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_DATABASE=aquerii_test
```

### Test Data

- `E2ESeeder.php` seeds: test user (test@example.com / password123), one workspace, one board
- Available in both test and dev environments
- Never seed production data from tests

---

## TRACKING

Track test progress in `tests/TRACKING.md`:

```markdown
# Test Tracking — 2026-05-21

## Current Count
- PHP Unit: 46 passing, 0 failing
- E2E Chromium: 5/12 passing, 7 failing
- E2E Firefox: 0/12 passing, 12 failing

## Target
- PHP Unit: 98+ passing (all Tier 1 + Tier 2)
- E2E Chromium: 20+ passing (all Tier 3)
- E2E Firefox: 20+ passing (all Tier 3)
- Load tests: 3 scripts created (Tier 4)

## Recently Added
- (date): Added AutomationTest with 7 tests covering trigger evaluation
- (date): Added AITest with 6 tests covering streaming + caching
```

---

## THE FINAL GUARANTEE

Aquerii ships with this guarantee:

**Every endpoint is tested. Every user journey works. Every regression is caught.**

When a customer reports a bug, the process is:
1. Write a test that reproduces the bug
2. Fix the code so the test passes
3. Run the FULL gauntlet
4. Ship the fix

No bug is fixed without a test that proves it's fixed. No feature ships without a test that proves it works.
