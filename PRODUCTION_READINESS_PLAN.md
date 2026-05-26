# Aquerii — Production Readiness Plan
**Date:** 2026-05-25  
**Audited by:** OpenCode full-stack scan  
**Scope:** `services/api` (Laravel), `services/web` (React/Vite), `services/realtime` (Node/TypeScript), `infra/` (Docker, K8s, Caddy, Prometheus)

---

## Executive Summary

The codebase is a well-structured, feature-rich SaaS platform with solid architectural bones. However, **it is not production-ready today**. The scan identified:

- **4 critical runtime crashes** (routed endpoints with no handler, broken Docker build)
- **3 live production bugs** (wrong WebSocket port in Caddy, health check always fails, React Query v4 syntax in v5 project)
- **12 high-severity issues** (missing features, silent failures, broken auth assumptions)
- **27 medium/low issues** (dead code, missing UIs, undocumented env vars, security posture gaps)

This plan organises every finding into actionable work items grouped by phase. Each item has an owner category, estimated effort, and acceptance criteria.

---

## Issue Index by Severity

### 🔴 CRITICAL — Will Crash or Block Deployment

| # | Layer | Issue | File(s) |
|---|---|---|---|
| C1 | Backend | `ItemController` missing `storeSubitem()`, `addAssignee()`, `removeAssignee()` — routes registered, handlers absent → `BadMethodCallException` | `ItemController.php` |
| C2 | Backend | `WorkspaceController` missing `store()` — `POST /api/workspaces` has no handler | `WorkspaceController.php` |
| C3 | Backend | `OAuthController` references `OauthAccount` (lowercase `a`); model class is `OAuthAccount` — fails on Linux/Docker with `Class not found` | `OAuthController.php` |
| C4 | Backend | `stripe`, `payfast`, `ai`, `realtime` keys entirely absent from `config/services.php` — all billing, webhooks, AI, and internal-secret features crash silently | `config/services.php` |
| C5 | Frontend | `@hookform/resolvers` missing from `package.json` — `OnboardingPage.tsx` crashes at import | `package.json`, `OnboardingPage.tsx` |
| C6 | Frontend | `BillingTab`, `TeamTab`, `SecurityTab` use TanStack Query **v4 API** in a **v5** project — runtime errors on every Settings page | `BillingTab.tsx`, `TeamTab.tsx`, `SecurityTab.tsx` |
| C7 | Infra | API production Dockerfile `COPY`s `supervisord.conf`, `nginx.conf`, `php-fpm.conf` — none of these files exist → Docker build fails for `api`, `horizon`, `super-admin` | `services/api/Dockerfile` |
| C8 | Infra | `services/super-admin/` directory does not exist — `docker-compose.yml` references it; compose up fails | `docker-compose.yml` |
| C9 | Infra | Realtime health check always returns `404` — HTTP server has no `/health` route → Docker marks container unhealthy → restart loop | `services/realtime/src/index.ts` |
| C10 | Infra | Caddyfile proxies WebSocket to `realtime:3000` but compose sets `PORT=3001` → all WebSocket connections fail in production | `infra/caddy/Caddyfile` |

---

### 🟠 HIGH — Missing Features / Silent Failures

| # | Layer | Issue | File(s) |
|---|---|---|---|
| H1 | Backend | `BoardColumnController::show()` missing — `apiResource` registers GET route, calling it errors | `BoardColumnController.php` |
| H2 | Backend | `BoardGroupController::show()` missing — same issue | `BoardGroupController.php` |
| H3 | Backend | `AutomationController::show()` missing — `apiResource` registers GET route | `AutomationController.php` |
| H4 | Backend | `CompanyController::show()` missing — `apiResource` registers GET route | `CompanyController.php` |
| H5 | Backend | `EvaluateAutomationTriggers` job is a stub — automations are never executed; always marked `completed` immediately with TODO at line 45 | `Jobs/EvaluateAutomationTriggers.php` |
| H6 | Backend | `SendBillingConfirmationEmail` job — `Mail::send()` is commented out, `App\Mail\BillingConfirmation` class does not exist | `Jobs/SendBillingConfirmationEmail.php` |
| H7 | Backend | `DealController::move()` and `DealController::score()` implemented but no routes registered — dead code | `DealController.php`, `routes/api.php` |
| H8 | Backend | `StageController::reorder()` implemented but no route registered — dead code | `StageController.php`, `routes/api.php` |
| H9 | Backend | `WorkspaceController@inviteMember` only works for users who already exist — no email invite flow for new users | `WorkspaceController.php` |
| H10 | Backend | No `.env.example` in `services/api/` — CI job `cp .env.example .env.testing` will fail | `services/api/` |
| H11 | Backend | `AIController` uses two inconsistent config key sets (`services.ai.base_url`+`internal_token` vs `services.ai.url`+`secret`) — one group always resolves to `null` | `AIController.php` |
| H12 | Frontend | `CommandPalette` search results have no `onClick` — clicking any dynamic result is a no-op | `CommandPalette.tsx` |
| H13 | Frontend | `RegisterPage` skips onboarding — navigates to `/boards` directly, bypassing workspace setup flow | `RegisterPage.tsx` |
| H14 | Frontend | No `.env.example` in `services/web/` — `VITE_API_URL` and `VITE_SOCKET_URL` are undocumented | `services/web/` |
| H15 | Infra | CORS in Laravel API is wide-open (`allowed_origins: ['*']`, `allowed_methods: ['*']`) — any origin can make credentialed API requests | `config/cors.php` |
| H16 | Infra | No rate limiting on authenticated API routes — AI endpoints are completely unbounded | `routes/api.php` |
| H17 | Infra | No CD pipeline — images pushed to GHCR but nothing deploys them | `.github/workflows/ci.yml` |
| H18 | Infra | Alertmanager not wired — `targets: []`; all fired alerts go nowhere | `infra/prometheus/prometheus.yml` |
| H19 | Infra | Caddyfile proxies AI service to port `8080` but compose sets AI `PORT=8002` | `infra/caddy/Caddyfile` |

