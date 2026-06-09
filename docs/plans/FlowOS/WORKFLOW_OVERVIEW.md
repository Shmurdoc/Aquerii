# FlowOS — Workflow Overview

**Version**: 1.0  
**Status**: AUTHORITATIVE  
**Owner**: Tech Lead  
**Audience**: All team leads. This is the end-to-end operational reference every engineer reads before writing a single line of code. Every workflow here is final. Deviations require a written decision record.

---

## 1. Development Workflow

### Daily Developer Loop

```
1. Pull latest main
   git pull origin main

2. Create feature branch
   git checkout -b feature/P1.11-board-crud
   Branch naming: {type}/{task-id}-{short-description}
   Types: feature | fix | refactor | chore | test | docs

3. Write code
   - Unit tests alongside every new class/function
   - Integration test for every new endpoint
   - No TODOs in committed code
   - No console.log / dd() / var_dump() in committed code

4. Run tests locally before pushing
   # PHP
   ./vendor/bin/pest --coverage
   ./vendor/bin/phpstan analyse --level=8
   
   # TypeScript
   npx vitest run --coverage
   npx tsc --noEmit
   npx eslint . --max-warnings=0
   
   # Python
   pytest --cov=app --cov-fail-under=80
   ruff check services/ai/

5. Push and open PR
   - PR title format: [P1.11] Board CRUD — create, rename, archive, delete
   - PR description: what changed, why, how to test, screenshots for UI changes
   - Assign: self + Tech Lead reviewer
   - Link: task ID in PHASE_PLAN.md

6. CI pipeline runs (automated — ~12 min total)
   See Section 2 below.

7. Code review
   - Reviewer checks: logic, security, tests, migration safety, API contract alignment
   - At least 1 approval required before merge
   - No self-merge ever

8. Merge to main (squash merge)
   - Commit message format: [P1.11] Board CRUD (#PR-number)
   - Branch deleted after merge

9. Staging auto-deploys (within 5 min of merge)
   - QA verifies on staging
   - If P0/P1 found: revert merge immediately, fix in new branch
```

---

## 2. CI Pipeline Workflow

Every PR triggers this pipeline in order. Any red stage blocks merge.

```
Stage 1: Code Quality (parallel, ~2 min)
├── PHPStan level 8 (0 errors required)
├── ESLint (0 warnings required)
├── Ruff (Python linting, 0 errors)
└── mypy (Python type check)

Stage 2: Unit Tests (parallel, ~3 min)
├── PHP: ./vendor/bin/pest --coverage --min=80
├── TypeScript: npx vitest run --coverage (min 80%)
└── Python: pytest --cov=app --cov-fail-under=80

Stage 3: Integration Tests (~5 min)
├── Services: postgres:15.6, redis:7.2 (spun up in CI)
├── PHP Feature tests: ./vendor/bin/pest --testsuite=Feature
└── Node.js Supertest (realtime integration)

Stage 4: Contract Tests (~2 min)
└── Pact consumer + provider verification

Stage 5: E2E Tests (~8 min)
└── Playwright: chromium + firefox + mobile
    (runs against docker-compose stack spun up in CI)

Stage 6: Security (~3 min, parallel with E2E)
├── Semgrep SAST (0 errors)
├── composer audit (0 high/critical)
├── npm audit (0 high/critical)
└── pip-audit (0 high/critical)

Stage 7: Container Build + Push (~3 min)
└── Build Docker images, push to ghcr.io (only on main branch merge)

Total: ~15 min on merge to main, ~12 min on PR
```

---

## 3. Feature Development Workflow (end-to-end example)

Using **"Create Item"** as the canonical example every engineer should memorise.

### Backend Engineer (PHP)

