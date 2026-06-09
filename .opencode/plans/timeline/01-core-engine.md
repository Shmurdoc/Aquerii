# 01 — Group Alpha: Core Engine

> **Lead Developer**: Core Engine
> **Responsibility**: Auth, Workspace, Boards, Items, Comments, Files, Realtime, Notifications, Search
> **Rule**: If it's in `App/Core/`, you own it. If it touches user data flow, you own it.
> **Testing Gate**: Every feature requires ALL existing tests passing PLUS new tests for the feature.

---

## ROLE CONTRACT

**You are Group Alpha. You own the foundation that every other feature builds on.**

Your code is the most critical in the system. If Auth breaks, no one logs in. If Boards break, no work gets tracked. If Realtime breaks, collaboration dies. You carry the weight.

**Your deliverables:**
- Every endpoint in `routes/api.php` works end-to-end
- Every model in `App/Core/Models/` is correct with RLS, casts, relationships
- Every policy in `App/Core/Policies/` enforces tenant isolation
- Realtime events fire on every domain state change
- Search indexes update automatically
- Notifications are delivered reliably

**Your non-negotiables:**
1. All endpoints idempotent (per R3)
2. All tenant tables have RLS (per R2)
3. All mutations logged to activity_log
4. All domain events broadcast via realtime
5. All tests pass before you call a feature done

---

## TASK LIST (Execute in Order)

### Phase A1: Fix Current Bugs (Foundation Gate)

**Prompt for AI Agent:**
```
Fix bugs B1-B5 in the Aquerii codebase at C:\Users\madoc\source\repos\Aquerii.

MCP DEBUGGING TOOLING AVAILABLE:
- Playwright MCP: npx @playwright/mcp@latest (gives AI live browser control)
  Use it to diagnose failures: navigate to failing page, check browser_console_messages,
  browser_snapshot (accessibility tree), browser_network_requests.
  Debug loop: navigate → click → console + network + snapshot → reason → fix.

B1: Add data-testid="board-card" to the board card button in services/web/src/pages/boards/BoardsPage.tsx (around line 47-64). The card is rendered inside a map over boards — each card button needs the testid.

B2: Set workers: 1 in services/web/playwright.config.ts.

B3: Update the "can create a new board" test in services/web/tests/e2e/app.spec.ts (around line 73-76) — the app navigates to /boards/{boardId} after creation, so change the expectation to check for the detail page URL pattern.

B4: Change BASE_URL fallback in services/web/tests/e2e/app.spec.ts from 'http://localhost:3000' to 'https://localhost'.

B5: Investigate why Firefox login fails entirely. Use Playwright MCP to drive Firefox,
     check browser_console_messages for errors, inspect the page state after login
     attempt. The issue is likely sessionStorage persistence or cookie handling.

After fixing each bug:
1. Run PHP tests: cd services/api && composer test (expect 46 passing)
2. Run E2E tests: cd services/web && npx playwright test --project=chromium --workers=1

Report which bugs are fixed, which remain, and why. If B5 cannot be fixed, document the root cause with evidence from Playwright MCP.
```

**Acceptance Criteria:**
- [ ] B1 fixed: data-testid=board-card present on all board cards
- [ ] B2 fixed: workers:1 in playwright.config.ts
- [ ] B3 fixed: create board test expects navigation to detail page
- [ ] B4 fixed: BASE_URL fallback correct
- [ ] B5 investigated: root cause documented
- [ ] Chromium E2E: 12/12 passing
- [ ] PHP Unit: 46/46 passing

---

### Phase A2: Auth Hardening