---

### 🟡 MEDIUM — Design/Completeness Gaps

| # | Layer | Issue | File(s) |
|---|---|---|---|
| M1 | Backend | `useDocument()` in `useDocuments.ts` calls wrong URL `/documents/:docId` (missing `/workspaces/:wid/` prefix) | `hooks/useDocuments.ts` |
| M2 | Backend | `InternalSecret` middleware accepts either realtime OR AI secret for all internal routes — no per-route scoping | `Middleware/InternalSecret.php` |
| M3 | Backend | `DocumentFolder` model exists, no controller/route, never used | `Models/DocumentFolder.php` |
| M4 | Backend | `realtime_events.sequence` relies on a DB trigger — no migration creates this trigger; trigger is in external `02_triggers.sql` not tracked by Laravel | `infra/postgres/init/02_triggers.sql` |
| M5 | Backend | `CRMControllers.php` is an empty vestigial file | `Controllers/Api/CRM/CRMControllers.php` |
| M6 | Frontend | `NotificationsTab` saves preferences only to `localStorage` — no backend persistence; pure illusion | `NotificationsTab.tsx` |
| M7 | Frontend | `Sidebar.tsx` workspace switcher button has no `onClick` — visual affordance, no function | `Sidebar.tsx` |
| M8 | Frontend | No delete board UI — `useDeleteBoard` hook exists but is never surfaced | `BoardsPage.tsx`, `useBoards.ts` |
| M9 | Frontend | No delete item UI — `useDeleteItem` hook exists but is never surfaced | `useItems.ts` |
| M10 | Frontend | No "Add Group" UI for boards — groups are core to data model but have no creation affordance | `BoardPage.tsx` |
| M11 | Frontend | `CRMPage` deal cards are read-only — no edit/detail modal, no drag-and-drop between stages, no deal deletion | `CRMPage.tsx` |
| M12 | Frontend | `DocumentPage` title is display-only — not editable inline | `DocumentPage.tsx` |
| M13 | Frontend | `GET /me` never called — user profile is set only from login response, never refreshed; stale profile after updates | `authStore.ts` |
| M14 | Frontend | No user profile editing UI — `PUT /me` exists on backend but is never called (name, avatar) | — |
| M15 | Frontend | `usePresence` hook fully built but never called — no presence indicators shown in any view | `hooks/usePresence.ts` |
| M16 | Frontend | `boardStore`, `itemStore`, `documentStore` fully built but never imported anywhere — dead code | `stores/` |
| M17 | Frontend | `MutationQueue.ts` offline sync queue fully built but never connected | `lib/MutationQueue.ts` |
| M18 | Infra | Vault present but decorative — no service injects secrets from Vault; env vars passed directly in compose | `docker-compose.yml` |
| M19 | Infra | K8s Deployment + Service manifests missing — HPA and PDB reference workloads that have no Deployment YAMLs | `infra/k8s/` |
| M20 | Infra | `SimpleSpanProcessor` used in OTel — synchronous, blocks on export; should use `BatchSpanProcessor` | `services/realtime/src/instrumentation.ts` |
| M21 | Infra | `otel-collector.yml` exports traces to `jaeger:4317` — no Jaeger service in compose | `infra/otel/otel-collector.yml` |
| M22 | Infra | `room_members` Redis keys never expire — unbounded memory growth for abandoned rooms | `services/realtime/src/rooms/RoomManager.ts` |
| M23 | Infra | Presence heartbeat `PresenceManager.heartbeat()` never called — stale presence persists 1hr after silent disconnect | `services/realtime/src/presence/PresenceManager.ts` |
| M24 | Realtime | Dual `EventBroadcaster` implementations (`src/events/` vs `src/broadcaster/`) — dead code causes maintenance confusion | `services/realtime/src/broadcaster/EventBroadcaster.ts` |
| M25 | Realtime | `documentHandlers.ts` orphaned — `registerDocumentHandlers()` never called; hardcodes `http://api:8000` | `services/realtime/src/handlers/documentHandlers.ts` |
| M26 | Realtime | Dual auth implementations (`sanctum.ts` vs `middleware/auth.ts`) — JWT middleware never registered but confuses the codebase | `services/realtime/src/middleware/auth.ts` |
| M27 | Realtime | No Zod validation on incoming socket event payloads — malformed data causes silent failures | `services/realtime/src/` |

---

### 🟢 LOW — Polish / Best Practices

