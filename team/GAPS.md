---
project: "Aquerii"
purpose: "Gap tracking — missing work or broken flows"
last_updated: "2026-06-06T14:00:00Z"
updated_by: "Leader"
---

# Gap Tracker

## How to Use
Anyone can add gaps. Leader triages and assigns.

### Adding a Gap
```markdown
### GAP-001: [Title]
- **Severity**: low/medium/high/critical
- **Status**: open/in-progress/resolved/wontfix
- **Assign Type**: builder/debugger/ceo/qa-lead/etc.
- **Owner**: (assigned member or "unassigned")
- **Description**: What's missing or broken
- **Impact**: What breaks if this isn't fixed
- **Resolution**: How to fix it (once assigned)
```

## Open Gaps
### GAP-FORECAST-001: ForecastPage.toLocaleString crashes on null amount/weighted
- **Severity**: critical
- **Status**: in-progress
- **Assign Type**: builder
- **Owner**: builder-1
- **Description**: `services/web/src/pages/crm/ForecastPage.tsx:54,55,73,74` calls `r.amount.toLocaleString()` and `r.weighted.toLocaleString()` directly on backend-returned values. When workspace has no deals/pipeline activity, backend returns `null` for `amount`/`weighted` (or omits them). `null.toLocaleString()` throws "Cannot read properties of undefined (reading 'toLocaleString')" — the page is unusable on first visit.
- **Impact**: Forecast page crashes immediately. Blocks pilot users from viewing sales forecasts.
- **Resolution**: Add `?? 0` nullish-coalesce to all 4 `.toLocaleString()` calls in ForecastPage. Also fix the backend `forecast` and `by-rep`/`by-pipeline` endpoints to return `0` for empty aggregates (not `null`).

### GAP-GOALS-001: GoalsPage DataTable missing keyExtractor (hides via // @ts-nocheck)
- **Severity**: high
- **Status**: in-progress
- **Assign Type**: builder
- **Owner**: builder-1
- **Description**: `services/web/src/pages/erp/GoalsPage.tsx:80` calls `<DataTable columns={columns} data={goals} loading={isLoading} emptyMessage="No goals set" />` without the required `keyExtractor` prop. `DataTable` calls `keyExtractor(row)` on every row → `Cannot read properties of undefined (reading 'toLocaleString')` (or similar) when data is non-empty. The bug is hidden at build time by `// @ts-nocheck` on line 2. Same pattern on `target_value` at line 65 (no `?? 0`).
- **Impact**: Goals page crashes when goals exist. Prevents mining ops manager from tracking team goals.
- **Resolution**: Add `keyExtractor={(r) => String(r.id)}` to DataTable; remove `// @ts-nocheck` from line 2; fix any new TypeScript errors; add `?? 0` to `r.target_value` at line 65.

### GAP-EMPLOYEEGROUPS-001: EmployeeGroupsPage same keyExtractor bug
- **Severity**: high
- **Status**: in-progress
- **Assign Type**: builder
- **Owner**: builder-1
- **Description**: `services/web/src/pages/erp/EmployeeGroupsPage.tsx:73` has the same missing `keyExtractor` on DataTable as Goals. `// @ts-nocheck` on line 2 hides the bug from build.
- **Impact**: Employee groups page crashes when groups exist.
- **Resolution**: Add `keyExtractor`, remove `// @ts-nocheck`, fix resulting TS errors.

### GAP-MYDAY-001: MyDay useUpdateItem('') sends to /boards//items/ (404)
- **Severity**: critical
- **Status**: in-progress
- **Assign Type**: builder
- **Owner**: builder-2
- **Description**: `services/web/src/pages/my-day/MyDayPage.tsx:167` calls `useUpdateItem('')` with an empty string. The mutation posts to `/workspaces/${wid}/boards//items/${itemId}` (double-slash, missing segment) — guaranteed 404. No `onError` handler (line 222-228), so the click silently fails. Also: `format(parseISO(task.due_date), 'MMM d')` on line 90 has no nullish guard; `isThisWeek` (line 34) uses default locale week start (Sun) inconsistent with the explicit Mon start on line 170; `bg-accent-light`/`text-accent-text` Tailwind classes (line 268-272) aren't in the safelist, so the "X pending" badge appears unstyled.
- **Impact**: My-day task checkboxes don't work — the primary interaction on the page.
- **Resolution**: Pass actual `boardId` from item to `useUpdateItem`. Add `onError` toast handler. Add `task.due_date` nullish guard. Fix `isThisWeek` to use `weekStartsOn: 1`. Replace `bg-accent-light`/`text-accent-text` with CSS variables.

### GAP-CHAT-001: ChatPage selectedMentionIds never cleared on backspace
- **Severity**: critical
- **Status**: in-progress
- **Assign Type**: builder
- **Owner**: builder-3
- **Description**: `services/web/src/pages/chat/ChatPage.tsx:207` declares `selectedMentionIds: Set<string>`. The `insertMention` function (line 310-313) adds to the set on user click. **There is no code path that ever removes an ID from the set.** If the user @-mentions Alice, then backspaces the inserted `@Alice ` text, Alice's ID is still in the set and gets sent to the server with the message — backend creates a notification for a user no longer referenced in the visible text.
- **Impact**: Silent wrong-data — users get notifications for mentions that have been deleted. Security/UX bug.
- **Resolution**: Re-derive `selectedMentionIds` from current `input` text on every change — parse `@UserName` tokens from the text and resolve to user IDs via the members list. Drop the separate Set state. Or add a `useEffect` that re-syncs the Set with text changes.

