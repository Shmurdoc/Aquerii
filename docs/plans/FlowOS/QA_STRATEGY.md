# FlowOS — QA Strategy

**Version**: 1.0  
**Philosophy**: Ship nothing you wouldn't bet your reputation on. Every feature is guilty until tests prove it innocent.  
**Coverage Targets**: Unit ≥ 80% | Integration ≥ 70% | E2E critical paths 100%  
**CI Gate**: All test layers must pass before merge to `main`. No exceptions. No skips.

---

## 1. Test Pyramid

```
                    /\
                   /  \
                  / E2E \          ← Playwright (critical user journeys)
                 /________\
                /          \
               / Integration \     ← PHPUnit + Pest + Supertest
              /______________\
             /                \
            /   Unit Tests      \  ← PHPUnit/Pest (PHP) + Vitest (JS) + Pytest (Python)
           /____________________\
          /                      \
         /  Static Analysis        \ ← PHPStan L8, ESLint, Ruff, mypy
        /__________________________ \
```

### Coverage Targets by Layer

| Layer | Tool | Target | Blocking |
|-------|------|--------|----------|
| Static analysis | PHPStan L8 / ESLint / Ruff | 0 errors | Yes |
| Unit (PHP) | Pest v3 | ≥ 80% line coverage | Yes |
| Unit (JS/TS) | Vitest | ≥ 80% line coverage | Yes |
| Unit (Python) | Pytest + coverage.py | ≥ 80% line coverage | Yes |
| Integration (API) | Pest Feature Tests | ≥ 70% endpoint coverage | Yes |
| Integration (Realtime) | Supertest + Socket.IO client | All event types | Yes |
| Contract | Pact (consumer-driven) | All inter-service contracts | Yes |
| E2E | Playwright | 100% critical paths | Yes |
| Visual regression | Playwright screenshots | Key UI components | Warning only |
| Load | k6 | SLOs met | Yes (pre-release) |
| Chaos | k6 + Toxiproxy | Recovery verified | Yes (pre-release) |
| Security | OWASP ZAP + Semgrep | 0 Critical/High | Yes |
| Accessibility | axe-core (Playwright) | 0 Critical violations | Yes |

---

## 2. Unit Testing

### PHP (Laravel — Pest v3)

**What gets unit tested**:
- All service classes (BoardService, AutomationEngine, BillingService, etc.)
- All model methods and scopes
- All form request validators
- All computed properties
- All Artisan commands
- All queue jobs (isolated, no DB)
- Billing calculations (plan limits, quota enforcement, proration)
- AI credit metering logic
- Idempotency key generation + collision detection

**Rules**:
- No HTTP requests in unit tests — mock all external services
- No DB hits in unit tests — use in-memory fakes or mock repositories
- Each test: one assertion focus, clearly named

```php
// tests/Unit/Services/BillingServiceTest.php
it('blocks storage write when quota is exceeded', function () {
    $workspace = Workspace::factory()->make([
        'storage_used_bytes' => 10 * 1024 * 1024 * 1024, // 10 GB
        'storage_quota_bytes' => 10 * 1024 * 1024 * 1024, // 10 GB (at limit)
    ]);
    
    $service = new StorageService(mock(StorageRepository::class));
    
    expect(fn() => $service->checkQuota($workspace, 1024))
        ->toThrow(StorageQuotaExceededException::class);
});
```

### JavaScript/TypeScript (Vitest)

**What gets unit tested**:
- All Pinia stores (state mutations, getters, actions)
- All composables
- All utility functions (date formatting, column value parsing, permission checks)
- All form validation logic
- BlockNote editor extensions
- Realtime event handlers (isolated from Socket.IO)

```typescript
// tests/unit/stores/board.test.ts
describe('boardStore', () => {
  it('moves item between groups optimistically', () => {
    const store = useBoardStore()
    store.$patch({ items: [mockItem({ group_id: 'group-1' })] })
    
    store.moveItem({ itemId: 'item-1', toGroupId: 'group-2', position: 0 })
    
    expect(store.items[0].group_id).toBe('group-2')
  })
})
```