| # | Layer | Issue |
|---|---|---|
| L1 | Backend | No notification preferences API endpoint — `NotificationsTab` uses localStorage only |
| L2 | Backend | No workspace delete endpoint or danger-zone UI |
| L3 | Frontend | `idb` and `immer` are dead-weight dependencies (used only by dead-code stores) |
| L4 | Frontend | `@tanstack/react-query-devtools` should be a `devDependency` not a runtime `dependency` |
| L5 | Frontend | `useUpdateItem` hook exists but `ItemDetailModal` calls `api.patch` directly instead |
| L6 | Frontend | `useSocket` hook built but `AppLayout` never calls it; socket initializes lazily only |
| L7 | Frontend | Hardcoded toast colors in `App.tsx` should reference Tailwind config tokens |
| L8 | Frontend | `DocumentPage` user presence color hardcoded to `#6366f1` — should be per-user generated |
| L9 | Infra | Duplicate CI file at `services/.github/workflows/ci.yml` |
| L10 | Infra | No E2E test job in CI despite Playwright being installed |
| L11 | Infra | `docker-compose.yml` mixes dev tools (Mailpit, MinIO console, Vault) and production services — no `profiles:` separation |
| L12 | Infra | ClickHouse has empty password in `.env.example` |
| L13 | Infra | Realtime Dockerfile `EXPOSE 3000` is stale — runtime uses port `3001` |
| L14 | Infra | `trivy-action@master` should be pinned to a SHA for reproducibility |
| L15 | Infra | No staging → production promotion gate in CI |

---

## Work Plan by Phase

### Phase 0 — UNBLOCK (Must complete before QA can start anything)
**Estimated effort: 1–2 days**  
These are crashes and blockers that prevent the app from running at all.

---

#### P0-1 · Fix React Query v4→v5 syntax in Settings tabs
**Files:** `BillingTab.tsx`, `TeamTab.tsx`, `SecurityTab.tsx`  
**Action:** Convert all `useQuery([key], fn, opts)` → `useQuery({ queryKey, queryFn, ...opts })`, all `useMutation(fn, opts)` → `useMutation({ mutationFn, ...opts })`, rename `isLoading` → `isPending` on mutations, rename `qc.invalidateQueries([key])` → `qc.invalidateQueries({ queryKey: [key] })`.  
**Acceptance:** Settings page loads without console errors; Team/Billing/Security tabs display and submit correctly.

---

#### P0-2 · Add `@hookform/resolvers` to package.json
**Files:** `services/web/package.json`  
**Action:** `npm install @hookform/resolvers` in `services/web/`.  
**Acceptance:** `npm run build` succeeds; `/onboarding` page loads without module-not-found crash.

---

#### P0-3 · Fix `OAuthController` model reference
**Files:** `services/api/app/Http/Controllers/Auth/OAuthController.php`  
**Action:** Replace `OauthAccount` with `OAuthAccount` (match the model class name exactly).  
**Acceptance:** `php -l` passes; OAuth login works on Linux.

---

#### P0-4 · Add missing services to `config/services.php`
**Files:** `services/api/config/services.php`  
**Action:** Add `stripe`, `payfast`, `ai`, and `realtime` service blocks reading from env vars:
```php
'stripe'   => ['secret' => env('STRIPE_SECRET'), 'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'), 'prices' => ['growth' => env('STRIPE_PRICE_GROWTH'), 'business' => env('STRIPE_PRICE_BUSINESS')]],
'payfast'  => ['merchant_id' => env('PAYFAST_MERCHANT_ID'), 'merchant_key' => env('PAYFAST_MERCHANT_KEY'), 'passphrase' => env('PAYFAST_PASSPHRASE'), 'sandbox' => env('PAYFAST_SANDBOX', false)],
'ai'       => ['url' => env('AI_SERVICE_URL'), 'secret' => env('AI_SERVICE_SECRET')],
'realtime' => ['secret' => env('REALTIME_SECRET')],
```
**Acceptance:** `php artisan config:clear` succeeds; `config('services.stripe.secret')` returns the expected value.

---

#### P0-5 · Fix AIController config key inconsistency
**Files:** `services/api/app/Http/Controllers/Api/AIController.php`  
**Action:** Standardise to `config('services.ai.url')` and `config('services.ai.secret')` throughout the entire file. Remove all references to `base_url` and `internal_token`.  
**Acceptance:** All 7 AI endpoints read from one consistent config key set.

---

#### P0-6 · Add missing `ItemController` methods
**Files:** `services/api/app/Http/Controllers/Api/ItemController.php`  
**Action:** Implement `storeSubitem()`, `addAssignee()`, `removeAssignee()` methods. Use existing `ItemService` patterns:
- `storeSubitem`: create item with `parent_id` set to the parent item's ID
- `addAssignee`: insert into `item_assignees` junction table; broadcast event
- `removeAssignee`: delete from `item_assignees`; broadcast event  
**Acceptance:** `POST items/{item}/subitems`, `POST items/{item}/assignees`, `DELETE items/{item}/assignees/{userId}` return 200/201; frontend ItemDetailModal assignee selector and subitems work end-to-end.

---

#### P0-7 · Add `WorkspaceController::store()` method
**Files:** `services/api/app/Http/Controllers/Api/WorkspaceController.php`  
**Action:** Implement `store()` — validate `name`, create workspace record, add requesting user as `owner`, return workspace data. This is the `POST /api/workspaces` endpoint called by `OnboardingPage`.  
**Acceptance:** `POST /api/workspaces` returns 201 with workspace object; OnboardingPage can create a workspace after registration.

---

#### P0-8 · Fix realtime health check
**Files:** `services/realtime/src/index.ts`  
**Action:** Add health route to the HTTP server:
```typescript
const httpServer = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});
```
**Acceptance:** `curl http://localhost:3001/health` returns `{"status":"ok",...}` and HTTP 200; Docker healthcheck passes.

---

