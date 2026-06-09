# 05 — AI Super Prompts Reference

> **Purpose**: Copy-paste ready prompts for each phase. One prompt = one developer session.
> **Rule**: Load the prompt, execute each step, report results. Do not skip steps.
> **Format**: Each prompt includes context, task list, acceptance criteria, and test commands.

---

## GROUP ALPHA — CORE ENGINE

### Alpha-1: Fix Bug Gateway (E2E Green)

**Load this prompt at the start of the session:**
```
You are Group Alpha Lead Developer for Aquerii — a multi-tenant SaaS Work OS.

Your first task is to fix the E2E test gateway bugs. The codebase is at:
C:\Users\madoc\source\repos\Aquerii

CURRENT STATE:
- 12 E2E tests on Chromium: only 5 pass
- 12 E2E tests on Firefox: 0 pass
- Root causes are known:
  1. Missing data-testid=board-card on board cards
  2. Rate limiter at 5/min on login blocks parallel workers
  3. Create board test expects card on list page, but app navigates to detail page
  4. BASE_URL fallback mismatch

CONTEXT:
- services/web/playwright.config.ts — workers config
- services/web/tests/e2e/app.spec.ts — all E2E tests
- services/web/src/pages/boards/BoardsPage.tsx — board list (needs testid)
- services/web/src/pages/boards/BoardPage.tsx — board detail (new navigation target)

TASKS:
1. Read all the files listed in CONTEXT
2. Fix B1: Add data-testid="board-card" to each board card button in BoardsPage.tsx (the <button> inside the map loop around line 47-64)
3. Fix B2: Set workers: 1 in playwright.config.ts for all projects
4. Fix B3: Update the "can create a new board" test (~line 73) to expect URL pattern /boards/{uuid} instead of looking for the card on the list
5. Fix B4: Change LOCALHOST fallback in app.spec.ts from http://localhost:3000 to https://localhost
6. Investigate B5: Firefox login failure. Check if Firefox blocks sessionStorage or cookies. Test by running: npx playwright test --project=firefox --workers=1

TEST AFTER EACH BUG:
- cd services/web && npx playwright test --project=chromium --workers=1

REPORT:
- Which bugs are fixed (should be B1-B4)
- B5 root cause with evidence from Firefox testing
- Final test count after all fixes
```

---

### Alpha-2: Auth Hardening

**Load this prompt after Alpha-1 passes:**
```
You are Group Alpha Lead Developer for Aquerii.

TASK: Harden authentication. Current state has email verification route but no enforcement, MFA routes but no flow, infinite token lifetime.

CONTEXT:
- services/api/app/Http/Controllers/Auth/AuthController.php — all auth methods
- services/api/app/Core/Models/User.php — has email_verified_at, two_factor_secret, two_factor_recovery_codes
- services/api/routes/api.php — all registered routes
- services/api/app/Http/Middleware/ — middleware directory
- services/api/tests/Feature/Auth/RegisterTest.php — existing reg test
- services/api/tests/Feature/Auth/LoginTest.php — existing login test

TASKS:
1. Create EnsureEmailIsVerified middleware. Return 403 EMAIL_NOT_VERIFIED if email_verified_at is null.
2. Add resend verification endpoint POST /api/auth/verify-email/resend (throttle:3,1). Generate signed URL and log it (dev) or queue email.
3. Apply EnsureEmailIsVerified to all authenticated routes in routes/api.php (the sanctum group).
4. Complete MFA flow:
   - POST /api/auth/mfa/enable generates TOTP secret, stores on User, returns QR code URL
   - Login: if user has two_factor_secret set, return mfa_required: true with a temporary mfa_token
   - POST /api/auth/mfa/verify: consumes mfa_token + TOTP code, returns real Sanctum token
   - Create middleware RequireMfa that checks session for mfa_verified
5. Add token expiry: Sanctum tokens get expires_at = 30 days. Return expires_at in login response.
6. Create app:expire-tokens command: revoke all tokens where expires_at < now().
7. Fix refresh token: on POST /api/auth/refresh, revoke old token and issue new one with new expiry.

NEW TESTS (in tests/Feature/Auth/):
- EmailVerificationTest:
  - unverified email gets 403 on /api/me
  - verify email endpoint marks email_verified_at
  - resend verification throttle works (3 tries then 429)
- MfaTest:
  - enable MFA returns QR code
  - login with MFA returns mfa_required: true
  - verify MFA with valid code returns sanctum token
  - verify MFA with invalid code returns 422
- TokenExpiryTest:
  - expired token returns 401
  - refresh rotates token correctly
  - old token invalid after refresh

VERIFY:
- composer test — ALL existing + 8+ new tests = 54+ passing
- E2E test: login → verify email flow still works
```