```
1. Write DB migration (if schema change needed)
   php artisan make:migration add_items_table
   
   Rules:
   - Always backwards compatible
   - Add RLS policy for new tenant tables
   - Never DROP in same migration as feature (2-phase)

2. Write Model
   app/Models/Item.php
   - $fillable (explicit, no mass assignment of protected fields)
   - $casts (JSONB → array, dates → Carbon)
   - Relationships (board, group, assignees, comments)
   - Scopes (for workspace, for board)

3. Write Observer
   app/Observers/ItemObserver.php
   - created(): publish item:created event + log to realtime_events
   - updated(): publish item:updated event + log which fields changed
   - deleted(): publish item:deleted event

4. Write Form Request (validation)
   app/Http/Requests/CreateItemRequest.php
   - All validation rules
   - Authorization check (can user create items on this board?)

5. Write Policy
   app/Policies/ItemPolicy.php
   - create(), update(), delete(), view()
   - Calls WorkspaceMember check + RLS-enforced DB query

6. Write Service (business logic — not in controller)
   app/Services/ItemService.php
   - createItem(CreateItemRequest $request): Item
   - Wraps in DB::transaction()
   - Dispatches quota check BEFORE write
   - Calls observer implicitly via Eloquent

7. Write Controller (thin — delegates to service)
   app/Http/Controllers/ItemController.php
   - store(CreateItemRequest $request): JsonResponse
   - Returns ItemResource (never raw model)

8. Write Resource (response shape)
   app/Http/Resources/ItemResource.php
   - Matches API_CONTRACTS.md Item object exactly
   - No extra fields, no missing fields

9. Register route
   routes/api.php
   - Route::post('/boards/{board}/items', [ItemController::class, 'store'])
   - ->middleware(['auth:api', 'tenant', 'idempotency'])

10. Write tests
    tests/Unit/Services/ItemServiceTest.php
    tests/Feature/Items/CreateItemTest.php
    - Happy path
    - Validation failures (missing title, invalid group_id)
    - Authorization: unauthenticated → 401
    - Authorization: wrong workspace → 403
    - Authorization: guest cannot create → 403
    - Quota exceeded → 402
    - Idempotency: duplicate key → same response, no duplicate item
    - RLS: workspace B cannot create item in workspace A's board → 403

11. Register Observer in AppServiceProvider
    Item::observe(ItemObserver::class);
```

### Frontend Engineer (TypeScript/React)

```
1. Define TypeScript types
   apps/web/src/types/item.ts
   - Mirror API_CONTRACTS.md Item object exactly

2. Write API client function
   apps/web/src/api/items.ts
   - createItem(boardId, payload): Promise<Item>
   - Includes idempotency key generation
   - Includes X-Workspace-ID header

3. Write Pinia store action
   apps/web/src/stores/board.ts
   - createItem(payload): Promise<void>
   - Optimistic update: add item to local state immediately
   - Call API
   - On success: server event reconciles (deduplication)
   - On failure: rollback local state + toast error

4. Write Socket.IO listener
   apps/web/src/realtime/listeners/board.ts
   - socket.on('item:created', handler)
   - handler: if actor_id !== me → add to store (others' items)
   - handler: if actor_id === me → deduplicate (already applied)

5. Write component
   apps/web/src/components/board/CreateItemDialog.tsx
   - Form with title (required), group (required), optional fields
   - Calls store.createItem()
   - Loading state, error state, success toast

6. Write unit tests
   tests/unit/stores/board.test.ts
   - createItem optimistic update applies immediately
   - createItem rolls back on API failure
   
   tests/unit/components/CreateItemDialog.test.ts
   - Renders correctly
   - Validates required fields
   - Submits on form submit

7. Write E2E test
   tests/e2e/boards/create-item.spec.ts
   - Open board → click Add Item → fill title → press Enter
   - Verify: item appears in board
   - Verify: second browser window sees item in < 1 second (realtime)
```

### AI Backend Engineer (Python)

*(For AI-enhanced item creation — "generate description" feature)*

```
1. Write prompt template
   services/ai/prompts/task_description.py
   - System prompt: role, constraints, output format
   - User prompt: title + board_context (sanitized)
   - No PII ever in prompt

2. Write endpoint
   services/ai/routes/task.py
   - POST /task/generate-description
   - Credit check middleware applied
   - Call Gemini Flash
   - Return { description, credits_used, credits_remaining }

3. Write unit tests
   tests/unit/test_task_generation.py
   - Prompt builder: verify PII stripped
   - Credit check: raises 402 when exhausted
   - Response parsing: handles malformed model output gracefully

4. Write integration test
   tests/integration/test_task_ai.py
   - Mock Gemini API
   - Verify credit consumed after successful call
   - Verify credit NOT consumed if Gemini returns error
```

---

## 4. Realtime Event Workflow (end-to-end)