**Prompt for AI Agent:**
```
Harden the Auth system in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- Login works, returns token + user + workspace
- Register creates user + default workspace
- Email verification route exists but is not enforced
- MFA routes exist but TOTP setup UI is incomplete
- OAuth routes exist for Google and GitHub

Tasks:
1. **Enforce email verification**: Add a middleware `EnsureEmailIsVerified` that checks email_verified_at. Apply to all authenticated routes. Users with unverified emails get 403 with code "EMAIL_NOT_VERIFIED". Add a resend verification endpoint POST /api/auth/verify-email/resend (throttled 3/min).

2. **Complete MFA flow**: The enable/verify routes exist. Ensure the TOTP secret stores correctly on the User model. Add a middleware that requires MFA if two_factor_secret is set. On login, if MFA is enabled but not verified this session, return 200 with { "mfa_required": true, "mfa_token": "..." }. POST /api/auth/mfa/verify consumes this token and returns the real auth token.

3. **Add token expiry**: Sanctum tokens currently never expire. Add token expiration: set `expires_at` to 30 days on login. Add a scheduled job `app:expire-tokens` that revokes expired tokens daily. Return expiry info in login response.

4. **Add refresh token rotation**: When POST /api/auth/refresh is called, revoke the old token and issue a new one. Return the new token + new expiry.

5. **Fix OAuth callback error handling**: Ensure OAuth callbacks handle error states (user denied, provider error) and redirect to /login?error=... instead of crashing.

Tests to write:
- Feature test: unverified email gets 403 on /api/me
- Feature test: MFA-enabled user must verify MFA before full access
- Feature test: expired token returns 401
- Feature test: refresh token rotates correctly (old token invalid after refresh)
- Feature test: OAuth callback handles provider error gracefully

After all changes:
- Run composer test — ALL 46+ existing + 5+ new = 51+ passing
- Run E2E tests — ALL 12 Chromium passing
```

**Acceptance Criteria:**
- [ ] Email verified middleware active on all auth gates
- [ ] MFA flow complete (enable, verify, require)
- [ ] Token expiry at 30 days with rotation
- [ ] 5+ new feature tests passing
- [ ] All existing tests still green
- [ ] All 12 E2E tests green

---

### Phase A3: Realtime Event Bus

**Prompt for AI Agent:**
```
Complete the realtime event system in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- Socket.IO server runs at realtime:3000
- Caddy proxies /socket.io/* to realtime:3000
- Laravel Echo is configured in the frontend
- But domain events are NOT broadcast — the frontend relies on polling

Tasks:
1. **Broadcast domain events** — In each Observer (BoardObserver, CommentObserver, ItemObserver), after the model is saved, broadcast via Laravel's Broadcasting system:
   - BoardObserver: board.created, board.updated, board.deleted
   - ItemObserver: item.created, item.updated, item.deleted, item.moved
   - CommentObserver: comment.created, comment.updated, comment.deleted
   - Channel: private-boards.{board_id} (for board/items/comments)

2. **Configure broadcasting** — In config/broadcasting.php, ensure the Socket.IO driver (or Pusher-compatible) points to realtime:3000 with correct app_id, key, secret from .env. The Caddyfile already proxies /socket.io/* to the realtime service.

3. **Add presence channels** — When a user views a board, join presence-online.{board_id}. Broadcast the list of online users to all channel members. The frontend already has usePresence.ts hook — wire it to Socket.IO presence events.

4. **Add authorization** — Register POST /broadcasting/auth in routes/api.php. The Laravel Broadcasting auth endpoint must validate the Sanctum token and check the user has access to the board. This is what Socket.IO calls to authorize private channel subscriptions.

5. **Verify end-to-end** — Create a PHP test that:
   - Creates a board
   - Asserts the event was broadcast (use Event::fake() and assert that ItemUpdated or BoardSaved was dispatched with correct broadcast channel)

Tests to write:
- Unit test: BoardObserver broadcasts board.created on create
- Unit test: ItemObserver broadcasts item.updated on update
- Unit test: CommentObserver broadcasts comment.created on create
- Feature test: POST /broadcasting/auth returns 200 with valid token and board access
- Feature test: POST /broadcasting/auth returns 403 without board access

After all changes:
- composer test — all existing + 5+ new = 51+ passing
- Verify manually: docker compose logs realtime shows "user joined room private-boards.{id}"
```