#### P0-9 · Fix Caddy port mismatches
**Files:** `infra/caddy/Caddyfile`  
**Action:**  
- Change `reverse_proxy realtime:3000` → `reverse_proxy realtime:3001`  
- Change `reverse_proxy ai:8080` → `reverse_proxy ai:8002`  
**Acceptance:** WebSocket connections from browser reach the realtime service; AI endpoints proxied correctly.

---

#### P0-10 · Create API Docker support files
**Files:** Create `services/api/infra/docker/api/supervisord.conf`, `nginx.conf`, `php-fpm.conf`  
**Action:** Write production-grade configs:
- `supervisord.conf`: manages `php-fpm` and `nginx` processes with restart policies
- `nginx.conf`: serves PHP-FPM on port 80, sets `client_max_body_size 50M`, gzip compression, security headers
- `php-fpm.conf`: pool `www`, `pm = dynamic`, `pm.max_children = 20`, `pm.start_servers = 5`  
**Acceptance:** `docker build --target production services/api/` completes without error.

---

#### P0-11 · Create `services/api/.env.example`
**Files:** Create `services/api/.env.example`  
**Action:** Copy all keys from root `.env.example` that are relevant to the API service plus add any undocumented keys found in the codebase scan. Include comments explaining every variable.  
**Acceptance:** CI job `cp .env.example .env.testing` in `services/api/` succeeds.

---

#### P0-12 · Create `services/web/.env.example`
**Files:** Create `services/web/.env.example`  
**Action:**
```
VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:3001
```
**Acceptance:** New developer can follow README and successfully run `npm run dev`.

---

### Phase 1 — CORE WIRING (Missing features that break user flows)
**Estimated effort: 3–4 days**

---

#### P1-1 · Add `show()` methods to 4 controllers
**Files:** `BoardColumnController.php`, `BoardGroupController.php`, `AutomationController.php`, `CompanyController.php`  
**Action:** Add `show()` to each controller returning a single resource by ID with workspace scoping check (abort 404 if not found or wrong workspace).  
**Acceptance:** `GET .../columns/{column}`, `GET .../groups/{group}`, `GET .../automations/{automation}`, `GET .../crm/companies/{company}` return 200 with resource data.

---

#### P1-2 · Implement `EvaluateAutomationTriggers` job
**Files:** `services/api/app/Jobs/EvaluateAutomationTriggers.php`  
**Action:** Replace the TODO stub with real action execution. Implement at minimum:
- `send_notification` action type: create notification record + dispatch `SendNotification` job
- `update_item_status` action type: update item status field via `ItemService`
- `send_email` action type: dispatch a generic email job with template
- Mark run as `failed` (not `completed`) if any action throws  
**Acceptance:** Creating an automation with trigger `item_created` and action `send_notification` actually delivers a notification when an item is created.

---

#### P1-3 · Create `App\Mail\BillingConfirmation` Mailable + wire job
**Files:** Create `services/api/app/Mail/BillingConfirmation.php`, fix `Jobs/SendBillingConfirmationEmail.php`  
**Action:** Create a Mailable using a Markdown template (`resources/views/emails/billing-confirmation.blade.php`) with workspace name, plan, amount. Uncomment the `Mail::to()->send()` call in the job.  
**Acceptance:** After a successful Stripe/PayFast webhook, a billing confirmation email is delivered to the workspace owner.

---

#### P1-4 · Fix `CommandPalette` search result navigation
**Files:** `services/web/src/components/layout/CommandPalette.tsx`  
**Action:** Add `onClick` handler to dynamic search results. Navigate to the appropriate route based on result type:
- board result → `navigate(/boards/${result.id})`
- document result → `navigate(/documents/${result.id})`
- item result → open `ItemDetailModal` for that item
- contact/deal result → `navigate(/crm)`  
**Acceptance:** Clicking any search result navigates to or opens the correct resource.

---

#### P1-5 · Fix `RegisterPage` onboarding flow
**Files:** `services/web/src/pages/auth/RegisterPage.tsx`  
**Action:** After successful registration, navigate to `/onboarding` instead of `/boards`. Ensure the backend's register endpoint does NOT automatically create a workspace (move that logic to the workspace `store()` endpoint created in P0-7).  
**Acceptance:** New user registration → onboarding → workspace creation → `/boards` is the complete, uninterrupted flow.

---

#### P1-6 · Add workspace invite-by-email flow
**Files:** `services/api/app/Http/Controllers/Api/WorkspaceController.php`, create `app/Mail/WorkspaceInvitation.php`, create `app/Models/WorkspaceInvitation.php`, add migration  
**Action:**
- Add `workspace_invitations` table: `id`, `workspace_id`, `email`, `role`, `token` (UUID), `accepted_at`, `expires_at`
- `inviteMember()`: if user not found by email, create invitation record + send `WorkspaceInvitation` email with accept link
- Add `POST /api/invitations/{token}/accept` public route
- Frontend `TeamTab`: show pending invitations list, allow revoke  
**Acceptance:** Inviting a non-registered email sends the invitation email; clicking the link in email creates the user (or prompts login) and joins the workspace.

---

#### P1-7 · Fix CORS configuration
**Files:** `services/api/config/cors.php`  
**Action:** Replace `'allowed_origins' => ['*']` with `'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')]`. Add `FRONTEND_URL` to `.env.example`.  
**Acceptance:** Cross-origin requests from the configured frontend URL work; requests from arbitrary origins are rejected.

---