```
User A edits item title in browser
         │
         ▼
Pinia store: optimistic update (title changes instantly in User A's UI)
         │
         ▼
PATCH /api/v1/items/{id} { "title": "New Title", "Idempotency-Key": "uuid" }
         │
         ▼
Laravel API:
  1. Idempotency check (Redis) → not seen before
  2. Policy gate → permitted
  3. BEGIN TRANSACTION
     a. UPDATE items SET title = 'New Title', version = version+1 WHERE id = ?
     b. INSERT INTO realtime_events (event_id, board_id, type, payload, sequence, ...)
  4. COMMIT
  5. Redis::publish('flowos:board:{board_id}', JSON event)
  6. Dispatch: UpdateMeilisearchIndex job
  7. Dispatch: EvaluateAutomationTriggers job
  8. Return 200 { data: { item } }
         │
         ├─────────────────────────────────────────────────────────┐
         ▼                                                         ▼
User A browser receives 200                          Redis pub/sub delivers to Node.js
  Pinia deduplicates (already applied)               Node.js: io.to('board:{id}').emit('item:updated', event)
                                                              │
                                                     ┌────────┴────────┐
                                                     ▼                 ▼
                                               User B browser    User C browser
                                               socket.on(        socket.on(
                                                'item:updated')   'item:updated')
                                               store applies      store applies
                                               update             update
                                               (< 200ms total)    (< 200ms total)
```

---

## 5. Billing Workflow

### New Workspace Upgrade to Pro Plan

```
User clicks "Upgrade to Pro" in billing settings
         │
         ▼
POST /billing/checkout { plan: 'pro', billing_cycle: 'monthly' }
         │
         ▼
Laravel API:
  1. Validate: user is workspace owner
  2. Create/retrieve Stripe customer for workspace
  3. Create Stripe Checkout Session
     - price_id: from PRICING_AND_BILLING.md price table
     - quantity: current seat count
     - success_url: /billing/success?session_id={CHECKOUT_SESSION_ID}
     - cancel_url: /billing/cancel
  4. Return { checkout_url: "https://checkout.stripe.com/..." }
         │
         ▼
Client redirects to Stripe Checkout
User enters card details
Stripe charges card
         │
         ▼
Stripe sends webhook: invoice.payment_succeeded + customer.subscription.created
         │
         ▼
POST /webhooks/stripe
  1. Verify Stripe-Signature header
  2. Idempotency: check billing_events by stripe_event_id
  3. BEGIN TRANSACTION
     a. INSERT billing_events (stripe_event_id UNIQUE)
     b. UPDATE workspaces SET plan = 'pro', stripe_subscription_id = ...
     c. UPDATE workspace quotas (seats, storage, automation, AI credits)
  4. COMMIT
  5. Dispatch: SendUpgradeConfirmationEmail
  6. Dispatch: UpdateMeilisearchQuotas
  7. Return 200
         │
         ▼
User's browser (polling /workspace/current every 30s OR next page load):
  Sees Pro plan, new features unlocked
```

---

## 6. Automation Engine Workflow

### Trigger: Status changed to "Done"

```
User marks item status = "Done"
         │
         ▼
PATCH /items/{id} { column_values: { col_status: { value: "Done" } } }
         │
         ▼
Item saved to PostgreSQL (transaction includes realtime_events insert)
         │
         ▼ (same HTTP request, after commit)
Dispatch: EvaluateAutomationTriggers job
  payload: { workspace_id, board_id, item_id, event_type: "status_changed", changed_fields: { col_status: { from: "In Progress", to: "Done" } } }
         │
         ▼ (Horizon queue: 'automations', processes within seconds)
EvaluateAutomationTriggers job:
  1. Load all ACTIVE automations for this workspace + board
  2. For each automation with trigger.type = 'status_changed':
     a. Check: trigger.config.to === "Done" ✓
     b. Evaluate filters (if any)
     c. If conditions met:
        - CREATE AutomationRun { status: 'pending', automation_id, item_id }
        - Dispatch: ExecuteAutomationActions job
         │
         ▼
ExecuteAutomationActions job:
  For each action in automation.actions:
    Action: send_notification
      - Resolve: {{ item.assignees }} → ["usr_01j..."]
      - INSERT notifications for each assignee
      - Publish: notification:created event to Socket.IO
      - Dispatch: SendEmailNotification job
    
    Action: move_item (to Archive board)
      - UPDATE items SET board_id = archive_board_id
      - Publish: item:moved event
  
  UPDATE AutomationRun SET status = 'completed', completed_at = now()
         │
         ▼
User sees:
  - Notification bell +1 in real-time (< 200ms)
  - Item disappears from current board (realtime event)
  - Email received within ~30 seconds
```