**Acceptance Criteria:**
- [ ] Domain events broadcast on all model changes (Board, Item, Comment)
- [ ] Broadcasting auth endpoint registered and working
- [ ] Presence channels show online users per board
- [ ] 5+ new tests for event broadcasting
- [ ] All existing tests green
- [ ] Verifiable via realtime logs

---

### Phase A4: Search Integration

**Prompt for AI Agent:**
```
Complete search integration in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- Meilisearch container running at meilisearch:7700
- laravel/scout installed in composer.json
- UpdateMeilisearchIndex job exists
- But search index is NOT populated and the search endpoint may not work

Tasks:
1. **Configure Scout** — In config/scout.php, set driver to 'meilisearch'. Configure Meilisearch host and key from .env. Ensure the Meilisearch PHP SDK is properly initialized.

2. **Make models searchable** — Add `Searchable` trait to Board, Item, Comment, Document models. Define `toSearchableArray()` on each to return only searchable fields (no JSON blobs, no sensitive data). Configure the searchable queue: after save, dispatch UpdateMeilisearchIndex.

3. **Add search endpoint** — Create GET /api/workspaces/{ws}/search?q={query} in routes/api.php. Use Scout's search() method. Return results grouped by type: boards, items, documents. Add rate limiting: 30/min per user.

4. **Create index settings** — Configure Meilisearch index settings: searchableAttributes, filterableAttributes (workspace_id for tenant isolation), sortableAttributes (updated_at). This ensures workspace isolation — users can only search within their workspace.

5. **Backfill existing data** — Create an artisan command `app:search:import` that imports all existing Boards, Items, Comments, Documents into Meilisearch.

Tests to write:
- Feature test: search endpoint returns 200 with results
- Feature test: search is workspace-isolated (no cross-tenant results)
- Feature test: search with empty query returns 400
- Artisan command test: `php artisan app:search:import` runs without error

After all changes:
- composer test — all existing + 4+ new = 55+ passing
- Run: docker exec aquerii-api-1 php artisan app:search:import
- Verify: curl http://localhost:7700/indexes/boards/search?q=test returns results
```

**Acceptance Criteria:**
- [ ] Scout configured with Meilisearch driver
- [ ] Board, Item, Comment, Document searchable
- [ ] Search endpoint works with tenant isolation
- [ ] 4+ new tests passing
- [ ] All existing tests green

---

### Phase A5: Notification System

**Prompt for AI Agent:**
```
Complete the notification delivery system in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- NotificationController exists with index, markRead, markAllRead routes
- SendNotification job exists but may not be wired
- Notifications are stored in the notifications table
- The frontend has NotificationPanel.tsx component and useNotifications.ts hook
- BUT notifications are never dispatched — the system is silent

Tasks:
1. **Wire SendNotification job** — In ItemObserver, CommentObserver, BoardObserver: when a mutation affects another user (assignee changes, comment added on your item, board invite), dispatch SendNotification. The job should:
   - Create a notification record in the database
   - Broadcast via realtime to the user's private channel

2. **Add notification types** — Create a NotificationType enum in App/Core/Enums/:
   - ITEM_ASSIGNED, COMMENT_ADDED, BOARD_INVITE, DUE_DATE_REMINDER, MENTION

3. **Add mention detection** — In CommentController@store, parse the comment body for @username patterns. If a user is mentioned, create a MENTION notification for them.

4. **Create due date reminders** — The SendDueReminders command already exists (Console/Commands/SendDueReminders.php). Ensure it queries items with due_date within the next 24 hours where the assignee hasn't been reminded (use reminder_sent_at from the migration). Dispatch SendNotification for each.

5. **Update the frontend** — In NotificationPanel.tsx, ensure the component subscribes to the user's notification channel via Socket.IO and updates the Zustand notificationStore in real-time. The bell icon in TopBar should show the unread count.

Tests to write:
- Feature test: assigning a user to an item creates a notification
- Feature test: adding a comment with @mention creates a MENTION notification
- Feature test: markRead returns 200 and notification is marked read
- Unit test: SendDueReminders command sends notifications for items due within 24h

After all changes:
- composer test — all existing + 4+ new = 59+ passing
- E2E test: login, navigate to a board, verify notification panel is accessible
```