#### P1-8 · Wire `DealController::move()` and `::score()` routes
**Files:** `services/api/routes/api.php`, `services/web/src/pages/crm/CRMPage.tsx`  
**Action:**
- Add routes: `POST /workspaces/{workspace}/crm/deals/{deal}/move` and `POST /workspaces/{workspace}/crm/deals/{deal}/score`
- Wire `CRMPage` deal cards with drag-and-drop between pipeline stages using `@hello-pangea/dnd` (already installed) calling the move endpoint on drop  
**Acceptance:** Dragging a deal card between CRM pipeline stages persists the stage change via the move API.

---

#### P1-9 · Wire `StageController::reorder()` route
**Files:** `services/api/routes/api.php`  
**Action:** Add `POST /workspaces/{workspace}/crm/pipelines/{pipeline}/stages/reorder` route to `StageController@reorder`.  
**Acceptance:** Reorder endpoint is reachable (HTTP 200) — no frontend UI required in this phase.

---

#### P1-10 · Add rate limiting to authenticated routes
**Files:** `services/api/routes/api.php`  
**Action:** Apply `throttle:60,1` to all workspace-scoped resource routes; apply `throttle:10,1` to AI endpoints specifically. Use Laravel's named rate limiters in `RouteServiceProvider` for clean named limits (`api`, `ai`).  
**Acceptance:** Exceeding rate limit returns HTTP 429 with `Retry-After` header; legitimate users under the limit are unaffected.

---

### Phase 2 — UI COMPLETENESS (Missing UI for existing backend features)
**Estimated effort: 3–4 days**

---

#### P2-1 · Add Delete Board UI
**Files:** `services/web/src/pages/boards/BoardsPage.tsx`  
**Action:** Add a context menu or kebab menu on each board card with "Delete" option. Wire to existing `useDeleteBoard()` hook. Add confirmation dialog.  
**Acceptance:** User can delete a board; board disappears from list; confirmed with DELETE request to backend.

---

#### P2-2 · Add Delete Item UI
**Files:** `services/web/src/components/board/ItemDetailModal.tsx` (or `KanbanView.tsx`)  
**Action:** Add "Delete" button in `ItemDetailModal` footer. Wire to `useDeleteItem()` hook. Add confirmation dialog.  
**Acceptance:** User can delete an item; item removed from board view.

---

#### P2-3 · Add Group Management UI
**Files:** `services/web/src/pages/boards/BoardPage.tsx`  
**Action:** Add "Add Group" button below last group. Add inline group rename on click. Add group context menu with "Delete Group" option. Wire all three to existing group API endpoints.  
**Acceptance:** User can create, rename, and delete board groups.

---

#### P2-4 · Add CRM Deal Detail Modal
**Files:** `services/web/src/pages/crm/CRMPage.tsx`, create `services/web/src/components/crm/DealDetailModal.tsx`  
**Action:** Clicking a deal card opens a modal with: deal title (editable), value (editable), stage selector, assigned contact, notes/description. Footer: Save button (`PATCH /crm/deals/{deal}`), Delete button (`DELETE /crm/deals/{deal}`).  
**Acceptance:** Deal details persist after editing; deleting a deal removes it from the board.

---

#### P2-5 · Add CRM Contacts & Companies tabs
**Files:** `services/web/src/pages/crm/CRMPage.tsx`  
**Action:** Add tab navigation: Pipelines | Contacts | Companies. Contacts tab: table view with name, email, company, phone, `PATCH`/`DELETE` row actions, inline "Add Contact" form. Companies tab: same pattern.  
**Acceptance:** Contacts and companies CRUD is accessible from CRM page.

---

#### P2-6 · Add Document Title Editing
**Files:** `services/web/src/pages/documents/DocumentPage.tsx`  
**Action:** Make document title an `<input>` with `onBlur` save (`PATCH /workspaces/{wid}/documents/{docId}` with `{title}`). Show visual indicator while saving.  
**Acceptance:** Editing the document title and blurring persists the new title.

---

#### P2-7 · Add User Profile Editing
**Files:** `services/web/src/pages/settings/SettingsPage.tsx` or create `ProfileTab.tsx`  
**Action:** Add "Profile" tab to Settings page with: display name field, avatar upload (calls `PUT /me` with `multipart/form-data`), email display (read-only). Refresh `authStore` after save via `GET /me`.  
**Acceptance:** User can change their display name and avatar; changes reflected in Sidebar immediately.

---

#### P2-8 · Fix Sidebar workspace switcher
**Files:** `services/web/src/components/layout/Sidebar.tsx`  
**Action:** Add workspace switcher functionality. Clicking the workspace area should either: (a) open a dropdown of other workspaces the user belongs to + "Create workspace" option, or (b) navigate to a workspace selector page. Call `GET /api/me` (which should return `workspaces[]`) to populate the list.  
**Acceptance:** Clicking the workspace area in Sidebar shows workspace options; selecting one switches the active workspace.

---

#### P2-9 · Add notification preferences backend
**Files:** Create migration `add_notification_preferences_to_users.php`, update `UserController.php`  
**Action:** Add `notification_preferences` JSON column to `users` table. Add `GET /me/notification-preferences` and `PUT /me/notification-preferences` endpoints. Update `NotificationsTab.tsx` to call these endpoints instead of `localStorage`.  
**Acceptance:** Notification preferences persist across devices and browser sessions.

---