### Python (Pytest)

**What gets unit tested**:
- All AI prompt builders (verify no PII leaks into prompts)
- Credit metering calculations
- RAG chunking + embedding pipeline
- PDF text extraction logic
- Automation JSON generation validation

```python
# tests/unit/test_credit_meter.py
def test_raises_when_credits_exhausted():
    workspace = MockWorkspace(ai_credits_used=500, ai_credits_quota=500)
    
    with pytest.raises(HTTPException) as exc_info:
        check_and_consume_credits_sync(workspace, action="task_description", cost=2)
    
    assert exc_info.value.status_code == 402
    assert exc_info.value.detail["code"] == "AI_CREDITS_EXHAUSTED"
```

---

## 3. Integration Testing

### API Integration (Pest Feature Tests)

**Setup**: Uses real PostgreSQL (test database), real Redis, mocked external services (Stripe, PayFast, Gemini, Claude, GitHub)

**What gets integration tested**:
- Every API endpoint: happy path + all error cases
- RLS enforcement: workspace A cannot read workspace B's data
- Idempotency: duplicate requests with same key return same response, no duplicate side effects
- Webhook processing: Stripe + PayFast webhook handlers
- Queue job execution (sync driver in tests)
- File upload + storage metering
- Automation trigger → action execution chain
- Permission enforcement: each endpoint tested with each role (owner/admin/member/guest/no-auth)

```php
// tests/Feature/Boards/CreateItemTest.php
it('enforces workspace isolation via RLS', function () {
    $workspace1 = Workspace::factory()->withOwner()->create();
    $workspace2 = Workspace::factory()->withOwner()->create();
    $board = Board::factory()->for($workspace1)->create();
    
    // Authenticate as workspace2 owner
    actingAs($workspace2->owner)
        ->postJson("/api/boards/{$board->id}/items", ['title' => 'Test'])
        ->assertForbidden();
});

it('returns same response for duplicate idempotency key', function () {
    $user = User::factory()->withWorkspace()->create();
    $key = 'idem-key-' . Str::uuid();
    
    $first  = actingAs($user)->withIdempotencyKey($key)->postJson('/api/items', $payload);
    $second = actingAs($user)->withIdempotencyKey($key)->postJson('/api/items', $payload);
    
    expect($second->json('id'))->toBe($first->json('id'));
    expect(Item::count())->toBe(1); // Only one created
});
```

### Realtime Integration (Supertest + Socket.IO)

```javascript
// tests/integration/realtime/boardSync.test.ts
it('broadcasts item update to all workspace members', async () => {
  const client1 = await connectAsUser(userA, workspaceId)
  const client2 = await connectAsUser(userB, workspaceId)

  const received = new Promise(resolve => client2.on('item:updated', resolve))
  
  await api.patch(`/items/${itemId}`, { title: 'Updated' }, { headers: authHeaders(userA) })
  
  const event = await received
  expect(event.id).toBe(itemId)
  expect(event.title).toBe('Updated')
  
  client1.disconnect()
  client2.disconnect()
})
```

### Contract Testing (Pact)

Consumer-driven contracts between services:

| Consumer | Provider | Contract |
|----------|----------|----------|
| Web client | Laravel API | All API response shapes |
| Laravel API | AI Service | `/task/generate-description`, `/document/generate`, `/automation/generate` |
| Laravel API | Realtime Service | Event push endpoint |
| Super Admin | Laravel API | Internal admin endpoints |

Pact broker runs in CI. Provider verification runs on every provider service PR.

---

## 4. End-to-End Testing (Playwright)

### Critical Paths (100% required — all must pass before release)

**Auth**:
- [ ] Register → verify email → login
- [ ] Google OAuth login
- [ ] Password reset flow
- [ ] MFA setup + login with MFA