**Acceptance Criteria:**
- [ ] Notifications dispatch on: item assigned, comment added, mention, due date
- [ ] NotificationPanel shows real-time updates via Socket.IO
- [ ] Bell icon shows unread count
- [ ] 4+ new tests passing
- [ ] All existing tests green

### Phase A6: Laravel MCP Server Setup

**Prompt for AI Agent:**
```
Install and configure the Laravel MCP server in Aquerii at C:\Users\madoc\source\repos\Aquerii.

The Laravel MCP package (laravel/mcp) exposes your application's functionality as standardized
MCP tools, resources, and prompts that AI agents (Claude, Cursor, Copilot) can discover and call.
It sits alongside the REST API — same auth, same middleware, same models.

Tasks:
1. **Install package** — Run: composer require laravel/mcp
   Publish config: php artisan vendor:publish --tag=ai-routes
   This creates routes/ai.php — the MCP route registration file.

2. **Create BoardServer** — php artisan make:mcp-server BoardServer
   Register tools: ListBoardsTool, CreateBoardTool, UpdateBoardTool, DeleteBoardTool
   Each tool is a class in App\Mcp\Tools with:
   - #[Name], #[Description] attributes describing what the tool does
   - inputSchema defining parameters (name, workspace_id, etc.)
   - handle() method that calls the existing Service/Controller

3. **Create CrmServer** — php artisan make:mcp-server CrmServer
   Register tools: SearchDealsTool, CreateDealTool, UpdateDealStageTool, MergeContactsTool
   Register resources: PipelineResource, DealResource

4. **Register servers** — In routes/ai.php:
   Mcp::web('/mcp/aquerii/boards', BoardServer::class)->middleware('auth:sanctum');
   Mcp::web('/mcp/aquerii/crm', CrmServer::class)->middleware('auth:sanctum');
   Mcp::local('admin', AdminServer::class); // stdio-only, no auth needed

5. **Write MCP tests** — Use Laravel MCP's Mcp::fake() to assert tool calls:
   - ListBoardsTool returns user's workspace boards
   - CreateBoardTool validates input and creates a board
   - CreateBoardTool respects idempotency
   - SearchDealsTool enforces RLS isolation

After all changes:
- composer test — all existing + 4+ new MCP tests = 63+ passing
- Verify: php artisan mcp:start boards --transport=stdio (should start, list tools)
- Verify: Claude Code or MCP Inspector can discover and call tools
```

**Acceptance Criteria:**
- [ ] BoardServer with List, Create, Update, Delete tools
- [ ] CrmServer with Search, Create, Update, Merge tools
- [ ] MCP routes registered in routes/ai.php with sanctum auth
- [ ] Mcp::fake() tests for tool calls
- [ ] 4+ new MCP feature tests passing
- [ ] All existing tests green

---

## GROUP ALPHA EXIT GATE

Before Group Alpha work is considered complete:

| Check | Criteria | Verified By |
|-------|----------|-------------|
| All bugs B1-B5 resolved | E2E 12/12 Chromium + Firefox | E2E test run |
| Auth hardened | Email verification, MFA, token expiry | Feature tests pass |
| Realtime broadcasting | All domain events fire on model changes | PHP tests + realtime logs |
| Search functional | Meilisearch indexes all models | Artisan command + query test |
| Notifications deliver | All 4 notification types dispatch | Feature tests pass |
| MCP servers installed | BoardServer + CrmServer with tools | MCP tests + Inspector |
| PHPUnit green | 63+ tests, 0 failures | composer test |
| No regression | Existing 46 tests still pass | composer test |
| No E2E regression | Existing 12 E2E tests still pass | npx playwright test |