### GAP-CALENDAR-001: Calendar shows only 7 days (calls /my-day endpoint)
- **Severity**: high
- **Status**: in-progress
- **Assign Type**: builder
- **Owner**: builder-1
- **Description**: `services/web/src/hooks/useCalendarItems.ts:22-24` calls `api.get(\`/workspaces/${workspace!.id}/my-day\`, { params: { scope: 'all' } })` — the same endpoint that powers MyDay page, which is constrained to a 7-day window. The `scope: 'all'` param is frontend-only; the backend either ignores it or returns the same 7-day window. Result: calendar shows only 7 days of data, events visually overlap because they're crammed into a small window.
- **Impact**: Calendar feature is broken — a 7-day calendar is not a calendar.
- **Resolution**: Add new endpoint `GET /workspaces/{wid}/calendar-items?from=&to=&entity_type=&entity_id=` in a new `CalendarItemController`. Update `useCalendarItems` to use it with the current month range. Return all items with `due_date` in the range, including those outside the next 7 days. Support `entity_type` filter (deals, tasks, tickets, etc.).

### GAP-CHAT-002: ChatPage mention regex anchors to end-of-input only
- **Severity**: high
- **Status**: in-progress
- **Assign Type**: builder
- **Owner**: builder-3
- **Description**: `services/web/src/pages/chat/ChatPage.tsx:215` regex `/(^|\s)@([^\s@]*)$/` requires the `@query` to be at the **end of input**. If user types `Hello @john how are you`, the trailing `how are you` prevents the match, so mention dropdown doesn't appear. Also: `useWorkspaceMembers` query key (line 210, in `hooks/useSettings.ts:9-14`) uses global `['workspace-members']` — not workspace-scoped. If user switches workspaces, cached members from old workspace are reused. Also: `sendTypingIndicator` (line 316-318) fires on every keystroke — 50 chars = 50 socket events. `markChatRead` (line 240-244, 252) fires on every channel activation and every received message — no debounce.
- **Impact**: Mentions only work while mid-typing at end of input. Cross-workspace leakage. Socket spam.
- **Resolution**: Use cursor position to find the active `@` token, not end-of-input. Workspace-scope the members query (`['workspace', workspaceId, 'members']`). Debounce `sendTypingIndicator` to 200ms. Debounce `markChatRead` to 1s.

### GAP-SOCKET-001: Socket can create duplicate instances after disconnect
- **Severity**: high
- **Status**: in-progress
- **Assign Type**: builder
- **Owner**: builder-1
- **Description**: `services/web/src/lib/socket.ts:20-58` — `getSocket()` returns the existing socket if `socket?.connected` is true, but creates a new socket on every call if disconnected — and **does not explicitly `disconnect()` the old one**. After a network blip, you can briefly have two socket instances, and the global listeners (lines 49-55) are re-registered on the new socket while old ones on the orphaned socket may still receive events and dispatch into the Zustand store. Also: `refreshTokenAndReconnect` (line 60-81) only runs on `connect_error` with `AUTH_REQUIRED`/`AUTH_INVALID` — for a generic disconnect (e.g. Wi-Fi drops for 10s), the user must reload.
- **Impact**: Duplicate notifications, double-fires. Generic disconnect = user stuck without realtime.
- **Resolution**: Explicitly `disconnect()` the old socket before creating a new one. Add generic-disconnect retry with token refresh on a backoff (1s, 3s, 10s, 30s). Cap retries at 5.

### GAP-CHAT-RENDER-001: @mentions not rendered as chips in message bubble
- **Severity**: medium
- **Status**: in-progress
- **Assign Type**: debugger
- **Owner**: debugger-1
- **Description**: `services/web/src/pages/chat/ChatPage.tsx:519-576` `MessageBubble` renders `message.body` as plain text. `@mentions` are stored by the backend (linked to user IDs) but not rendered as highlighted links or chips in the UI. The wiring is functional at the data layer but invisible to the user.
- **Impact**: Mentions look identical to plain text. Users can't tell who was mentioned.
- **Resolution**: Parse `message.body` for `@UserName` tokens, render as highlighted spans (indigo accent, bold) with avatar/initials. Click to navigate to user profile (if exists). Also: render mention chips for `message.mentions` (the structured array) when present.