---

### Alpha-3: Realtime Event Bus

**Load this prompt after Alpha-2 passes:**
```
You are Group Alpha Lead Developer for Aquerii.

TASK: Wire the realtime event bus. Domain events exist but are NOT broadcast to Socket.IO.

CONTEXT:
- services/api/app/Core/Observers/BoardObserver.php, ItemObserver.php, CommentObserver.php — observers that fire on model save
- services/api/app/Core/Events/ItemUpdated.php — example event class
- services/realtime/ — Node.js Socket.IO server
- services/web/src/hooks/useSocket.ts — frontend socket hook
- services/web/src/hooks/usePresence.ts — presence hook
- services/web/src/stores/ — notification store
- infra/caddy/Caddyfile — already proxies /socket.io/* to realtime:3000

TASKS:
1. Create broadcasting events: BoardCreated, BoardUpdated, BoardDeleted, ItemCreated, ItemUpdated, ItemDeleted, CommentCreated, CommentDeleted. Each should implement ShouldBroadcast and define broadcastOn() returning PrivateChannel for the board.
2. Update observers: after model saved, broadcast the event. Use event(new BoardCreated($board)).
3. Configure config/broadcasting.php for pusher-compatible Socket.IO driver. Set pusher.app_id, key, secret from .env (these correspond to the realtime service config).
4. Register POST /broadcasting/auth in routes/api.php (no middleware group — it needs to be accessible without CSRF but with Sanctum auth). The auth callback should verify the user has access to the requested channel (private-boards.{id}).
5. Wire presence channels: when user opens a board, broadcast to presence-boards.{id}. Include user id, name, avatar. Use Redis for presence state.
6. In useSocket.ts: connect to Socket.IO, authenticate with Sanctum token, subscribe to private-boards.{id} on board load, unsubscribe on leave.

NEW TESTS (in tests/Feature/):
- RealtimeTest.php:
  - BoardObserver broadcasts BoardCreated on create (Event::fake, assert event dispatched)
  - ItemObserver broadcasts ItemUpdated on update
  - CommentObserver broadcasts CommentCreated on create
  - POST /broadcasting/auth returns 200 with valid board access
  - POST /broadcasting/auth returns 403 without board access

VERIFY:
- composer test — ALL existing + 5+ new = 59+ passing
- docker compose logs realtime — should show "channel subscribed: private-boards.{id}"
```

---

## GROUP BETA — BUSINESS MODULES

### Beta-1: CRM Complete