---

## 7. QA Workflow (per feature)

```
Feature branch opened
         │
         ▼
CI runs automatically (see Section 2)
All stages must be green before QA review
         │
         ▼
QA checklist (QA Lead reviews every PR touching user-facing features):

[ ] Happy path tested (unit + integration)
[ ] All error cases covered (validation, auth, quota, not found)
[ ] RLS isolation test present
[ ] Idempotency test present (for mutations)
[ ] Realtime: event emitted and received by other clients (integration test)
[ ] E2E: Playwright test covers user-visible flow
[ ] No accessibility violations (axe-core)
[ ] API response shape matches API_CONTRACTS.md exactly
[ ] Consistent error codes (matches standard error codes list)
         │
         ▼
QA approves → PR merged → auto-deploys to staging
         │
         ▼
QA smoke test on staging (manual, 10 min per feature):
[ ] Core flow works end-to-end on staging
[ ] No console errors in browser
[ ] Network tab: no unexpected 5xx
[ ] Realtime tested with 2 browser windows
[ ] Mobile: tested on staging via React Native dev build
         │
         ▼ (weekly, or before any release)
Full regression suite (automated, Playwright)
+ Manual exploratory session (2 hours, QA Lead)
+ Load test (k6, if any performance-sensitive changes)
```

---

## 8. Incident Response Workflow

```
Alert fires (PagerDuty / Slack #alerts)
         │
         ▼
On-call engineer acknowledges (within 5 min for P0, 15 min for P1)
         │
         ▼
Open #incidents Slack thread
Post: "Incident opened. Impact: [description]. Owner: [name]. Investigating."
         │
         ▼
Incident Commander assigned (Tech Lead for P0, senior engineer for P1)
         │
         ├── Technical Lead: diagnose + fix
         ├── Comms Lead: status page update every 15 min
         └── Scribe: document every action in #incidents thread
         │
         ▼
Diagnose (use runbooks in OPERATIONAL_MATURITY.md first)
         │
  ┌──────┴──────┐
  │             │
 Fix          Rollback
  │             │
  └──────┬──────┘
         │
         ▼
Verify resolution:
[ ] Alert cleared
[ ] Error rate back to baseline
[ ] Affected users notified (status page + email for > 30 min outages)
         │
         ▼
Post-incident:
[ ] Root cause identified
[ ] Written post-mortem (within 48 hours)
[ ] 3-5 action items assigned with owners and dates
[ ] Post-mortem reviewed in next team sync
```

---

## 9. Data Migration Workflow

```
Engineer needs schema change
         │
         ▼
Phase 1: Backwards-compatible change
  - Add column (nullable or with default)
  - Add index (CONCURRENTLY — never locks table)
  - Create new table
  
  Migration reviewed by Tech Lead:
  [ ] Is it backwards compatible?
  [ ] Does it need RLS policy?
  [ ] Is it safe to run on production with traffic?
  [ ] Is the rollback migration written?
         │
         ▼
Deploy Phase 1 to production
Run migration: php artisan migrate --force
(Zero downtime — new column nullable, old code still works)
         │
         ▼
(Background job: backfill new column for existing rows if needed)
         │
         ▼ (separate PR, minimum 1 week later)
Phase 2: Cleanup
  - Update code to use new column only
  - Deploy code first
  - Wait 24 hours (confirm no rollback needed)
  - Drop old column in separate migration
```

---

## 10. On-Call Rotation

| Week | Primary | Backup |
|------|---------|--------|
| Week A | Backend Lead | DevOps |
| Week B | Realtime Lead | Backend 2 |
| Week C | DevOps Lead | Tech Lead |
| Week D | Tech Lead | AI Backend |

**On-call responsibilities**:
- Acknowledge P0 alerts within 5 minutes (24/7)
- Acknowledge P1 alerts within 15 minutes (24/7)
- Follow runbooks (OPERATIONAL_MATURITY.md)
- Escalate if not resolved within 30 min
- Write post-mortem for every P0/P1

**Tools**: PagerDuty escalation policy → primary → backup → Tech Lead (last resort)

---

*Owner: Tech Lead*  
*Cross-reference: PHASE_PLAN.md, QA_STRATEGY.md, OPERATIONAL_MATURITY.md, CONSISTENCY_MODEL.md*