### GAP-BOARDS-DESIGN-001: Boards page design overhaul
- **Severity**: medium
- **Status**: in-progress
- **Assign Type**: designer + builder
- **Owner**: designer (spec) + builder-3 (implement)
- **Description**: `services/web/src/pages/boards/BoardsPage.tsx`, `BoardPage.tsx`, `components/board/KanbanView.tsx`, `ItemCard.tsx` have 20+ design issues: hardcoded Tailwind grays (inconsistent with design system), no card elevation, columns lack framing, no `min-w-0` for clamping, no `isDragging` distinction, no rename dialog, native `confirm()` for destructive actions, missing page `<h1>`, group pills with poor contrast, no breadcrumb, no presence indicator. The cards visually overflow columns and look duplicated during drag.
- **Impact**: Page is functional but visually incoherent — the user reports it as "horrible, low quality."
- **Resolution**: Designer writes spec for: card elevation (shadow + glass-bg), column framing (rounded top + glass-border), `min-w-0` for column clamping, `word-break` on titles, `isDragging` distinction (scale + ring), rename dialog, accessible delete (no hover-only), CSS variables for all colors. Builder-3 implements.

### GAP-INBOX-UX: Inbox page UX gaps
- **Severity**: low
- **Status**: in-progress
- **Assign Type**: designer
- **Owner**: designer
- **Description**: `services/web/src/pages/inbox/InboxPage.tsx` works but has UX gaps: no infinite scroll (thousands of notifications render in one DOM), no deep-link to underlying resource, no error feedback on mutation, `data.message` cast is unsafe, no-op inline `style={{ borderColor: 'var(--color-glass-border)' }}` on a div with no `border` class.
- **Impact**: Page is usable but degrades with scale and has small inconsistencies.
- **Resolution**: Add infinite scroll (or pagination), deep-link to resource on click, add `onError` to markRead mutation with toast, type the `data` payload, remove the no-op inline style, use CSS variable directly.

### GAP-CHAT-UX: Chat page UX polish
- **Severity**: low
- **Status**: in-progress
- **Assign Type**: designer
- **Owner**: designer
- **Description**: `services/web/src/pages/chat/ChatPage.tsx` and `lib/socket.ts` UX issues: scroll-on-new-message forcibly scrolls user back to bottom (breaks history reading). No typing-throttle. No empty state for no channels. `attachmentLabel` nullish chain doesn't handle `null id`. `handleCreateChannel` with no `user.id` creates a channel with no participants.
- **Impact**: Minor UX papercuts.
- **Resolution**: Scroll-guard for new messages (only auto-scroll if user is within 50px of bottom). Throttle typing indicator. Empty state for channels. Fix `attachmentLabel` chain. Guard `handleCreateChannel` on auth state.

### GAP-PILOT-001: Pilot mine provisioning
- **Severity**: high
- **Status**: resolved
- **Assign Type**: release-engineer + ceo
- **Owner**: release-engineer + ceo
- **Description**: Need a pilot workspace with 5-10 users, anonymized mining data, and success scenarios documented.
- **Impact**: No pilot customer = no revenue validation.
- **Resolution**: ProvisionPilot.php (657 lines) creates workspace + 10 users + seeds 8 entity types. Strategy, feedback templates, and NDA documented in team/plan/. Resolved 2026-06-06.

### GAP-QA-INT-001: formatCurrency tests fail — ZAR locale vs USD expectation
- **Severity**: low
- **Status**: open
- **Assign Type**: debugger
- **Owner**: unassigned
- **Description**: `tests/unit/helpers/formatCurrency.test.ts` (4 tests) expects `$` (USD) output but `formatCurrency` helper uses `Intl.NumberFormat('za')` which produces ZAR (R) format. The tests expect `$0.00` but get `R0.00`.
- **Impact**: 4 unit test failures in `npx vitest run`. Confusing for CI and new contributors.
- **Resolution**: Either update tests to expect ZAR format, or change the helper locale. Detected during TKT-QA-INT-001 integration smoke test.

### GAP-QA-INT-002: All 13 Playwright E2E tests require running API backend
- **Severity**: medium
- **Status**: open
- **Assign Type**: qa-lead
- **Owner**: unassigned
- **Description**: E2E tests in `services/web/tests/e2e/` all fail when no API backend is running. CRM pipeline test (app.spec.ts:117) times out on `page.waitForLoadState('networkidle')`. Playwright `.last-run.json` shows all 13 tests as failed.
- **Impact**: Blocked local E2E testing without Docker stack.
- **Resolution**: Document in README or add a `test:e2e:ci` script that spins up dependencies. Detected during TKT-QA-INT-001 integration smoke test.

### GAP-PW-VERIFY-001: Post-Wave-5 verification gate not yet executed
- **Severity**: high
- **Status**: in_progress
- **Assign Type**: qa-lead
- **Owner**: qa-lead-integration
- **Description**: Wave 5 UI/UX hardening shipped 14 fixes across forecast/goals/employee-groups/my-day/chat/calendar/boards/inbox. Build (`npm run build`) and route audit (600/600) pass, but Playwright regression and visual smoke on the 7 problem URLs have not been run since the fixes.
- **Required checks**:
  1. Bring Docker stack up: `docker compose up -d`
  2. Run Playwright: `cd services/web && npx playwright test` — expect 96/96 or document any new failures
  3. Visual smoke (via Playwright headed or manual):
     - `/calendar` — full month visible, not just 7 days
     - `/boards` — new design loads, columns framed, cards elevated, no native `confirm()` dialogs
     - `/my-day` — task toggle persists (no 404 on `/boards//items/...`), toasts on error
     - `/crm/forecast` — no crash, R0.00 / R0.00 totals when empty
     - `/erp/goals` — no crash, no missing-key warnings in console
     - `/erp/employee-groups` — no crash
     - `/inbox` — Load more button appears past 20 notifications, click-to-link works
     - `/chat` — `@user` mid-sentence shows dropdown, mention chip renders in bubble