**Load this prompt after Group Alpha completes:**
```
You are Group Beta Lead Developer for Aquerii.

TASK: Complete the CRM module. All CRUD routes exist but have zero tests and missing features.

CONTEXT:
- services/api/app/Modules/CRM/Http/Controllers/ — 6 controllers
- services/api/app/Modules/CRM/Models/ — 5 models
- services/api/routes/modules/crm.php — all CRM routes
- services/api/tests/ — test directory

TASKS:
1. Audit routes/modules/crm.php for duplicates. Remove or deprecate CRMControllers.php.
2. Verify ALL CRM models have workspace_id and RLS policies (check migration and pg_policies).
3. Add stage reorder endpoint: POST /api/workspaces/{ws}/crm/stages/reorder. Accept { stage_ids: [uuid, uuid, ...] }, update position accordingly.
4. Add stage transition validation: Deal@update checks if the new stage_id is a valid transition. Config: pipeline allows skipping stages? (default no). Return 422 INVALID_TRANSITION.
5. Add contact dedup: before ContactController@store, check email uniqueness in workspace. Return 409 CONTACT_DUPLICATE with existing contact id.

NEW TESTS (in tests/Feature/Modules/CrmTest.php):
- Creates pipeline with 4 stages
- Creates deal in first stage
- Moves deal to next stage (valid transition) — 200
- Tries to skip stage (invalid transition) — 422
- Creates contact with company
- Tries to create duplicate contact email — 409
- Reorders stages — 200 with correct position order
- Cross-workspace: access another workspace's pipeline — 404

VERIFY:
- composer test — ALL existing + 8+ new = 67+ passing
```

---

### Beta-2: Automation Engine (Critical)

**Load this prompt after Beta-1 passes:**
```
You are Group Beta Lead Developer for Aquerii.

THIS IS THE MOST IMPORTANT TASK IN THE PROJECT. DO NOT SKIP TESTS.

TASK: Build the automation engine with real triggers and actions. Currently a skeleton.

CONTEXT:
- services/api/app/Modules/Automation/Models/Automation.php — trigger_type, trigger_config (JSON), actions (JSON), is_active
- services/api/app/Modules/Automation/Models/AutomationRun.php — execution log
- services/api/app/Modules/Automation/Services/AutomationEngine.php — empty shell
- services/api/app/Modules/Automation/Http/Controllers/AutomationController.php — CRUD
- services/api/app/Core/Observers/ — domain event observers
- services/api/app/Core/Jobs/EvaluateAutomationTriggers.php — already exists, not wired

TASKS:
1. Create TriggerType enum: ITEM_STATUS_CHANGED, ITEM_CREATED, ITEM_ASSIGNED, DUE_DATE_APPROACHING, COMMENT_ADDED
2. Create ActionType enum: CHANGE_STATUS, ASSIGN_USER, SET_DUE_DATE, SEND_NOTIFICATION, CREATE_ITEM, CALL_WEBHOOK
3. Implement AutomationEngine::evaluate():
   - Read trigger_type + trigger_config from Automation
   - ITEM_STATUS_CHANGED: check if context['item']['status'] == trigger_config['to'] (AND previous == trigger_config['from'] if set)
   - ITEM_CREATED: check board_id matches trigger_config['board_id'] if set
   - DUE_DATE_APPROACHING: check item.due_date is within trigger_config['hours_before'] hours
   - Return bool

4. Implement AutomationEngine::execute():
   - Loop over actions[]
   - Each action: map to handler class (e.g., ChangeStatusAction, AssignUserAction)
   - Execute handler with context
   - Log result to AutomationRun.results (JSON array of {action, status, message})
   - On failure: mark run as 'failed', log error, STOP further actions
   - Return AutomationRun

5. Wire EvaluateAutomationTriggers job:
   - In ItemObserver@updated: if status changed, dispatch EvaluateAutomationTriggers for the item's board
   - The job queries active automations for that board
   - Calls evaluate() for each
   - If true, calls execute()
   - Creates AutomationRun record

6. Build action handlers:
   - ChangeStatusAction: ItemService::update($item, ['status' => $value])
   - AssignUserAction: ItemService::addAssignee($item, $user_id)
   - SetDueDateAction: ItemService::update($item, ['due_date' => $date])
   - SendNotificationAction: NotificationService::notifyUser($user_id, $message)
   - CallWebhookAction: Http::post($url, $payload). Retry 3x on failure.

7. CALL_WEBHOOK specific:
   - POST to external URL with HMAC-signed payload
   - Retry with 2s, 4s, 8s exponential backoff
   - If all retries fail, mark run as failed

NEW TESTS (in tests/Feature/Modules/AutomationTest.php):
- AutomationEngineTest:
  - ITEM_STATUS_CHANGED evaluates to true when condition matches
  - ITEM_STATUS_CHANGED evaluates to false when condition doesn't match
  - DUE_DATE_APPROACHING evaluates to true within window
  - execute() with CHANGE_STATUS action updates item.status
  - execute() with multiple actions runs all successfully
  - execute() with failing action stops and marks run as failed
- AutomationControllerTest:
  - Creates automation with valid trigger/action
  - Lists automations for board
  - Delete automation also cancels pending runs (soft delete)
- IntegrationTest:
  - Creating an item on a board with ITEM_CREATED automation triggers execution
  - CALL_WEBHOOK sends correct payload (use Http::fake())

IMPORTANT: Each action handler should be a standalone class in App/Modules/Automation/Actions/
This keeps the engine clean and each action independently testable.

VERIFY:
- composer test — ALL existing + 12+ new = 79+ passing
- Manual: create automation "when item status changes to Done, send notification" → change item status → verify notification appears
```