#### P2-10 · Wire presence indicators
**Files:** `services/web/src/hooks/usePresence.ts`, `services/web/src/pages/boards/BoardPage.tsx`, `services/web/src/pages/documents/DocumentPage.tsx`  
**Action:** `usePresence` hook is already fully built. Call it in `BoardPage` and `DocumentPage` to show avatar stack of currently online users in the page header.  
**Acceptance:** When two users open the same board/document, each sees the other's avatar in the presence bar.

---

### Phase 3 — INFRASTRUCTURE & SECURITY
**Estimated effort: 2–3 days**

---

#### P3-1 · Create K8s Deployment and Service manifests
**Files:** Create `infra/k8s/deployment.yaml`, `infra/k8s/service.yaml`  
**Action:** Write Deployment manifests for `api`, `web`, `realtime` with resource limits, liveness/readiness probes, and env from Secrets. Write Service manifests (ClusterIP) for each. HPA and PDB already exist and will work once Deployments are present.  
**Acceptance:** `kubectl apply -f infra/k8s/` succeeds without errors; pods start and pass health checks.

---

#### P3-2 · Fix `super-admin` service
**Files:** Create `services/super-admin/` with `Dockerfile` and app entry point, or remove from `docker-compose.yml` if not needed yet  
**Action:** If Filament super-admin panel is planned: create a minimal `services/super-admin/` pointing to the same Laravel codebase with a dedicated `Dockerfile` and different entry point. If not needed for this release: remove from `docker-compose.yml` and `Caddyfile`.  
**Acceptance:** `docker compose build` completes without error.

---

#### P3-3 · Fix `SUPER_ADMIN_APP_KEY` placeholder
**Files:** `docker-compose.yml`  
**Action:** Remove the hardcoded `SUPER_ADMIN_APP_KEY: base64:CHANGEME` default. Require it to be set in `.env`. Add to `.env.example` with a note to generate with `php artisan key:generate`.  
**Acceptance:** `docker compose config` shows no hardcoded `CHANGEME` values.

---

#### P3-4 · Wire Alertmanager
**Files:** Create `infra/prometheus/alertmanager.yml`, update `infra/prometheus/prometheus.yml`, add `alertmanager` service to `docker-compose.yml`  
**Action:** Add Alertmanager container with a basic routing config: critical alerts → email (or Slack webhook from `.env`). Wire Prometheus `alerting.alertmanagers` to point at the container.  
**Acceptance:** A test alert (e.g., `AlertmanagerTest` rule) fires in Prometheus and an email/Slack notification is delivered.

---

#### P3-5 · Add Prometheus exporters for Postgres, Redis, Node
**Files:** `docker-compose.yml`, `infra/prometheus/prometheus.yml`  
**Action:** Add `postgres-exporter` (bitnami/postgres-exporter), `redis-exporter` (oliver006/redis_exporter), `node-exporter` (prom/node-exporter) services to compose. These are already referenced in `prometheus.yml` scrape targets.  
**Acceptance:** Prometheus scrape targets for `postgres:9187`, `redis:9121`, `node-exporter:9100` show `UP`.

---

#### P3-6 · Replace `SimpleSpanProcessor` with `BatchSpanProcessor`
**Files:** `services/realtime/src/instrumentation.ts`  
**Action:** Replace `new SimpleSpanProcessor(traceExporter)` with `new BatchSpanProcessor(traceExporter, { maxExportBatchSize: 512, scheduledDelayMillis: 5000 })`.  
**Acceptance:** Realtime service latency does not increase measurably under load; traces still appear in collector.

---

#### P3-7 · Fix Jaeger / OTel trace export
**Files:** `infra/otel/otel-collector.yml`, `docker-compose.yml`  
**Action:** Either: (a) add a Jaeger container to `docker-compose.yml` and `infra/k8s/`, or (b) change the OTel exporter to use Grafana Tempo (already present in compose as `loki` — verify if Tempo is included). Remove `debug` exporter or set `verbosity: none` in production config.  
**Acceptance:** Traces from API and realtime services appear in Jaeger/Tempo UI.

---

#### P3-8 · Add TTL to `room_members` Redis keys
**Files:** `services/realtime/src/rooms/RoomManager.ts`  
**Action:** After `redis.sadd('room_members:{room}', userId)`, add `redis.expire('room_members:{room}', 86400)` (24hr TTL, reset on each join).  
**Acceptance:** `redis-cli --scan --pattern 'room_members:*'` shows keys with TTL set.

---

#### P3-9 · Wire presence heartbeat
**Files:** `services/realtime/src/presence/PresenceManager.ts`, `services/realtime/src/index.ts`  
**Action:** Call `presenceManager.heartbeat(userId, workspaceId)` on the socket `ping` event or on a 30-second interval timer per connection. This resets the Redis TTL, preventing stale presence.  
**Acceptance:** User presence entry expires within 10 minutes of network disconnection.

---

#### P3-10 · Delete dead code in realtime service
**Files:** `services/realtime/src/broadcaster/EventBroadcaster.ts`, `services/realtime/src/handlers/documentHandlers.ts`, `services/realtime/src/middleware/auth.ts`, `services/realtime/src/auth/jwt.ts`  
**Action:** Delete all four files. Verify no active imports reference them (none found in scan). Remove `JWT_SECRET` env var from docker-compose.yml if exclusively used by the dead JWT middleware.  
**Acceptance:** `npx tsc --noEmit` in `services/realtime/` passes with no "cannot find module" errors.

---