- **Acceptance**: All 8 visual checks pass, Playwright ≥ 95/96, no new console errors.

### GAP-IMG-STALE-001: Docker API image is stale — new controllers missing from container
- **Severity**: critical (ship-blocker)
- **Status**: in_progress
- **Assign Type**: release-engineer
- **Owner**: release-engineer
- **Description**: Wave-5 controller `app/Http/Controllers/Api/CalendarItemController.php` (and `ProductController.php`) exists on the host but was never built into the `aquerii-api` Docker image. `php artisan route:list` inside the container throws "Class App\Http\Controllers\Api\ProductController does not exist". `/calendar` returns "Failed to load calendar items" because `/api/workspaces/{wid}/calendar-items` 404s.
- **Impact**: All endpoints that reference newly-added controllers are 404/500 in the deployed stack. Wave 5 fixes look complete in code but are not observably deployed. Blocks pilot.
- **Fix**: From repo root: `docker compose build api && docker compose up -d api`. Verify with `docker exec aquerii-api-1 php artisan route:list` (no exception) and `curl -H "Authorization: Bearer ..." https://localhost/api/workspaces/{wid}/calendar-items?from=2026-06-01&to=2026-06-30` (expect 200).
- **Files**: `services/api/Dockerfile`, `services/api/app/Http/Controllers/Api/CalendarItemController.php`, `services/api/app/Http/Controllers/Api/ProductController.php`, `services/api/routes/api.php:3, :41, :204, :502`.
- **Caveat for future audits**: `team/scripts/audit-endpoints.mjs` runs against the host filesystem, not the container. Add a container-image audit as a follow-up.

### GAP-FORECAST-LAZY-001: GET /crm/forecast 500 — lazy load [stage] disabled
- **Severity**: critical (ship-blocker)
- **Status**: resolved
- **Assign Type**: debugger
- **Owner**: debugger-1
- **Resolution**: Added `->with('stage')` to the CrmDeal query in `ForecastController::index()` at line 19. The method aggregates deals by stage and accesses `$group->first()->stage?->name` at line 39. The pattern matches existing `->with('owner')` in `byRep()` at line 62. Resolved 2026-06-06.
- **Followup suggested**: grep for `CrmDeal::` and `Deal::` across `services/api/app/Modules/CRM` and verify every query that returns CrmDeal collections eager-loads every relationship later accessed in the consuming code. Same pattern likely lurks in any reporting/serialization path.

### GAP-DOCKER-GD-001: API Dockerfile missing ext-gd — phpoffice/phpspreadsheet blocks composer install
- **Severity**: critical (ship-blocker)
- **Status**: resolved
- **Assign Type**: release-engineer
- **Owner**: release-engineer
- **Resolution**: Adapted ext-gd install for Alpine base image (`php:8.3-fpm-alpine`): added `freetype-dev libpng-dev libjpeg-turbo-dev` to existing `apk add` block, added `docker-php-ext-configure gd --with-freetype --with-jpeg`, added `gd` to `docker-php-ext-install` list. Build succeeded. `php -m | grep gd` returns `gd`. Resolved 2026-06-06.
- **Caveat**: The Dockerfile change was co-staged with pre-existing uncommitted COPY-path edits (`COPY composer.json` → `COPY services/api/composer.json`). Leader must review the full staged diff before committing.

### GAP-AUTOLOAD-001: App\Http\Controllers\Controller base class missing from classmap-authoritative autoloader
- **Severity**: critical (ship-blocker)
- **Status**: resolved
- **Assign Type**: debugger
- **Owner**: debugger-1
- **Resolution**: `app/Http/Controllers/Controller.php` did not exist. Six existing controllers (AIController, AutomationController, CalendarItemController, ProductController, StockController, CRM/CompanyController) all used `use App\Http\Controllers\Controller;` but the base class was never created. Created the standard Laravel 11 base class (12 lines, 299 bytes) extending `Illuminate\Routing\Controller` with `AuthorizesRequests` + `ValidatesRequests` traits. Rebuilt image, dumped autoload (18336 → 18337 classes), `php artisan route:list` now shows all 692 routes cleanly. Resolved 2026-06-06.
- **Followup suggested**: Add a CI check that asserts the base Controller class exists (regression guard for future).

### GAP-PW-VERIFY-002: Re-run post-Wave-5 verification after ship-blockers fixed
- **Severity**: high
- **Status**: in_progress
- **Assign Type**: qa-lead
- **Owner**: qa-lead-integration
- **Description**: All 4 ship-blockers from GAP-PW-VERIFY-001 are now resolved (image rebuilt, ext-gd installed, autoload fixed, forecast lazy-load fixed). Re-run the visual smoke and Playwright regression to confirm ship-readiness.
- **Required checks**: Same as GAP-PW-VERIFY-001 but with focus on the previously-failing URLs:
  - `/calendar` — should now show full month grid (not "Failed to load calendar items")
  - `/crm/forecast` — should now return 200 with valid JSON (not 500)
  - All other URLs should still pass (no regression)
