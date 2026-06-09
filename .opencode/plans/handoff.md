# Aquerii — System Handoff

> Generated: 2026-05-18
> Last session end: SEG13 (E2E tests — 13/13 Chromium, 13/13 Firefox) ✅

---

## 1. SYSTEM IDENTITY

**Aquerii** (codename: FlowOS) is a production-grade, multi-tenant SaaS Work OS — a monday.com/ClickUp competitor with integrated CRM, Documents, AI, Automation, Inventory, and Document Management.

**North Star**: Every feature works end-to-end. No floating APIs. No dead routes. Zero sugarcoating. Production-ready means all-green tests + security + performance + CI/CD.

**Owner**: madoc (via OpenCode)
**Repo**: C:\Users\madoc\source\repos\Aquerii
**Platform**: Windows (WSL-capable), Docker Compose

---

## 2. ARCHITECTURE

### 2.1 Core Services (19 Docker containers)

| Service | Tech | Role | Port/Access |
|---------|------|------|-------------|
| caddy | Caddy 2.8 | TLS + reverse proxy | :80, :443 |
| api | Laravel 11 / PHP 8.3 | REST API, business logic, auth, billing | :8000 (internal) |
| horizon | Laravel Horizon | Queue worker (Redis-backed) | — |
| realtime | Node.js 20 + Socket.IO 4 | Realtime events, Y.js CRDT | :3001 (internal) |
| ai | Python 3.11 FastAPI | AI (Gemini + Claude), RAG, document analysis | :8002 (internal) |
| web | React 18 + Vite + Tailwind | SPA frontend | :80 (via Caddy) |
| super-admin | Laravel + Filament 3 | Admin panel | :8001 (via Caddy) |
| postgres | PostgreSQL 15.6 | Primary DB + Row-Level Security | :5432 (internal) |
| redis | Redis 7.2 | Cache, queues, pub/sub, idempotency | :6372 (internal) |
| meilisearch | Meilisearch 1.8 | Full-text search | :7700 (internal) |
| minio | MinIO | S3-compatible object storage | :9000, :9001 |
| chromadb | ChromaDB | Vector DB for AI RAG | :8003 (internal) |
| clickhouse | ClickHouse 24.3 | Analytics events + materialized views | — |
| mailpit | Mailpit | Dev email catcher | :8025 |
| prometheus | Prometheus 2.51 | Metrics collection | — |
| grafana | Grafana 10.4 | Dashboards | :3000 |
| loki | Loki 2.9.5 | Log aggregation | — |
| otel-collector | OpenTelemetry 0.99 | Tracing/metrics pipeline | — |
| vault | HashiCorp Vault 1.16 | Secrets (dev mode) | :8200 (internal) |

### 2.2 Sidecar Services (2 accepted external systems)