#### P3-11 · Add Zod validation to socket events
**Files:** `services/realtime/src/index.ts` (and relevant handler files)  
**Action:** Define Zod schemas for all socket event payloads: `room:join`, `room:leave`, `doc:update`, `doc:sync`, `cursor:update`, `typing:start`, `typing:stop`. Validate each payload on receipt; emit `error` event back to sender if invalid.  
**Acceptance:** Sending a malformed socket event (e.g., `room:join` with `roomId: 123` instead of a string) returns a structured error event rather than a server crash.

---

#### P3-12 · Add `docker-compose.override.yml` for dev
**Files:** Create `docker-compose.override.yml`  
**Action:** Move dev-only services (Mailpit, MinIO console port, Vault dev mode, debug flags) into override file. Primary `docker-compose.yml` should be production-safe.  
**Acceptance:** `docker compose up` (without override) starts production services only; `docker compose up` (with override present) adds dev tools.

---

#### P3-13 · Wire CORS origins for realtime service
**Files:** `services/realtime/src/index.ts`, `docker-compose.yml`, `.env.example`  
**Action:** Change hardcoded `origin: 'http://localhost:5173'` to `origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:5173']`. Add `CORS_ORIGINS=https://app.aquerii.app` to production `.env.example` for realtime.  
**Acceptance:** WebSocket connections from the production frontend domain are accepted; connections from arbitrary origins are rejected.

---

### Phase 4 — CLEAN-UP & POLISH
**Estimated effort: 1 day**

---

#### P4-1 · Remove dead-code stores and dead packages
**Files:** `services/web/src/stores/boardStore.ts`, `itemStore.ts`, `documentStore.ts`, `lib/MutationQueue.ts`; `package.json`  
**Action:** Delete the four dead files. Remove `idb` and `immer` from `package.json` `dependencies`. Move `@tanstack/react-query-devtools` to `devDependencies`.  
**Acceptance:** `npm run build` succeeds; bundle size decreases.

---

#### P4-2 · Remove `CRMControllers.php` empty file
**Files:** `services/api/app/Http/Controllers/Api/CRM/CRMControllers.php`  
**Action:** Delete the file.  
**Acceptance:** File is gone; `php artisan route:list` still works.

---

#### P4-3 · Fix `useDocuments.ts` wrong URL
**Files:** `services/web/src/hooks/useDocuments.ts`  
**Action:** Fix `useDocument(docId)` hook URL from `/documents/${docId}` to `/workspaces/${workspaceId}/documents/${docId}`. Accept `workspaceId` as parameter.  
**Acceptance:** If `useDocument` hook is ever called, it hits the correct URL.

---

#### P4-4 · Pin `trivy-action` to a specific version
**Files:** `.github/workflows/ci.yml`  
**Action:** Change `aquasecurity/trivy-action@master` to `aquasecurity/trivy-action@0.24.0` (or latest stable tag).  
**Acceptance:** CI security scan is reproducible and not subject to breaking changes from `@master`.

---

#### P4-5 · Remove duplicate CI file
**Files:** `services/.github/workflows/ci.yml`  
**Action:** Delete the duplicate file; keep only the root `.github/workflows/ci.yml`.  
**Acceptance:** Only one CI pipeline triggers on push.

---

#### P4-6 · Add `useUpdateItem` hook usage in `ItemDetailModal`
**Files:** `services/web/src/components/board/ItemDetailModal.tsx`  
**Action:** Replace the direct `api.patch(...)` call with `useUpdateItem()` hook for consistency and automatic cache invalidation.  
**Acceptance:** Editing an item in the modal updates the board view without a page refresh.

---

#### P4-7 · Add `DocumentFolder` controller and route (or remove the model)
**Files:** `services/api/app/Models/DocumentFolder.php`, `routes/api.php`  
**Action:** Either add folder CRUD routes (`GET/POST/PATCH/DELETE /workspaces/{wid}/documents/folders`) and wire a folder selector in `DocumentsPage`, or remove the `DocumentFolder` model if folders are out of scope for v1.  
**Acceptance:** Model is either used or deleted — no orphaned models.

---

#### P4-8 · Add user profile refresh on app load
**Files:** `services/web/src/layouts/AppLayout.tsx` or `authStore.ts`  
**Action:** On `AppLayout` mount, call `GET /me` and update `authStore` with fresh user data (name, avatar, mfa_enabled). This ensures stale profile data from login is refreshed.  
**Acceptance:** If a user changes their name on another device, refreshing the app shows the updated name.

---

## Floating API Endpoints Matrix

This table cross-references every backend route against frontend usage. Routes marked ❌ are reachable on the backend but have no frontend implementation.