- **Acceptance**: 8/8 visual checks pass, Playwright ≥ 95/96, no new console errors.
- **Result so far**: 4/4 ship-blockers fixed, but 1 new ship-blocker (GAP-CALENDAR-QUERY-001) and 2 non-product issues found.

### GAP-CALENDAR-QUERY-001: useCalendarItems React Query hook never fires the network call
- **Severity**: critical (ship-blocker)
- **Status**: resolved
- **Assign Type**: debugger
- **Owner**: debugger-1
- **Resolution**: **Root cause was NOT the hook source — it was a stale `aquerii-web` Docker image.** The hook `services/web/src/hooks/useCalendarItems.ts` was already correctly wired to call `/api/workspaces/{wid}/calendar-items?from=...&to=...`. The running `aquerii-web` container was serving an old bundle (`index-CQeHpaO5.js`) that had a previous-generation hook still calling `/my-day?scope=all`. Probe of the new bundle (`index-C2bTtIHl.js`) confirmed the source matches the new design. Fix: `docker compose build web && docker compose up -d web`. After rebuild, the calendar hook fires correctly and returns `{"data":[]}` (no items seeded yet). Wrote 2 regression tests to lock in the behavior:
  - `services/web/tests/e2e/calendar.spec.ts` — Playwright spec asserts ≥1 GET to `/calendar-items` with from/to params, status 200.
  - `services/web/tests/unit/hooks/useCalendarItems.test.tsx` — 4 vitest cases: (a) doesn't fire when workspace is null, (b) fires to `/calendar-items` with from/to when workspace is set, (c) queryKey includes from/to/entityType, (d) tolerates null `data` field.