---

## GROUP GAMMA — PLATFORM & QUALITY

### Gamma-1: Billing System

**Load this prompt after Group Beta completes:**
```
You are Group Gamma Lead Developer for Aquerii.

TASK: Complete the billing system. Stripe SDK is installed but not wired.

CONTEXT:
- services/api/app/Modules/Billing/Http/Controllers/BillingController.php — show, createCheckout, createPortal, cancelSubscription, payfastCheckout
- services/api/app/Core/Http/Controllers/Api/BillingController.php — may conflict
- services/api/app/Core/Models/BillingEvent.php — event logging
- services/api/app/Modules/Billing/Jobs/SendBillingConfirmationEmail.php — exists
- services/api/app/Modules/Billing/Mail/BillingConfirmation.php — empty template
- services/api/app/Core/Http/Controllers/Api/WebhookController.php — stripe + payfast handlers
- services/api/app/Core/Jobs/SyncStripeSubscriptionQuantity.php — exists but not wired

TASKS:
1. Create .env entries: STRIPE_KEY, STRIPE_SECRET, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_STARTER, STRIPE_PRICE_GROWTH, STRIPE_PRICE_BUSINESS, PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE, PAYFAST_URL
2. Wire BillingController@createCheckout: create Stripe Checkout Session, return URL
3. Wire WebhookController@stripe: verify signature, handle checkout.session.completed (set plan), subscription.updated, subscription.deleted, invoice.paid, invoice.payment_failed
4. Wire BillingController@cancelSubscription: cancel at period_end, set plan_status='canceled'
5. Complete BillingConfirmation mailable: HTML template with plan name, amount, date
6. Wire SendBillingConfirmationEmail: dispatch after checkout.session.completed
7. Wire SyncStripeSubscriptionQuantity: dispatch when workspace_members changes (in WorkspaceController@inviteMember and @removeMember)
8. Create plan enforcement middleware CanAccessPlan: check workspace.plan against feature limits. Limits: free={boards:3, members:10, ai_credits:100}, starter={boards:10, members:50, ai_credits:500}, etc.
9. Wire PayFast: BillingController@payfastCheckout returns form fields. WebhookController@payfast handles ITN notifications.

NEW TESTS:
- BillingTest.php: createCheckout, webhook events, cancelSubscription, email renders, plan enforcement (402 on 4th board for free plan), PayFast ITN handling

VERIFY:
- composer test — ALL existing + 6+ new = 85+ passing
```

---

---

## MCP SETUP PROMPT

**Load this prompt to install the Laravel MCP server and configure external MCP servers:**