| Backend Route | Frontend Caller | Status |
|---|---|---|
| `GET /me` | `AppLayout` (after P4-8) | ❌ Not called yet |
| `PUT /me` | `ProfileTab` (after P2-7) | ❌ Not called yet |
| `GET /workspaces/{w}` | — | ❌ Never called |
| `PATCH /workspaces/{w}` | — | ❌ Never called |
| `GET /workspaces/{w}/boards/{b}/columns` | — | ❌ Never called |
| `POST /workspaces/{w}/boards/{b}/columns` | — | ❌ Never called |
| `PATCH /workspaces/{w}/boards/{b}/columns/{c}` | — | ❌ Never called |
| `DELETE /workspaces/{w}/boards/{b}/columns/{c}` | — | ❌ Never called |
| `GET /workspaces/{w}/boards/{b}/groups` | — | ❌ Never called |
| `POST /workspaces/{w}/boards/{b}/groups` | After P2-3 | ❌ Not called yet |
| `PATCH /workspaces/{w}/boards/{b}/groups/{g}` | After P2-3 | ❌ Not called yet |
| `DELETE /workspaces/{w}/boards/{b}/groups/{g}` | After P2-3 | ❌ Not called yet |
| `GET /workspaces/{w}/boards/{b}/items/{i}` | — | ❌ Never called (always list-fetched) |
| `POST /workspaces/{w}/boards/{b}/items/{i}/duplicate` | — | ❌ Never called |
| `GET /workspaces/{w}/boards/{b}/items/{i}/activity` | — | ❌ Never called |
| `GET /workspaces/{w}/crm/contacts` | After P2-5 | ❌ Not called yet |
| `POST /workspaces/{w}/crm/contacts` | After P2-5 | ❌ Not called yet |
| `PATCH /workspaces/{w}/crm/contacts/{c}` | After P2-5 | ❌ Not called yet |
| `DELETE /workspaces/{w}/crm/contacts/{c}` | After P2-5 | ❌ Not called yet |
| `GET /workspaces/{w}/crm/companies` | After P2-5 | ❌ Not called yet |
| `POST /workspaces/{w}/crm/companies` | After P2-5 | ❌ Not called yet |
| `PATCH /workspaces/{w}/crm/companies/{c}` | After P2-5 | ❌ Not called yet |
| `DELETE /workspaces/{w}/crm/companies/{c}` | After P2-5 | ❌ Not called yet |
| `PATCH /workspaces/{w}/crm/deals/{d}` | After P2-4 | ❌ Not called yet |
| `DELETE /workspaces/{w}/crm/deals/{d}` | After P2-4 | ❌ Not called yet |
| `POST /workspaces/{w}/crm/deals/{d}/move` | After P1-8 | ❌ Not called yet |
| `POST /workspaces/{w}/crm/deals/{d}/score` | After P1-8 | ❌ Route missing |
| `POST /workspaces/{w}/ai/summarize` | — | ❌ Never called |
| `POST /workspaces/{w}/ai/score-deal` | — | ❌ Never called |
| `GET /workspaces/{w}/ai/credits` | — | ❌ Never called |
| `POST /workspaces/{w}/ai/task/generate-description` | — | ❌ Never called |
| `POST /workspaces/{w}/ai/document/generate` | — | ❌ Never called |
| `POST /workspaces/{w}/ai/automation/generate` | — | ❌ Never called |
| `GET /workspaces/{w}/automations/{a}/runs` | — | ❌ Never called |
| `DELETE /workspaces/{w}/billing/subscription` | `BillingTab.tsx` | ✅ Called |
| `GET /workspaces/{w}/notifications` | `useNotifications.ts` | ✅ Called |

---

## QA Entry Criteria Checklist

Before handing to the lead QA, all Phase 0 and Phase 1 items must be complete. Use this checklist:

### Phase 0 (Must ALL be ✅)
- [ ] C1 — `ItemController` missing methods added
- [ ] C2 — `WorkspaceController::store()` implemented
- [ ] C3 — `OAuthController` model casing fixed
- [ ] C4 — `config/services.php` has stripe/payfast/ai/realtime blocks
- [ ] C5 — `@hookform/resolvers` in package.json
- [ ] C6 — React Query v5 syntax in all Settings tabs
- [ ] C7 — API Dockerfile support files exist and build succeeds
- [ ] C8 — `super-admin` service exists or removed from compose
- [ ] C9 — Realtime `/health` endpoint returns 200
- [ ] C10 — Caddy port references corrected
- [ ] C11 (P0-11) — `services/api/.env.example` created
- [ ] C12 (P0-12) — `services/web/.env.example` created

### Phase 1 (Must ALL be ✅)
- [ ] H1–H4 — `show()` on 4 controllers
- [ ] H5 — Automation job executes actions
- [ ] H6 — Billing confirmation email sends
- [ ] H7–H9 — Dead routes wired or removed
- [ ] H10 — Rate limiting applied
- [ ] H12 — Command palette search results navigate
- [ ] H13 — Register flow → onboarding (not straight to `/boards`)
- [ ] H15 — CORS locked down
- [ ] H16 — AI rate limiting added
- [ ] H19 — Caddy AI port fixed

### Smoke Tests for QA Handoff
1. `docker compose up` → all services start, all healthchecks pass
2. Register a new user → redirected to onboarding → create workspace → land on boards
3. Create a board → create a group → create an item → assign a member → add a comment
4. Open a document → edit content → open same document in a second browser → see real-time collaboration
5. CRM: create a pipeline → create a deal → drag deal between stages
6. Settings → Team: invite a member (existing user) → member appears in list
7. Settings → Billing: view plan info without errors
8. Settings → Security: change password → verify MFA enable flow
9. Notifications: receive a notification → mark as read
10. Search: type in command palette → click a result → navigate to correct page

---

## Effort Summary

| Phase | Items | Estimated Days | Priority |
|---|---|---|---|
| Phase 0 — Unblock | 12 | 1–2 | Ship blocker |
| Phase 1 — Core Wiring | 10 | 3–4 | QA blocker |
| Phase 2 — UI Completeness | 10 | 3–4 | QA required |
| Phase 3 — Infrastructure & Security | 13 | 2–3 | Production required |
| Phase 4 — Clean-up | 8 | 1 | Good hygiene |
| **Total** | **53** | **10–14 days** | |

---

*Generated by OpenCode full-stack audit — 2026-05-25*