**Boards**:
- [ ] Create workspace → create board → create group → create item
- [ ] Drag item between groups (Kanban)
- [ ] Edit item: all field types (text, number, date, status, person, file)
- [ ] Switch views: Table → Kanban → Timeline → Calendar → Workload → Canvas
- [ ] Invite member → member sees board in real-time
- [ ] Export board to CSV

**Documents**:
- [ ] Create document → type with BlockNote → formatting (bold, headers, lists, tables)
- [ ] `/ai` command → generate text → accept
- [ ] Real-time collaborative editing (2 browsers simultaneously)
- [ ] Upload PDF → extract text → generate flowchart

**CRM**:
- [ ] Create contact → create company → create deal → move deal through pipeline
- [ ] AI lead scoring trigger
- [ ] Email draft generation

**Automation**:
- [ ] Create automation via UI (trigger + filter + action)
- [ ] Create automation via AI description → verify generated JSON → activate
- [ ] Verify automation fires on trigger event

**Billing**:
- [ ] Upgrade plan (Stripe test mode)
- [ ] Storage quota warning at 90%
- [ ] Storage block at 100% — verify 402 on upload
- [ ] Trial expiry → downgrade to Free

**Mobile (React Native — Detox)**:
- [ ] Login → view board → create item → assign to self
- [ ] Offline: create item while offline → sync when online
- [ ] Push notification received and tapped → opens correct item

### Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html'], ['junit', { outputFile: 'results.xml' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile',   use: { ...devices['iPhone 14'] } },
  ],
})
```

---

## 5. Performance / Load Testing (k6)

### Load Profile (Pre-Release Gate)

```javascript
// tests/load/scenarios.js
export const options = {
  scenarios: {
    // Steady state: normal business hours
    steady_state: {
      executor: 'ramping-vus',
      stages: [
        { duration: '5m', target: 500 },   // Ramp up
        { duration: '30m', target: 500 },  // Steady
        { duration: '5m', target: 0 },     // Ramp down
      ],
    },
    // Spike: product launch announcement
    spike: {
      executor: 'ramping-vus',
      startTime: '40m',
      stages: [
        { duration: '1m', target: 3000 },  // Sudden spike
        { duration: '5m', target: 3000 },  // Hold
        { duration: '2m', target: 500 },   // Back to normal
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p95 < 500', 'p99 < 1000'],
    http_req_failed:   ['rate < 0.01'],  // < 1% errors
    ws_connecting:     ['p95 < 200'],
  },
}
```

### SLO Verification Thresholds

| Metric | Target | Fail Gate |
|--------|--------|-----------|
| API p95 latency | < 500ms | > 600ms |
| API p99 latency | < 1000ms | > 1500ms |
| Error rate | < 1% | > 2% |
| WebSocket connect p95 | < 200ms | > 500ms |
| Realtime event delivery p95 | < 100ms | > 300ms |
| DB query p95 | < 50ms | > 100ms |

---

## 6. Chaos Engineering

Scenarios run via Toxiproxy (network fault injection) + k6:

| Scenario | Injection | Expected Behavior | Pass Criteria |
|----------|-----------|-------------------|---------------|
| Redis unavailable | Kill Redis container | Queues pause, API uses DB fallback | No 500s on read endpoints |
| DB replica lag 10s | Toxiproxy latency | Search degrades gracefully | 0 primary reads rerouted to replica |
| AI service down | Kill AI container | AI buttons disabled in UI, no 500 from API | 503 with `retry-after` header |
| Storage service unreachable | Network partition | File uploads queue, user sees "upload pending" | No data loss |
| Realtime service crash | Kill Node container | UI shows offline banner, reconnects automatically | Auto-reconnect within 5s |
| Primary DB failover | Kill primary | Failover to replica, < 30s downtime | Read traffic resumes; write traffic waits |
| Meilisearch down | Kill container | Search returns empty with `search_unavailable` flag | No unhandled exceptions |

---

## 7. Security Testing

### Automated (every PR)

- **Semgrep**: SAST scan — PHP, TypeScript, Python rules (`semgrep --config=auto`)
- **npm audit / pip-audit / composer audit**: dependency vulnerability scan
- **OWASP ZAP**: DAST scan against staging environment (baseline scan on every PR, full scan weekly)

### Pre-Release Security Checklist

- [ ] OWASP Top 10 manual verification
- [ ] RLS bypass attempt: raw SQL via API inputs
- [ ] Mass assignment attempt on all models
- [ ] IDOR: access item by ID without workspace membership
- [ ] JWT: expired token, tampered signature, algorithm confusion
- [ ] File upload: MIME type spoofing, path traversal, zip bomb
- [ ] Automation: SSRF attempt via webhook action URL
- [ ] Rate limiting: brute force login (must lock after 10 attempts)
- [ ] SQL injection via all filter parameters
- [ ] XSS via item title, description, comments
- [ ] CSRF: state-changing requests without token

### Penetration Testing (Phase 5 — before public launch)
- External red team (scope: all public endpoints, auth, file upload, billing)
- Pass gate: 0 Critical, 0 High findings
- Medium findings: documented + scheduled fix within 30 days

---

## 8. CI Pipeline Integration

```yaml
# .github/workflows/test.yml (abbreviated)
jobs:
  static-analysis:
    runs-on: ubuntu-latest
    steps:
      - run: ./vendor/bin/phpstan analyse --level=8
      - run: npx eslint . --max-warnings=0
      - run: ruff check services/ai/
      - run: npx tsc --noEmit

  unit-tests:
    needs: static-analysis
    steps:
      - run: ./vendor/bin/pest --coverage --min=80
      - run: npx vitest run --coverage
      - run: pytest --cov=app --cov-fail-under=80

  integration-tests:
    needs: unit-tests
    services:
      postgres: { image: postgres:15.6 }
      redis:    { image: redis:7.2 }
    steps:
      - run: ./vendor/bin/pest --testsuite=Feature

  contract-tests:
    needs: unit-tests
    steps:
      - run: npx pact-verifier

  e2e-tests:
    needs: integration-tests
    steps:
      - run: npx playwright test
    
  security-scan:
    steps:
      - run: semgrep --config=auto --error
      - run: composer audit --no-dev
      - run: npm audit --audit-level=high
```

**Merge to `main` blocked unless**: static-analysis + unit + integration + contract + e2e + security all green.

---

## 9. QA Team Process

### Definition of Ready (before dev starts)
- [ ] Acceptance criteria written in Given/When/Then format
- [ ] Edge cases documented (empty state, quota exceeded, concurrent edit, offline)
- [ ] API contract defined (request/response shape, error codes)
- [ ] Design mockup reviewed by QA

### Definition of Done (before PR merge)
- [ ] Unit tests written for all new service methods
- [ ] Integration test for every new endpoint
- [ ] E2E test for any new user-facing flow
- [ ] Coverage delta: new code must not drop overall coverage below target
- [ ] All existing tests still pass
- [ ] Security checklist item checked if auth/file/billing touched

### Bug Severity Classification

| Severity | Definition | Fix SLA |
|----------|-----------|---------|
| P0 — Critical | Data loss, security breach, billing incorrect, complete outage | Fix + deploy within 2 hours |
| P1 — High | Feature completely broken for all users | Fix within 24 hours |
| P2 — Medium | Feature broken for subset of users / workaround exists | Fix within 1 week |
| P3 — Low | Cosmetic / minor UX issue | Fix in next sprint |

### Regression Test Schedule
- **Per PR**: full CI pipeline (all automated tests)
- **Weekly**: full Playwright suite + ZAP scan on staging
- **Pre-release**: load test + chaos test + full security checklist + manual exploratory testing (2-hour session)

---

*Owner: QA Lead*  
*Cross-reference: CI_CD_PIPELINE.md, PHASE_PLAN.md §5 (release gates)*