```
Install and configure the MCP infrastructure for Aquerii at C:\Users\madoc\source\repos\Aquerii.

THE CONTEXT:
Aquerii is a multi-tenant SaaS Work OS with REST API + React SPA. We're adding MCP layer
so AI agents (Claude, Cursor, Copilot) can directly discover and interact with all modules.

YOUR TOOLS:
- Laravel MCP (laravel/mcp): Official Laravel package, exposes tools/resources/prompts
- Playwright MCP (npx @playwright/mcp): Live browser debugging for E2E (diagnose before fix)
- Stripe MCP (npx @stripe/mcp): Billing operations
- GitHub MCP (ghcr.io/github/github-mcp-server): CI/CD automation
- PostgreSQL MCP (npx @modelcontextprotocol/server-postgres): DB introspection

TASKS:

1. Install Laravel MCP:
   cd services/api && composer require laravel/mcp
   php artisan vendor:publish --tag=ai-routes
   
2. Create BoardServer (App\Mcp\Servers\BoardServer):
   - Tools: ListBoards, CreateBoard, UpdateBoard, DeleteBoard
   - Each tool extends Tool with #[Name], #[Description], inputSchema(), handle()
   - Register in routes/ai.php: Mcp::web('/mcp/aquerii/boards', BoardServer::class)->middleware('auth:sanctum')

3. Create CrmServer (App\Mcp\Servers\CrmServer):
   - Tools: SearchDeals, CreateDeal, UpdateDealStage, MergeContacts
   - Resources: PipelineResource, DealResource

4. Create MCP test in tests/Feature/McpTest.php:
   - Use Mcp::fake() to assert tool calls
   - Test: ListBoardsTool returns workspace boards
   - Test: CreateBoardTool validates and creates
   - Test: auth required for MCP endpoints

5. Add .mcp.json to project root with Playwright MCP:
   {
     "mcpServers": {
       "playwright": {
         "command": "npx",
         "args": ["@playwright/mcp@latest", "--headless"]
       }
     }
   }

6. Verify everything works:
   - php artisan mcp:start boards --transport=stdio (starts, lists tools)
   - cd services/api && composer test (all green + 4+ MCP tests)
   - MCP Inspector: php artisan mcp:inspect boards

REPORT:
- Which servers were created and their tool count
- Test results
- Any issues encountered
```

---

## RE-EVALUATION PROMPT (MCP-Aware)

**Load this prompt after every phase completes:**
```
You are performing the Re-Evaluation Gate for Aquerii.

Run these checks and report results:

1. PHPUnit: cd services/api && composer test
   - Count: ___ passing, ___ failing

2. E2E Chromium: cd services/web && npx playwright test --project=chromium --workers=1
   - Count: ___ passing, ___ failing

3. E2E Firefox: cd services/web && npx playwright test --project=firefox --workers=1
   - Count: ___ passing, ___ failing

4. Security: composer audit && npm audit
   - Advisories: ___

5. MCP health check:
   - php artisan mcp:start boards --transport=stdio (does it start?)
   - Playwright MCP: npx @playwright/mcp@latest --version (is it installed?)
   - For each MCP server: does it respond to tools/list?

6. Code quality check:
   - Any commented-out code blocks in changed files?
   - Any TODO/FIXME comments in new code?
   - Any unused imports?

7. Answer these questions:
   - Does every new endpoint/feature have a test? Y/N
   - Do all existing tests still pass? Y/N
   - Are there any P0/P1/P2 bugs? Y/N (list if yes)
   - Has the load test shown acceptable performance? Y/N
   - Has security scan found any issues? Y/N (list if yes)
   - Are MCP tools documented for the new feature? Y/N

REPORT FORMAT:
```
## Phase X — Re-Evaluation Report

### Test Results
- PHPUnit: 46/46 passing (0 failing)
- E2E Chromium: 12/12 passing (0 failing)
- E2E Firefox: 0/12 passing (12 failing)
- Security: 0 advisories
- MCP: 5/5 servers healthy

### Issues Found
1. Firefox sessionStorage — root cause unknown, needs investigation

### Decision: [APPROVED / NOT APPROVED]

### Reason: [concise reason]

### Next Action: [what to do next]
```
```