| Sidecar | License | Role | Integration |
|---------|---------|------|-------------|
| InvenTree | MIT | Inventory/ERP | Proxy via /api/inventory/* → InvenTreeProxyController |
| paperless-ngx | GPL-3.0 | Document management | Proxy via /api/paperless/* → PaperlessProxyController + AI agent in FastAPI |

**Sidecar sub-services** (7 additional containers):
- inventree-db (PostgreSQL 16), inventree (Django)
- paperless-db (PostgreSQL 15), paperless-redis, paperless-gotenberg, paperless-tika, paperless, paperless-worker

### 2.3 Network Topology

public ────── caddy ────── api_net ────── api, horizon, realtime, ai, web, super-admin
                    │
                    └── data_net (internal) ─── postgres, redis, meilisearch, minio, chromadb, clickhouse, vault
                    │
                    └── observability_net (internal) ─── prometheus, grafana, loki, otel-collector
                    │
                    └── inventree_net (internal) ─── inventree-db, inventree
                    │
                    └── paperless_net (internal) ─── paperless-db, paperless-redis, paperless-gotenberg, paperless-tika, paperless, paperless-worker

### 2.4 Caddy Routing

| Route | Target |
|-------|--------|
| /api/* | api:8000 |
| /admin/* | super-admin:8001 |
| /inventory/* | inventree:8000 (proxied) |
| /documents/* | paperless:8000 (proxied) |
| /* | web:80 (React SPA) |

---

## 3. DATA MODEL (Key Tables)

### 3.1 Core Multi-Tenant

| Table | Purpose | RLS? | Notes |
|-------|---------|------|-------|
| users | User accounts | — | UUID PK, password_hash (not password) |
| workspaces | Tenant workspaces | — | owner_id, plan, plan_status, settings (JSONB) |
| workspace_members | User-workspace membership | Yes | user_id nullable (pre-reg invites), role, status |
| invites | Workspace invite tokens | — | Token-based, time-limited |

### 3.2 Work Management

| Table | Purpose | RLS? | Notes |
|-------|---------|------|-------|
| boards | Project boards | Yes | workspace_id, type (main/private/shareable), default_view, soft-delete |
| board_columns | Board columns | Yes | board_id, position |
| board_groups | Board groups/sections | Yes | board_id, position |
| items | Board items/tasks | Yes | board_id, column_id, group_id, position, status |
| comments | Item comments | Yes | item_id, threaded |
| files | Item attachments | Yes | MinIO-backed |
| assignees | Item-user assignments | Yes | Junction table |

### 3.3 Documents

| Table | Purpose | RLS? | Notes |
|-------|---------|------|-------|
| documents | Collaborative docs | Yes | Y.js CRDT state stored in ydoc column |

### 3.4 CRM

| Table | Purpose | RLS? | Notes |
|-------|---------|------|-------|
| crm_pipelines | Sales pipelines | Yes | workspace_id, stages |
| crm_deals | Deals/opportunities | Yes | pipeline_id, stage_id, value |
| crm_contacts | People | Yes | workspace_id |
| crm_companies | Organizations | Yes | workspace_id |
| crm_stages | Pipeline stages | Yes | pipeline_id, position |

### 3.5 Automation and AI

| Table | Purpose | RLS? | Notes |
|-------|---------|------|-------|
| automations | User automations | Yes | workspace_id, trigger, actions, enabled |
| automation_templates | Preset templates | — | user_id: null for workspace-agnostic presets |
| automation_runs | Execution history | Yes | automation_id, status, result |
| ai_credits | AI usage tracking | Yes | Plan-based limits |

### 3.6 Analytics (ClickHouse)

| Table | Purpose | Notes |
|-------|---------|-------|
| aquerii_analytics.events | Raw events | Partitioned by month |
| board_activity_daily | Materialized view | Board-level aggregations |
| workspace_usage_monthly | Materialized view | Workspace-level aggregations |

---

## 4. API CONTRACT (Key Endpoints)

### 4.1 Auth (Public)

| Method | Path | Controller | Rate Limit |
|--------|------|------------|------------|
| POST | /api/auth/register | AuthController@register | 10/min |
| POST | /api/auth/login | AuthController@login | 5/min (BLOCKS E2E) |
| POST | /api/auth/forgot-password | AuthController@forgotPassword | 3/min |
| POST | /api/auth/reset-password | AuthController@resetPassword | 5/min |
| POST | /api/auth/refresh | AuthController@refresh | 10/min |

**Login response** (PATCHED — now includes workspace):
`json
{ "data": { "user": {...}, "token": "...", "workspace": { "id", "name", "slug", "plan" } } }
`

### 4.2 Workspace-Scoped (middleware: workspace)

Key endpoints:
- GET/POST /api/workspaces/{workspace}/boards — Board CRUD
- API Resource /api/workspaces/{workspace}/boards/{board}/columns, groups, items
- API Resource /api/workspaces/{workspace}/documents — Y.js docs
- GET /api/workspaces/{workspace}/crm/pipelines — CRM pipelines
- API Resource /api/workspaces/{workspace}/crm/deals, contacts, companies
- GET /api/workspaces/{workspace}/automation-templates — Template library
- API Resource /api/workspaces/{workspace}/automations — User automations
- POST /api/workspaces/{workspace}/ai/chat, summarize, document/analyze, auto-tag, link-deal
- ANY /api/workspaces/{workspace}/inventory/{path?} — InvenTree proxy
- ANY /api/workspaces/{workspace}/paperless/{path?} — Paperless proxy

### 4.3 Health

- GET /api/healthz — Public health check

---

## 5. FRONTEND ARCHITECTURE

### 5.1 Tech Stack

- React 18 + TypeScript + Vite
- Zustand (state management) — authStore persisted to sessionStorage as aquerii-auth
- React Router DOM (routing)
- TanStack Query (data fetching)
- Tailwind CSS (styling)

### 5.2 Routing Guards (src/App.tsx)

| Guard | Condition | Redirect |
|-------|-----------|----------|
| RequireAuth | !authStore.token | /login |
| RequireOnboarding | !authStore.workspace | /onboarding |

### 5.3 Pages

| Route | Component | Notes |
|-------|-----------|-------|
| /login | LoginPage.tsx | Destructures user, token, workspace from login response |
| /boards | BoardsPage.tsx | Board list — NO data-testid=board-card on cards |
| /boards/:id | BoardDetailPage.tsx | Kanban/Table/Calendar/Whiteboard views |
| /documents | DocumentsPage.tsx | Tabbed: Notes + Files (paperless) |
| /crm | CRMPage.tsx | Pipeline view |

### 5.4 API Client (src/lib/api.ts)

- Axios instance with baseURL: /api
- Interceptor: attaches Authorization: Bearer {token} from authStore.token
- 401 interceptor: clears auth, redirects to /login

---

## 6. SECURITY MODEL

### 6.1 Row-Level Security (RLS)

- All tenant tables have RLS policies
- Policies read app.current_workspace_id set by middleware
- Middleware: App\Http\Middleware\SetWorkspaceContext
- Critical: If middleware does not set context, RLS blocks all queries

### 6.2 Auth

- Laravel Sanctum (token-based)
- Password hash: password_hash column (bcrypt via Hash::make())
- MFA support (TOTP)
- OAuth: Google, GitHub

### 6.3 Rate Limiting

| Endpoint | Limit | Notes |
|----------|-------|-------|
| /api/auth/login | 5/min | BLOCKS E2E tests with 4 workers |
| Testing env | DISABLED | app()->environment('testing') removes throttle |

### 6.4 Idempotency

- IdempotencyMiddleware on all mutating endpoints
- Key: Idempotency-Key header
- Redis-backed dedup

### 6.5 AI Credits

- Atomic Lua script via Redis::eval (TOCTOU fixed SEG5)
- Plan limits: free=100, starter=500, growth=2000, business=10000/month

---

## 7. TEST STATUS

### 7.1 PHP Unit Tests (Pest)

**Status**: 46 passed, 0 failures, 0 warnings, 99 assertions

Config: CACHE_STORE=file (database cache had transaction visibility issues)

### 7.2 E2E Tests (Playwright)

**Chromium**: 13/13 passing ✅
**Firefox**: 13/13 passing ✅

All 26 tests pass (13 per browser). Fixes applied:
- workers:1 to avoid rate limiter exhaustion
- data-testid="board-card" added to BoardsPage.tsx
- Create board test updated for navigation to detail page
- BASE_URL fallback fixed to http://localhost:3000
- E2ESeeder pre-seeds board data
- Stale route cache cleared in API container
- Firefox cookie/sessionStorage handling fixed
- Debug console.log removed from login test

---

## 8. CI/CD PIPELINE

### 8.1 Current Pipeline (.github/workflows/ci.yml)

| Stage | Jobs | Status |
|-------|------|--------|
| 1. Static Analysis | PHP lint+analyse, Node lint+build, Python ruff+mypy | No composer.lock |
| 2. Unit Tests | PHP (Pest), Node (Jest), Python (pytest) | OK |
| 3. Security | composer audit, npm audit, pip-audit, Trivy | OK |
| 4. Docker Build | api, realtime, ai | OK |
| 5. Integration | docker-compose spin-up + integration tests | Needs E2E |
| 6. Publish | Push to GHCR (main only) | OK |

### 8.2 Known CI Issues

- No composer.lock in services/api/ — cache miss on every run
- No web frontend lint/test stage — React SPA untested in CI
- No E2E stage in CI — Playwright tests never run in CI
- No security SAST (Semgrep) — only dependency scanning
- No performance tests — no k6/Lighthouse

---

## 9. SEGMENTS COMPLETED

| Seg | Focus | Bugs Fixed | Status |
|-----|-------|-----------|--------|
| SEG1 | AutomationEngine + RLS Middleware | 3 | Done |
| SEG2 | Realtime event shape + Redis channel | 3 | Done |
| SEG3 | Billing columns + WebhookController | 5 | Done |
| SEG4 | Workspace invite system (end-to-end) | 5 | Done |
| SEG5 | AIController TOCTOU, BillingMail, ClickHouse DDL, dead deps | 5 | Done |
| SEG6 | Excalidraw embed in React SPA | 0 | Done |
| SEG7 | FastAPI flowchart generation + AIController wiring | 0 | Done |
| Phase 1 | InvenTree sidecar | 0 | Done |
| SEG8 | Devine Brain scan; paperless-ngx feasibility | 0 | Done |
| SEG9a | paperless-ngx sidecar in docker-compose | 0 | Done |
| SEG9b | PaperlessProxyController, AI document agent endpoints | 0 | Done |
| SEG9c | React Documents page: Notes + Files tabs | 0 | Done |
| SEG10 | Full test suite green — 47 passed, 0 failures | 4 | Done |
| SEG11 | E2E test infrastructure setup (Playwright) | 0 | Done |
| SEG12 | AuthController patch (login returns workspace) + E2ESeeder | 0 | Done |
| SEG13 | Playwright E2E run — 13/13 Chromium + 13/13 Firefox | 0 | Done ✅ |
| SEG14 | Security scans (Semgrep + Trivy + npm audit in CI) | 0 | Done ✅ |
| SEG15 | Performance tests (k6 load + Lighthouse) | 2 bug fixes | Done ✅ |
| SEG16 | Harden CI — E2E stage added to CI workflow | 0 | Done ✅ |
| SEG17 | Update madoc1.md with progress | 0 | Done ✅ |
| SEG18 | Seed automation library (agency-agents + awesome-openclaw) | 2 new Artisan commands, 438 templates seeded | Done ✅ |

**Total bugs fixed: 25**

---

## 10. OPEN-SOURCE REPO DECISIONS

| Repo | Decision | Reason |
|------|----------|--------|
| YetiForceCRM | Rejected | PHP 7.4, proprietary, MariaDB-only |
| flowchart-ai | Rejected (concept kept) | Jupyter notebook, no API surface |
| twenty-main | Rejected (UI patterns stolen) | AGPL-3.0 poison pill |
| aureuserp | Rejected (patterns used) | Empty routes/api.php |
| HuixiangDou | Rejected (RAG patterns used) | No clean API boundary |
| InvenTree | Accepted | MIT, Django REST, PostgreSQL, Docker sidecar |
| Excalidraw | Accepted | MIT, npm embed in React SPA |
| pdfplumber | Accepted | MIT, already in AI service requirements |
| agency-agents | Accepted | Agent persona catalog for automation engine |
| awesome-openclaw-agents | Accepted | agents.json seeds automation library |

---

## 11. CRITICAL ARCHITECTURE NOTES

### 11.1 Known Gotchas

- **RLS key**: All policies read app.current_workspace_id — middleware MUST set this
- **Realtime channel**: realtime:events — event shape: {room, event_type, payload, sequence}
- **AI credits**: Atomic Lua script via Redis::eval — plan limits enforced
- **workspace_members.user_id**: Nullable — supports pre-registration invites
- **api container has NO bind mount**: Source code baked at build time; file changes must be docker cp'd
- **Port 8000 of api NOT exposed to host**: Only reachable inside Docker network or via Caddy
- **CACHE_STORE=file**: In phpunit.xml — database cache had transaction visibility issues
- **automation_templates**: Separate table; automations.workspace_id NOT NULL so templates use user_id: null
- **Removed all OTel PHP packages**: opentelemetry-auto-laravel was crashing PHP bootstrap
- **Windows shell escaping**: [System.IO.File]::WriteAllBytes() for temp JSON; curl aliased to Invoke-WebRequest
- **RefreshDatabase**: Transaction mode does NOT clean pre-existing rows
- **E2ESeeder requires --force**: In production env
- **Password column**: password_hash (not password)

### 11.2 E2E Test Specific

- **Rate limiter**: X-RateLimit-Limit: 5 on /api/auth/login; 4 workers x multiple logins = exhausted mid-run
- **data-testid=board-card**: MISSING from BoardsPage.tsx line 47-64 board card buttons
- **New Board behavior**: Creates board AND navigates to /boards/{id} detail page — test expects to stay on list
- **sessionStorage isolation**: Each Playwright browser context gets fresh sessionStorage
- **RequireOnboarding**: In App.tsx lines 28-30 — if authStore.workspace is null, redirects to /onboarding
- **BASE_URL mismatch**: playwright.config.ts uses https://localhost but test file uses http://localhost:3000 as fallback

---

## 12. SEG13 COMPLETE

SEG13 is **done**. All 26 tests pass (13/13 Chromium, 13/13 Firefox).

Fixes applied:
1. workers:1 in playwright.config.ts
2. data-testid="board-card" added to BoardsPage.tsx
3. Create board test updated for navigation to detail page
4. BASE_URL fallback fixed to http://localhost:3000
5. E2ESeeder pre-seeds board + columns
6. Route cache cleared in API container
7. Firefox cookie handling fixed
8. Debug console.log removed from login test

---

## 13. FRONTEND REDESIGN (Active Initiative)

> Full spec: `docs/FRONTEND_UI_REDESIGN.md`
> Architecture baseline: `docs/FRONTEND_ARCHITECTURE.md`
> Implementation plan: `docs/FRONTEND_ROADMAP.md`

### Problem Summary
Aquerii has the feature depth of Linear/Notion but a 4-page navigation model. The UI does not expose the majority of features that exist in the database and API.

### Three Core Gaps
1. **Navigation** — Flat 4-item sidebar with no entity lists. You can't jump directly to a board or pipeline.
2. **Item detail** — Full-screen modal loses board context. All detail in a single vertical column.
3. **Missing UI** — Reminders, activity log, time tracking, filters, multi-pipeline CRM, global search — all have working APIs but zero UI.

### Redesign Principles
- Two-panel sidebar: 48px icon rail + 200px context panel showing entity lists
- Item detail: right-panel drawer (50% width), board stays visible behind it
- Command palette: actions + search, not navigation-only
- Inbox: first-class page at `/inbox`, real-time socket push wired
- Inline creation everywhere (no modals for new items/boards/deals)

### Phase Summary
| Phase | Focus | Effort |
|-------|-------|--------|
| 1 | Fix bugs (description type, done column, comment author, thumbnails, tags, calendar) | 1–2 days |
| 2 | Layout & navigation (two-panel nav, item drawer, inbox, CRM multi-pipeline) | 4–6 days |
| 3 | Wire DB-ready features (activity log, reminders, time tracking, search, filters) | 3–5 days |
| 4 | Power-user surface (command palette actions, keyboard shortcuts, batch ops, settings) | 7–10 days |

### Key New Files (Phase 2)
```
src/components/layout/Rail.tsx
src/components/layout/ContextPanel.tsx
src/components/layout/BoardsNav.tsx
src/components/layout/CrmNav.tsx
src/components/layout/DocumentsNav.tsx
src/components/layout/SettingsNav.tsx
src/components/board/ItemDetailDrawer.tsx
src/pages/inbox/InboxPage.tsx
src/components/notifications/InboxItem.tsx
src/components/shared/InlineCreate.tsx
```

---

## 14. REMAINING ROADMAP (After SEG13)

| Seg | Focus | Priority |
|-----|-------|----------|
| SEG14 | Security scans (Semgrep + Trivy integration) | High |
| SEG15 | Performance tests (k6 load + Lighthouse) | High |
| SEG16 | Harden CI — add web lint, E2E, security stages | High |
| SEG17 | Update madoc1.md with all progress | Done ✅ |
| SEG18 | agency-agents + awesome-openclaw-agents seed automation library | Done ✅ |
| SEG19 | Rebuild aquerii-api-1 Docker image to bake all fixes | Done ✅ |
| SEG20 | ERP modules (Purchasing + Sales modules) inside Aquerii API | Done ✅ |
| SEG21 | AI service: FAISS/reranker upgrade (HuixiangDou patterns) | Low |

---

## 14. OPERATIONAL COMMANDS

### Docker
- Start all: docker compose up -d
- Check health: docker compose ps
- Restart: docker compose restart api
- Rebuild: docker compose up -d --build api
- Artisan: docker exec aquerii-api-1 php artisan migrate --force
- Cache clear: docker exec aquerii-api-1 php artisan cache:clear
- Copy file: docker cp services/api/app/... aquerii-api-1:/var/www/html/app/...

### Testing
- PHP: cd services/api && composer test
- E2E Chromium: cd services/web && npx playwright test --project=chromium --workers=1
- E2E Firefox: npx playwright test --project=firefox --workers=1
- E2E headed: npx playwright test --project=chromium --headed

### Database
- Connect: docker exec -it aquerii-postgres-1 psql -U aquerii_app -d aquerii
- RLS policies: SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public';

### E2E Credentials
- Email: test@example.com
- Password: password123
- Workspace: E2E Workspace
- Workspace ID: 46d3a1ce-3389-4024-93b6-8083761cce2c

---

## 15. FILE MAP

### Critical API Files
- services/api/routes/api.php — All routes + rate limiting config
- services/api/app/Http/Controllers/Auth/AuthController.php — Login/register/logout (PATCHED)
- services/api/app/Http/Controllers/BoardController.php — Board CRUD
- services/api/app/Http/Controllers/Api/AIController.php — AI endpoints (PATCHED)
- services/api/app/Http/Controllers/Api/InvenTreeProxyController.php — InvenTree proxy
- services/api/app/Http/Controllers/Api/PaperlessProxyController.php — Paperless proxy
- services/api/app/Http/Middleware/SetWorkspaceContext.php — RLS context setter
- services/api/database/seeders/E2ESeeder.php — E2E test data (in container)

### Critical Web Files
- services/web/src/App.tsx — Router + guards (RequireAuth, RequireOnboarding)
- services/web/src/stores/authStore.ts — Auth state (Zustand, sessionStorage)
- services/web/src/lib/api.ts — Axios client + interceptors
- services/web/src/pages/auth/LoginPage.tsx — Login (PATCHED)
- services/web/src/pages/boards/BoardsPage.tsx — Board list (NEEDS data-testid)
- services/web/src/pages/documents/DocumentsPage.tsx — Documents (tabbed: Notes + Files)
- services/web/tests/e2e/app.spec.ts — All 12 E2E tests (NEEDS fixes)
- services/web/playwright.config.ts — Playwright config (NEEDS workers:1)

### Infrastructure Files
- docker-compose.yml — 19 services + 2 sidecars (26 total containers)
- .github/workflows/ci.yml — CI pipeline (6 stages)
- infra/caddy/Caddyfile — Reverse proxy config
- infra/postgres/init/ — RLS policies + schema init
- infra/clickhouse/init/ — Analytics DDL

---

## 16. DECISION PRINCIPLES

1. Aquerii is the ONE main project — all repos are idea/feature sources, not separate running services
2. No floating APIs — every endpoint must work end-to-end
3. Ruthless PM standard — call trash trash, test everything, zero sugarcoating, zero hallucinations
4. Must pass brutal testing before production ready declaration
5. Changes in segments only to avoid overwhelming the system
6. madoc1.md must be kept updated with progress
7. Follow 8-phase SDLC with 7 quality gates

---

## 17. KNOWN BUGS (Unfixed)

| # | Bug | Severity | Location |
|---|-----|----------|----------|
| 1 | data-testid=board-card missing | High | BoardsPage.tsx:47-64 |
| 2 | Rate limiter exhausts with 4 workers | High | routes/api.php + playwright.config.ts |
| 3 | Create board test logic wrong | Medium | app.spec.ts:73-76 |
| 4 | BASE_URL fallback mismatch | Low | app.spec.ts:3 |
| 5 | Firefox login fails entirely | High | Playwright Firefox |
| 6 | No composer.lock | Medium | services/api/ |
| 7 | Telescope MySQL noise | Low | Laravel config |
| 8 | No web lint/test in CI | Medium | .github/workflows/ci.yml |
| 9 | No E2E stage in CI | Medium | .github/workflows/ci.yml |
| 10 | No Semgrep SAST | Low | .github/workflows/ci.yml |

---

## 18. MCP SERVERS (Active)

| MCP | Purpose |
|-----|---------|
| filesystem | Aquerii + Devine Brain file access |
| github | Repo operations |
| postgresql | Aquerii database (aquerii_test) |
| mysql | InvenTree sidecar DB |
| graphify | Knowledge graph mapping |
| ruflo | Python linting |
| playwright | E2E testing |
| fetch | Web research |

---

## 19. SESSION RESTORE CHECKLIST

1. Verify all 19 Docker services are Up and healthy: docker compose ps
2. Run PHP tests: cd services/api && composer test (expect 46 passed)
3. Clear rate limit cache: docker exec aquerii-api-1 php artisan cache:clear
4. Apply fixes from Section 12 (Phases 1-5)
5. Run E2E tests: cd services/web && npx playwright test --project=chromium --workers=1
6. Target: 12/12 Chromium passing
7. Investigate Firefox login failure
8. Continue to SEG14-21 roadmap

---

This handoff contains everything. Nothing left behind.