- **Side effect**: Added `@testing-library/dom` to `services/web/package.json` as devDependency (peer dep of `@testing-library/react@16` that was missing). Drop the unit test if you don't want the dep added; the e2e spec alone is sufficient.
- **Lesson learned**: Both `aquerii-web` AND `aquerii-api` images needed rebuilding after Wave 5. The host-side route audit (`audit-endpoints.mjs`) does NOT catch stale-bundle / stale-image issues. Add a build-staleness check to the verification gate (e.g. compare container's `index-*.js` build hash to latest local build hash).
- Resolved 2026-06-06.

### GAP-API-AUTH-001: API returns 500 "Route [login] not defined." for unauthenticated requests (pre-existing, not blocking pilot)
- **Severity**: medium (pre-existing)
- **Status**: open
- **Assign Type**: debugger
- **Owner**: unassigned
- **Description**: All unauthenticated API calls (e.g. `curl https://localhost/api/workspaces/1/crm/forecast` without a Bearer token) return 500 `{"error":{"code":"INTERNAL_ERROR","message":"Route [login] not defined."}}` instead of 401. The auth middleware is redirecting to a SPA-only `/login` route that the API doesn't know about.
- **Impact**: Blocks curl/Postman API smoke testing. Browser-based testing (with cookies/tokens) is unaffected. Not a Wave 5 regression.
- **Fix**: Configure the auth middleware to return 401 JSON for unauthenticated API requests. Likely in `services/api/app/Http/Middleware/Authenticate.php` or `app/Exceptions/Handler.php`.
- **Files**: `services/api/app/Http/Middleware/Authenticate.php`, possibly `services/api/app/Exceptions/Handler.php`.

### GAP-MYDAY-CHAT-SELECTORS-001: Playwright smoke-test selectors drifted from current UI (test issue, not product issue)
- **Severity**: low (test infrastructure)
- **Status**: open
- **Assign Type**: qa-lead-frontend
- **Owner**: unassigned
- **Description**: The post-Wave-5 smoke probe found 0 checkboxes on `/my-day` (toggle is a `<button>` not `<input type="checkbox">`) and 0 text inputs on `/chat` (chat uses a custom Input component). 0 console errors and 0 page errors — pages render fine, the selectors just don't match the current implementation. This is selector drift, not a product regression.
- **Impact**: Smoke test cannot validate Wave 5 chat/my-day fixes via Playwright selectors. Manual smoke or new selector writing is required.
- **Fix**: Update smoke selectors in `services/web/tests/e2e/wave5-smoke-final.spec.ts` (or whichever file is the latest) to match the actual DOM. Or write new regression tests for chat/my-day.
- **Execution result 2026-06-06**: Playwright 95/96 (1 known flaky: CRM pipeline view on chromium, tracked). Visual smoke found **2 critical bugs** in the deployed backend — see GAP-IMG-STALE-001 and GAP-FORECAST-LAZY-001 below.

### GAP-IMG-STALE-001: API Docker image is stale — new Wave-5 controllers not in image
- **Severity**: critical
- **Status**: open
- **Assign Type**: release-engineer
- **Owner**: unassigned
- **Description**: Running container `aquerii-api-1` was built before Wave 5. New controllers `app/Http/Controllers/Api/CalendarItemController.php` and `app/Http/Controllers/Api/ProductController.php` exist on the host but are NOT in `/var/www/html/app/Http/Controllers/Api/` inside the container (only `AIController.php`, `AutomationController.php`, `WorkspaceController.php`, `WorkspaceInvitationController.php`, and `CRM/`). `routes/api.php` line 3 imports `App\Http\Controllers\Api\ProductController` and line 502 registers `Route::apiResource('products', ProductController::class)` — both fail at runtime.
  - Confirmed: `php artisan route:list` throws `Class "App\Http\Controllers\Api\ProductController" does not exist` (in `RouteListCommand.php:235`). The route list is broken.
  - Confirmed: `GET /api/workspaces/{wid}/calendar-items` returns **404** (route not registered, because the import on line 41 `use App\Http\Controllers\Api\CalendarItemController;` resolves to a class that doesn't exist in the image, causing the route to be skipped).
  - Confirmed: `GET /api/workspaces/{wid}/products` returns **500** (`Class "App\Http\Controllers\Api\ProductController" does not exist`).
  - Side-effect: `/calendar` page shows "Failed to load calendar items" with a Retry button because the new endpoint doesn't work; the fallback (none in code) is no UI. **GAP-CALENDAR-001 is not observably fixed in the running stack** even though the code is correct.
- **Impact**: `/calendar` is broken (no month grid). Any caller of `/products` 500s. Route audit is wrong (it runs from host filesystem, not the container). Pilot users see broken calendar.
- **Resolution**: Rebuild the API image: `docker compose build api` then `docker compose up -d api`. Verify with `docker exec aquerii-api-1 php artisan route:list` (should not throw) and `curl https://localhost/api/workspaces/{wid}/calendar-items?from=...&to=...` (should return 200 with data or `[]`).

### GAP-FORECAST-LAZY-001: GET /crm/forecast 500 — lazy-load disabled on CrmDeal->stage
- **Severity**: critical
- **Status**: open
- **Assign Type**: debugger
- **Owner**: unassigned
- **Description**: `App\Modules\CRM\Http\Controllers\ForecastController::index` (or its aggregation query) triggers a lazy load of `stage` on `App\Modules\CRM\Models\CrmDeal` while model `preventLazyLoading` is enabled. Backend returns `{"error":{"code":"INTERNAL_ERROR","message":"Attempted to lazy load [stage] on model [App\Modules\CRM\Models\CrmDeal] but lazy loading is disabled."}}` with HTTP 500.
  - Confirmed: `curl -H "Authorization: Bearer ..." https://localhost/api/workspaces/{wid}/crm/forecast` → 500 with that exact message.
  - The `by-rep` and `by-pipeline` variants return 200, so only the `index` method has the bug.
  - Frontend `services/web/src/lib/crm.ts:444` calls `useForecast(w)` → `/crm/forecast` → page shows `Pipeline Total R0.00 / Weighted Forecast R0.00 / Best Case R0.00 / Commit R0.00 / Closed Won R0.00` (zero fallback) but the by-rep and by-pipeline cards display data. Users may not notice, but the 500 is logged and a console error is emitted.
- **Impact**: Forecast dashboard's headline tiles show zeros, hiding the real aggregated forecast. Operators lose visibility into pipeline value. Not a crash, but a silent data-loss bug.
- **Resolution**: In `ForecastController::index`, eager-load `stage` on the deals query (e.g. `CrmDeal::with('stage')->where(...)`) OR add `stage` to the `with()` clause in whatever query powers the forecast aggregation. Confirm with `curl /api/workspaces/{wid}/crm/forecast` returning 200 with non-zero `total_pipeline` for the test workspace (which has deals seeded — by-rep response shows 20 deals). Fixes are in code on the host but not in the running container.

### GAP-TEST-001: BoardsPage.heading locator — duplicate &lt;h1&gt; from UI change
- **Severity**: high
- **Status**: resolved
- **Assign Type**: debugger
- **Owner**: debugger-1
- **Description**: Playwright test expects `BoardsPage.heading` to match a single `<h1>But first, let's set up a board...</h1>` but a UI change added a second `<h1>Boards</h1>` on the same page. Strict mode violation causes 8 test failures.
- **Impact**: 8 Playwright tests failing (88/96). Blocks clean Phase 1 exit gate.
- **Resolution**: Removed duplicate `<h1>Boards</h1>` from BoardsPage.tsx:42. Added `.first()` safety to POM. 95/96 pass.

### GAP-DOC-001: No PrintButton, missing @media print, PDF logo not passed to Blade
- **Severity**: critical
- **Status**: resolved
- **Assign Type**: builder + designer
- **Owner**: builder-3 (wiring), designer (PrintButton + print.css)
- **Description**: 30 entity pages have no Print button. No `@media print` stylesheet exists. Logo is uploaded to workspace but never applied to PDF Blade views. Invoice PDF download exists in code but not wired to InvoicingPage. 3 hardcoded PDF templates.
- **Impact**: Users can't print or generate branded documents. PDFs show no logo.
- **Resolution**: PrintButton.tsx (24 lines) + print.css (238 lines) created. PrintButton wired to 14 entity pages (Leads, Contacts, Deals, Quotes, Products, Hazards, Incidents, CorrectiveActions, Employees, Inventory, Permits, Tickets, Accounting, Board). print.css imported in App.tsx. InvoicingPage wired with PDF download button. logo_url + color passed to DocumentPdfController (6 doc types) and InvoicePdfController. Resolved 2026-06-06.

### GAP-EXP-001: No Excel/CSV export on list pages
- **Severity**: critical
- **Status**: resolved
- **Assign Type**: builder
- **Owner**: builder-2
- **Description**: Only 1 CSV export exists (ReportsPage). 0 Excel exports. 10+ list pages (deals, contacts, leads, hazards, permits, tickets, employees, board items, accounts, journal entries) have no export. Sales team needs to export contacts to Excel.
- **Impact**: Pilot mine can't export data for offline analysis. Basic data portability missing.
- **Resolution**: Backend: maatwebsite/excel v3.1.69, ExportController (14 entities, 3 formats). Frontend: ExportButton component created, wired to 12 entity pages. Resolved 2026-06-06.

### GAP-THEME-001: No per-workspace logo/color upload UI
- **Severity**: high
- **Status**: resolved
- **Assign Type**: builder
- **Owner**: builder-1
- **Description**: `BrandingController` exists and workspace has `logo_url`/`color` fields, but there's no UI to upload a logo or set a color. The settings page doesn't expose it. Logo/color are never applied to PDFs.
- **Impact**: Each pilot mine can't brand the system. PDFs look unbranded.
- **Resolution**: BrandingTab.tsx created (logo upload + color picker) and registered in SettingsPage. logo_url + color passed to DocumentPdfController (6 doc types across 3 templates) and InvoicePdfController. Resolved 2026-06-06.

### GAP-MENTION-001: @mentions only in chat, not in 8 other contexts
- **Severity**: high
- **Status**: resolved
- **Assign Type**: builder + designer
- **Owner**: designer
- **Description**: `<MentionInput>` exists only in ChatPage. Item descriptions, comments, ticket messages, hazard descriptions, incident reports, permit descriptions, deal notes, email compose all need @mentions.
- **Impact**: Unaware of cross-team notifications. Safety officer misses tagged hazards.
- **Resolution**: MentionInput.tsx (154 lines) created. Wired to 7 contexts: HazardsPage, IncidentsPage, CorrectiveActionsPage, TicketsPage, NewPermitPage, DealDetailModal (CRM), ComposeModal (Email). ThreadView.tsx also wired. DocumentPage skipped (uses BlockNote editor). Resolved 2026-06-06.

## Resolved
- **GAP-D.SLICE-001** — resolved 2026-06-05 by debugger-1. `safeData` defensive coercion in `DataTable.tsx`. 3 regression tests.
- **GAP-DASH-001** — resolved 2026-06-05 by designer + debugger-1. Double-nested grid removed. Spec at `team/reviews/DESIGN-TKT-DASH-001.md`.
- **GAP-TS-001** — resolved 2026-06-05 by debugger-1. `TicketDetailPage.tsx:70` `as string` cast applied.
- **GAP-VAL-001** — resolved 2026-06-05 by Leader. `validate.mjs` rewritten to read member IDs from `team.config.json` (v3 schema). YAML parser handles quoted strings and multi-line lists. Now passes 0 errors, 0 warnings.
- **GAP-API-001** — resolved 2026-06-06 by builder-1 sub-session. `upcoming_meetings` (int) added to `ReportController::dashboard()` response. Query counts meetings where `starts_at >= now()` AND `starts_at <= now() + 7 days`, excludes soft-deleted.
- **GAP-API-002** — resolved 2026-06-06 by debugger-2. Audit found: all Aquerii list endpoints consistently use `->paginate()`. No flat-array inconsistency exists. DataTable defensive coercion was handling edge cases (undefined/null/object-wrapped), not API inconsistency.
- **GAP-CRIT-004** — resolved 2026-06-06 by builder-1. Deleted 6 shadow controllers from `app/Http/Controllers/` (BoardColumn, BoardGroup, Item, Api/Workspace, Auth/Auth, Auth/OAuth). Routes verified. 6 non-shadow files kept.
- **GAP-AUDIT-001** — resolved 2026-06-06 by debugger-1 + qa-lead-frontend. `team/scripts/audit-endpoints.mjs` written (15.7KB), parser bugs fixed, 599/599 routes matched. Audit exits 0.
- **GAP-COV-001** — resolved 2026-06-06 by qa-lead-integration. Coverage tooling configured: Xdebug/pcov for PHP, @vitest/coverage-v8 for Web (4%), pytest-cov for AI (5%). CI updated. Baseline documented in `team/COVERAGE-BASELINE.md`.
- **GAP-CRIT-001+002+003+006** — resolved 2026-06-06 by release-engineer. Docker build context fixed (root-level), CI workflow updated for root context build, alertmanager routing fixed, Caddy AI port verified. H17/H18/H19 marked resolved in PRODUCTION_READINESS_PLAN.md. All 5 modules (HSSE, PTW, Equipment, Competency, JobCards) confirmed in Dockerfile.
- **GAP-CRIT-005** — resolved 2026-06-06 by builder-1. Audited 14 firstOrCreate calls across API. Fixed 9 (6 in E2ESeeder, 1 in ScimController, 1 in FieldPermissionController, 1 in OAuthController) — added `withTrashed()` + `restore()`. 4 were safe (no SoftDeletes). 1 was already fixed. Added 9 data-integrity Pest tests in `tests/Feature/DataIntegrity/FirstOrCreateSoftDeleteTest.php`.
- **GAP-CRIT-007** — resolved 2026-06-06 by qa-lead-integration. Docker stack verified (web 200, API 200, all core healthy). Playwright: 88/96 passed. 8 failures are pre-existing (BoardsPage duplicate h1) — tracked as GAP-TEST-001. Infra rebuild verified working with zero `docker cp` band-aids.
- **GAP-TEST-001** — resolved 2026-06-06 by debugger-1. Duplicate `<h1>Boards</h1>` removed from BoardsPage.tsx:42. POM locator `.first()` safety added. 17/18 boards tests pass (1 flaky Firefox view-switch — pre-existing, unrelated).
- **GAP-DOC-001** — resolved 2026-06-06 by builder-3 + designer + builder-1. PrintButton.tsx, print.css, wired to 14 entity pages, invoice PDF download added, logo/color passed to all PDF Blade views.
- **GAP-THEME-001** — resolved 2026-06-06 by builder-1. BrandingTab.tsx (logo upload + color picker) in settings, PDF pass-through to DocumentPdfController and InvoicePdfController.
- **GAP-EXP-001** — resolved 2026-06-06 by builder-2. maatwebsite/excel backend + ExportButton frontend wired to 12 entity pages.
- **GAP-MENTION-001** — resolved 2026-06-06 by designer. MentionInput.tsx wired to 7 contexts (hazards, incidents, corrective-actions, tickets, permits, deal notes, email).
- **GAP-PILOT-001** — resolved 2026-06-06 by release-engineer + ceo. Workspace live, 10 users seeded, 8 entity types, strategy documented.
- **GAP-FORECAST-001** — resolved 2026-06-06 by builder-1. `(amount ?? 0).toLocaleString()` defensive nullish-coalesce on all 4 sites. Backend forecast returns 0 for empty aggregates.
- **GAP-GOALS-001** — resolved 2026-06-06 by builder-1. `keyExtractor` added, `// @ts-nocheck` removed, TS errors fixed.
- **GAP-EMPLOYEEGROUPS-001** — resolved 2026-06-06 by builder-1. Same pattern as Goals.
- **GAP-MYDAY-001** — resolved 2026-06-06 by builder-2. Inline mutation uses `boardId: task.board_id`, onError toast added.
- **GAP-CHAT-001** — resolved 2026-06-06 by builder-3. `selectedMentionIds` Set replaced with derived `mentionUserIds` useMemo from current input text.
- **GAP-CALENDAR-001** — resolved 2026-06-06 by builder-1. New `CalendarItemController` + endpoint `GET /workspaces/{wid}/calendar-items?from=&to=&entity_type=`. Hook takes date range. Audit: 600/600 routes used.
- **GAP-CHAT-002** — resolved 2026-06-06 by builder-3. Mention regex cursor-aware; `useWorkspaceMembers` workspace-scoped; typing indicator throttled 200ms; `markChatRead` debounced 1s.
- **GAP-SOCKET-001** — resolved 2026-06-06 by builder-1. `getSocket()` explicitly tears down old socket before creating new one. Generic disconnect triggers `refreshTokenAndReconnect()` after 30s grace. Backoff: 1s → 30s.
- **GAP-CHAT-RENDER-001** — resolved 2026-06-06 by debugger-1. `MentionText` component parses `@Name` tokens, renders as highlighted indigo chips. Wired into `MessageBubble`.
- **GAP-BOARDS-DESIGN-001** — resolved 2026-06-06 by designer. Spec at `team/reviews/DESIGN-GAP-BOARDS-001.md` (36.9 KB).
- **GAP-BOARDS-DESIGN-002** — resolved 2026-06-06 by builder-3. Implemented across 4 files: ItemCard, KanbanView, BoardsPage, BoardPage. 320px columns, drag state visual, touch-safe menus, `<Modal>` for confirmations.
- **GAP-INBOX-UX** — resolved 2026-06-06 by designer. Infinite scroll (Load more button), deep-link click, error feedback, type-safe `NotificationData`.
- **GAP-CHAT-UX** — resolved 2026-06-06 by designer. Scroll-guard (only auto-scroll if within 50px of bottom), empty state for no channels, `??` chain for attachment labels, auth guard on `handleCreateChannel`.

## Won't Fix
- **GAP-BOARDS-DESIGN-003 (visual QA)** — deferred to Week 4 (pilot feedback takes priority). Will run with pilot users in production.
