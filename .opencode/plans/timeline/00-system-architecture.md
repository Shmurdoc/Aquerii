# 00 — System Architecture & Developer Contract

> **Audience**: All 3 groups. Read this first. Every task defers to this document.
> **Rule**: If your implementation contradicts this doc without an ADR, it will be rejected.
> **Guarantee**: This describes the system AS IT EXISTS and AS IT SHOULD BE. No floating APIs.

---

## 1. SYSTEM IDENTITY

**Aquerii** is a multi-tenant SaaS Work OS — monday.com/ClickUp competitor with integrated CRM, Documents, AI, Automation, Inventory, Document Management. Single codebase, modular monolith architecture under `App/Core/` and `App/Modules/*`.

**North Star**: Every feature works end-to-end. No floating APIs. No dead routes. All-green tests + security + performance + CI/CD.

**Repo**: `C:\Users\madoc\source\repos\Aquerii`
**Platform**: Windows host, Docker Compose, WSL-capable

---

## 2. ARCHITECTURE RULES (Never Violate)

```
R1. Modules never import from other modules.
    Cross-module communication is via Core events and IDs only.
    App/Modules/CRM/ cannot import from App/Modules/Documents/.

R2. Every tenant table MUST have Row-Level Security (RLS).
    The SetWorkspaceTenant middleware sets app.current_workspace_id.
    If it fails to set, RLS blocks ALL queries.

R3. Every mutating endpoint MUST have idempotency.
    The Idempotency-Key header is required on all POST/PUT/PATCH/DELETE.
    Missing key = 400 MISSING_IDEMPOTENCY_KEY. Replayed = header response.

R4. All secrets go through environment variables, never hardcoded.
    Production reads from Vault. Dev uses .env.

R5. Events are immutable. Never edit an event; publish a corrective event instead.

R6. No floating APIs. Every endpoint registered in routes/* must have:
    - A controller method that works
    - A FormRequest or validation
    - A Policy or authorization check
    - A test (unit or feature)
```

---

## 3. CONTAINER ARCHITECTURE (19 Core + 7 Sidecar + MCP)

### 3.1 MCP Layer — Route Map

MCP servers sit alongside REST, using the same auth and middleware:

```
public ── caddy:443 ──┬── /api/* ────────────► api:8000 (Laravel Octane)
                      ├── /mcp/* ───────────► api:8000 (Laravel MCP — in-app SSE)
                      │   ├── /mcp/boards     → BoardServer (tools: CRUD + query)
                      │   ├── /mcp/crm        → CrmServer (tools: deals, pipelines)
                      │   ├── /mcp/documents   → DocumentServer (tools: CRUD, OCR)
                      │   ├── /mcp/inventory   → InventoryServer (tools: stock, barcodes)
                      │   ├── /mcp/automations → AutomationServer (tools: rules, triggers)
                      │   ├── /mcp/ai          → AiServer (tools: chat, summarize)
                      │   └── /mcp/billing     → BillingServer (tools: subscriptions)
                      ├── /admin/* ──────────► super-admin:8001 (Filament)
                      ├── /socket.io* ───────► realtime:3000 (Socket.IO)
                      ├── /internal/ai* ─────► ai:8002 (FastAPI)
                      ├── /n8n/* ────────────► n8n:5678 (Workflow automation, Phase B4+)
                      └── /* ────────────────► web:80 (React SPA)
```

Local (stdio) MCP servers run as subprocesses for local AI agents:

```
Claude Code ──► php artisan mcp:start boards   (BoardServer via stdio)
              ├── php artisan mcp:start crm     (CrmServer via stdio)
              └── php artisan mcp:start admin   (AdminServer via stdio)
```

### 3.2 MCP Server Registry

| Server | Class | Transport | Auth | Module |
|--------|-------|-----------|------|--------|
| BoardServer | `App\Mcp\Servers\BoardServer` | web + local | sanctum | Core |
| CrmServer | `App\Mcp\Servers\CrmServer` | web + local | sanctum | CRM |
| DocumentServer | `App\Mcp\Servers\DocumentServer` | web + local | sanctum | Documents |
| InventoryServer | `App\Mcp\Servers\InventoryServer` | web + local | sanctum | Inventory |
| AutomationServer | `App\Mcp\Servers\AutomationServer` | web + local | sanctum | Automation |
| AiServer | `App\Mcp\Servers\AiServer` | web + local | sanctum | AI |
| BillingServer | `App\Mcp\Servers\BillingServer` | web + local | sanctum | Billing |
| AdminServer | `App\Mcp\Servers\AdminServer` | local only | — | Admin |

### 3.3 Core Services

```
public ── caddy:443 ──┬── /api/* ────────────► api:8000 (Laravel Octane)
                      ├── /admin/* ──────────► super-admin:8001 (Filament)
                      ├── /socket.io* ───────► realtime:3000 (Socket.IO)
                      ├── /internal/ai* ─────► ai:8002 (FastAPI)
                      └── /* ────────────────► web:80 (React SPA)
```

| Service | Image | Ports | Networks | Purpose |
|---------|-------|-------|----------|---------|
| caddy | caddy:2.8-alpine | 80,443 | public, api_net | TLS termination, reverse proxy |
| api | custom (Laravel 11) | — | api_net, data_net | REST API, MCP Servers, business logic |
| horizon | custom (same image) | — | api_net, data_net | Queue worker (Redis) |
| realtime | custom (Node.js) | — | api_net, data_net | Socket.IO, Y.js CRDT sync |
| ai | custom (Python FastAPI) | — | api_net, data_net | Gemini/Claude proxy, OCR, RAG |
| web | custom (React+Vite) | — | public, api_net | SPA frontend |
| postgres | postgres:15.6-alpine | — | data_net | Primary DB + RLS |
| redis | redis:7.2-alpine | — | data_net | Cache, queues, pub/sub, idempotency |
| meilisearch | meilisearch:v1.8 | — | data_net | Full-text search |
| minio | minio/minio | 9001 | data_net | S3-compatible object storage |
| chromadb | chromadb/chroma | — | data_net | Vector DB for AI RAG |
| clickhouse | clickhouse-server:24.3-alpine | — | data_net | Analytics events |
| mailpit | axllent/mailpit | 8025 | api_net | Dev email |
| prometheus | prom/prometheus:v2.51 | — | data_net, observability_net | Metrics |
| grafana | grafana/grafana:10.4 | 3000 | observability_net | Dashboards |
| loki | grafana/loki:2.9.5 | — | observability_net | Log aggregation |
| otel-collector | otel/otel-contrib:0.99 | — | api_net, observability_net | Tracing pipeline |
| vault | hashicorp/vault:1.16 | — | data_net | Secrets (dev mode) |

### 3.4 Sidecar Services

| Service | Purpose | Integration |
|---------|---------|-------------|
| InvenTree (MIT) | Inventory/ERP backend | `/api/inventory/*` → InvenTreeProxyController |
| paperless-ngx (GPL-3.0) | Document management | `/api/paperless/*` → PaperlessProxyController |
| **n8n** (Sustainable Use License) | Visual workflow automation (Phase B4+) | `/n8n/*` → Caddy proxy, Aquerii webhooks |

**Sidecar containers** (7): inventree-db, inventree, paperless-db, paperless-redis, paperless-gotenberg, paperless-tika, paperless, paperless-worker  
**Planned sidecar**: n8n + n8n-db (added in Phase B4 — Automation Engine)

---

## 4. DATA MODEL (Key Tables — Developer Reference)

### 4.1 Core Tables

| Table | RLS | Key Fields |
|-------|-----|------------|
| users | — | id (UUID), email, password_hash, name, avatar_url, timezone, two_factor_secret |
| workspaces | — | id (UUID), name, slug, owner_id, plan, plan_status, settings (JSONB) |
| workspace_members | yes | workspace_id, user_id (nullable), role (enum), status (enum), invite_token |
| boards | yes | workspace_id, name, type (enum), default_view, status, color, excalidraw_state (JSONB) |
| board_columns | yes | board_id, name, type (enum), config (JSONB), position |
| board_groups | yes | board_id, name, position, color |
| items | yes | board_id, group_id, column_values (JSONB), position, status, version (integer) |
| comments | yes | item_id (morph), user_id, body (JSONB), parent_id, pinned |
| files | yes | item_id (morph), disk, path, mime_type, size, user_id |
| notifications | yes | user_id, type, data (JSONB), read_at |
| activity_log | yes | workspace_id, user_id, entity_type, entity_id, action, old_values, new_values |
| documents | yes | workspace_id, title, content (JSONB), ydoc (bytea), folder_id |
| document_folders | yes | workspace_id, name, parent_id, position |

### 4.2 Business Module Tables

| Table | RLS | Module |
|-------|-----|--------|
| crm_pipelines | yes | CRM |
| crm_pipeline_stages | yes | CRM |
| crm_deals | yes | CRM |
| crm_contacts | yes | CRM |
| crm_companies | yes | CRM |
| automations | yes | Automation |
| automation_templates | — | Automation |
| automation_runs | yes | Automation |
| ai_credits | yes | AI |
| scanned_documents | yes | Documents |
| inventory_categories | yes | Inventory |
| products | yes | Inventory |
| stock_items | yes | Inventory |
| billing_events | — | Billing |

### 4.3 Platform Tables

| Table | Purpose |
|-------|---------|
| feature_flags | Admin toggle (key, name, enabled, scope) |
| super_admins | Separate guard for admin panel |
| oauth_accounts | Social login (provider, provider_id, token) |
| idempotency_keys | Idempotency middleware (key, response, created_at) |
| sessions, cache, jobs, failed_jobs | Laravel standard |

---

## 5. API DESIGN CONTRACT

### 5.1 Standard Envelope

```json
// Success
{ "data": { ... }, "meta": { "current_page": 1, "per_page": 50, "total": 100 } }

// Error
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "field": "email" } }
```

### 5.2 Endpoint Naming

```
GET    /api/workspaces/{workspace}/resources          # List
POST   /api/workspaces/{workspace}/resources          # Create (idempotent)
GET    /api/workspaces/{workspace}/resources/{id}      # Show
PUT    /api/workspaces/{workspace}/resources/{id}      # Replace (idempotent)
PATCH  /api/workspaces/{workspace}/resources/{id}      # Partial update (idempotent)
DELETE /api/workspaces/{workspace}/resources/{id}      # Delete (idempotent)
```

### 5.3 Required Headers

| Header | Where | Purpose |
|--------|-------|---------|
| Authorization: Bearer {token} | Authenticated routes | Sanctum token |
| Idempotency-Key: {uuid} | POST/PUT/PATCH/DELETE | Prevent duplicate mutations |
| Content-Type: application/json | POST/PUT/PATCH | Request body format |
| Accept: application/json | All | Response format |

### 5.4 Rate Limits

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| /api/auth/login | 5 | 1 minute |
| /api/auth/register | 10 | 1 minute |
| /api/auth/* (other) | 10 | 1 minute |
| /api/ai/* | 30 | 1 hour (per workspace) |
| /api/* (general) | 120 | 1 minute (per user) |
| Testing env | DISABLED | — |

---

## 6. ROUTE REGISTRY (All ~80 Authenticated Endpoints)

```
=== PUBLIC ===
GET    /api/healthz

=== AUTH ===
POST   /api/auth/register                     throttle:10,1 | idempotent
POST   /api/auth/login                        throttle:5,1
POST   /api/auth/forgot-password              throttle:3,1
POST   /api/auth/reset-password               throttle:5,1 | idempotent
POST   /api/auth/verify-email/{id}/{hash}
POST   /api/auth/refresh                      throttle:10,1
GET    /api/auth/oauth/{provider}
GET    /api/auth/oauth/{provider}/callback

=== AUTHENTICATED (sanctum) ===
POST   /api/auth/logout
POST   /api/auth/mfa/enable                   idempotent
POST   /api/auth/mfa/verify
GET    /api/me
PUT    /api/me                                idempotent
GET    /api/me/notifications
PATCH  /api/me/notifications/{id}/read
POST   /api/me/notifications/read-all
POST   /api/workspaces                        idempotent

=== WORKSPACE-SCOPED (workspace middleware) ===
GET    /api/workspaces/{ws}
PATCH  /api/workspaces/{ws}                   idempotent
GET    /api/workspaces/{ws}/members
POST   /api/workspaces/{ws}/members           idempotent
PATCH  /api/workspaces/{ws}/members/{userId}   idempotent
DELETE /api/workspaces/{ws}/members/{userId}   idempotent

=== BOARDS ===
GET    /api/workspaces/{ws}/boards
POST   /api/workspaces/{ws}/boards            idempotent
GET    /api/workspaces/{ws}/boards/{board}
PUT    /api/workspaces/{ws}/boards/{board}    idempotent
PATCH  /api/workspaces/{ws}/boards/{board}    idempotent
DELETE /api/workspaces/{ws}/boards/{board}    idempotent
GET    /api/workspaces/{ws}/boards/{board}/columns
POST   /api/workspaces/{ws}/boards/{board}/columns  idempotent
GET    /api/workspaces/{ws}/boards/{board}/columns/{column}
PUT    /api/workspaces/{ws}/boards/{board}/columns/{column}  idempotent
DELETE /api/workspaces/{ws}/boards/{board}/columns/{column}  idempotent
GET    /api/workspaces/{ws}/boards/{board}/groups
POST   /api/workspaces/{ws}/boards/{board}/groups  idempotent
GET    /api/workspaces/{ws}/boards/{board}/groups/{group}
PUT    /api/workspaces/{ws}/boards/{board}/groups/{group}  idempotent
DELETE /api/workspaces/{ws}/boards/{board}/groups/{group}  idempotent

=== ITEMS ===
GET    /api/workspaces/{ws}/boards/{board}/items
POST   /api/workspaces/{ws}/boards/{board}/items  idempotent
GET    /api/workspaces/{ws}/boards/{board}/items/{item}
PUT    /api/workspaces/{ws}/boards/{board}/items/{item}  idempotent
DELETE /api/workspaces/{ws}/boards/{board}/items/{item}  idempotent
GET    /api/workspaces/{ws}/boards/{board}/items/{item}/activity
POST   /api/workspaces/{ws}/boards/{board}/items/{item}/subitems  idempotent
POST   /api/workspaces/{ws}/boards/{board}/items/{item}/duplicate  idempotent
POST   /api/workspaces/{ws}/boards/{board}/items/{item}/move  idempotent
POST   /api/workspaces/{ws}/boards/{board}/items/{item}/assignees  idempotent
DELETE /api/workspaces/{ws}/boards/{board}/items/{item}/assignees/{userId}  idempotent

=== COMMENTS ===
GET    /api/workspaces/{ws}/boards/{board}/items/{item}/comments
POST   /api/workspaces/{ws}/boards/{board}/items/{item}/comments  idempotent
PATCH  /api/workspaces/{ws}/boards/{board}/items/{item}/comments/{comment}  idempotent
DELETE /api/workspaces/{ws}/boards/{board}/items/{item}/comments/{comment}  idempotent

=== FILES ===
GET    /api/workspaces/{ws}/boards/{board}/items/{item}/files
POST   /api/workspaces/{ws}/boards/{board}/items/{item}/files  idempotent
DELETE /api/workspaces/{ws}/files/{file}  idempotent

=== MODULES ===
POST   /api/workspaces/{ws}/ai/*            (chat, summarize, credits, etc.)  idempotent
GET    /api/workspaces/{ws}/automation-templates
CRUD   /api/workspaces/{ws}/automations     idempotent
CRUD   /api/workspaces/{ws}/crm/pipelines/deals/contacts/companies  idempotent
CRUD   /api/workspaces/{ws}/documents       idempotent
CRUD   /api/workspaces/{ws}/scanned-documents  idempotent
CRUD   /api/workspaces/{ws}/inventory/{categories,products,stock-items}  idempotent
ANY    /api/workspaces/{ws}/inventory/*     (InvenTree proxy)
ANY    /api/workspaces/{ws}/paperless/*     (Paperless proxy)

=== BILLING ===
GET    /api/workspaces/{ws}/billing
POST   /api/workspaces/{ws}/billing/checkout  idempotent
POST   /api/workspaces/{ws}/billing/portal
DELETE /api/workspaces/{ws}/billing/subscription  idempotent
POST   /api/workspaces/{ws}/billing/payfast/checkout  idempotent
POST   /api/webhooks/stripe
POST   /api/webhooks/payfast
POST   /api/invites/{token}/accept  idempotent

=== MCP (routes/ai.php) ===
POST   /mcp/aquerii/boards                sanctum | SSE | BoardServer
POST   /mcp/aquerii/crm                   sanctum | SSE | CrmServer
POST   /mcp/aquerii/documents             sanctum | SSE | DocumentServer
POST   /mcp/aquerii/inventory             sanctum | SSE | InventoryServer
POST   /mcp/aquerii/automations           sanctum | SSE | AutomationServer
POST   /mcp/aquerii/ai                    sanctum | SSE | AiServer
POST   /mcp/aquerii/billing               sanctum | SSE | BillingServer

=== N8N (Phase B4+) ===
ANY    /n8n/*                                       Caddy proxy → n8n:5678
POST   /api/webhooks/n8n/automation/run             idempotent | n8n → Aquerii
```

---

## 7. TESTING BASELINE (Current)

### 7.1 PHP Unit Tests (Pest) — 46 Passing, 0 Failing

| File | Tests | Description |
|------|-------|-------------|
| Auth/RegisterTest.php | 5 | Registration: success, workspace creation, duplicate, mismatch, missing fields |
| Auth/LoginTest.php | 6 | Login: success, invalid, non-existent, protected route, me, logout |
| Boards/BoardTest.php | 6 | CRUD + cross-workspace isolation |
| Items/ItemTest.php | 8 | CRUD + concurrent edit conflict + filter + duplicate |
| Workspace/InviteTest.php | 5 | Invite: send, create pending, accept, expired, wrong email |
| Health/HealthTest.php | 2 | Health endpoint |
| AI/AICreditTest.php | 3 | Credit enforcement + atomic Lua |
| PasswordStrengthTest.php | 8 | Password validation rules |
| IdempotencyTest.php | 3 | Idempotency: replay, missing key, conflict |

### 7.2 MCP Server Tests (Planned)

| Server | Test | Type |
|--------|------|------|
| BoardServer | ListBoardsTool returns workspace boards | Feature (Pest) |
| BoardServer | CreateBoardTool respects idempotency | Feature (Pest) |
| BoardServer | CreateBoardTool validated via FormRequest rules | Feature (Pest) |
| CrmServer | SearchDealsTool respects RLS isolation | Feature (Pest) |
| BillingServer | CreateCheckoutSession requires auth:sanctum | Feature (Pest) |

MCP tests use `Mcp::fake()` to assert tool calls without real HTTP:
```php
Mcp::fake();
$response = $this->postJson('/mcp/aquerii/boards', [
    'method' => 'tools/call',
    'params' => ['name' => 'create-board', 'arguments' => ['name' => 'Test']],
]);
Mcp::assertToolCalled('create-board', fn ($tool) => $tool->name === 'create-board');
```

### 7.3 E2E Tests (Playwright) — 5/12 Chromium Passing

| Test | Status | Root Cause |
|------|--------|-------------|
| redirects unauthenticated to login | ✅ | — |
| shows validation errors on empty login | ✅ | — |
| logs in with valid credentials | ✅ | — |
| completes workspace creation | ✅ | — |
| displays boards page | ✅ | — |
| can create a new board | ❌ | Missing data-testid=board-card |
| opens board and shows kanban view | ❌ | Missing data-testid=board-card |
| can switch to table view | ❌ | Rate limiter exhausts (workers > 1) |
| can switch to calendar view | ❌ | Rate limiter exhausts |
| displays documents page | ❌ | Rate limiter exhausts |
| can create a new document | ❌ | Rate limiter exhausts |
| displays pipeline view | ❌ | Rate limiter exhausts |

**Firefox: 0/12 passing** — sessionStorage persistence issue

---

## 8. FILE MAP (Developer Reference)

```
C:\Users\madoc\source\repos\Aquerii\
├── docker-compose.yml                    # 19 services + sidecars
├── infra/
│   ├── caddy/Caddyfile                   # Reverse proxy (91 lines)
│   ├── postgres/init/*                   # RLS policies + schema init
│   ├── clickhouse/init/*                 # Analytics DDL
│   ├── prometheus/*                      # Metrics config
│   ├── grafana/*                         # Dashboards
│   └── otel/*                            # Tracing config
├── services/
│   ├── api/                              # Laravel 11
│   │   ├── app/
│   │   │   ├── Core/                     # Shared: Models, Controllers, Middleware, Policies
│   │   │   │   ├── Http/Controllers/     # Auth, Board, Item, Comment, File, User
│   │   │   │   ├── Http/Middleware/      # SetWorkspaceTenant, EnforceIdempotency, InternalSecret
│   │   │   │   ├── Models/              # User, Workspace, Board, Item, Comment, File
│   │   │   │   ├── Policies/            # BoardPolicy, ItemPolicy, WorkspacePolicy
│   │   │   │   ├── Services/            # AuthService, BoardService, ItemService
│   │   │   │   └── Jobs/                # EvaluateAutomationTriggers, ProcessAutomations
│   │   │   └── Modules/                 # Feature modules (toggled by .env)
│   │   │       ├── Admin/               # Filament panel (4 resources)
│   │   │       ├── AI/                  # AIController (11 endpoints)
│   │   │       ├── Automation/          # AutomationEngine + CRUD
│   │   │       ├── Billing/             # Stripe/PayFast (incomplete)
│   │   │       ├── CRM/                 # Pipelines, Deals, Contacts, Companies
│   │   │       ├── Documents/           # Collaborative docs + scanned docs
│   │   │       └── Inventory/           # Categories, Products, StockItems
│   │   ├── routes/
│   │   │   ├── api.php                  # Core routes (130 lines)
│   │   │   ├── web.php                  # Web routes
│   │   │   ├── console.php             # Schedule
│   │   │   └── modules/                # ai.php, crm.php, automation.php, documents.php, inventory.php
│   │   ├── database/migrations/        # 21 migration files
│   │   └── tests/                      # Feature + Unit (Pest)
│   ├── web/                            # React 18 SPA
│   │   ├── src/
│   │   │   ├── App.tsx                 # Router + guards
│   │   │   ├── pages/                  # Login, Register, Boards, Documents, CRM
│   │   │   ├── components/            # KanbanView, TableView, CalendarView, ExcalidrawView
│   │   │   ├── stores/                # Zustand: auth, board, item, document, notification
│   │   │   ├── hooks/                 # useBoards, useItems, useSocket, usePresence
│   │   │   └── lib/                   # api.ts (Axios), socket.ts, paperless.ts
│   │   └── tests/e2e/                # Playwright tests (app.spec.ts)
│   ├── ai/                            # Python FastAPI (Gemini + Claude)
│   ├── realtime/                      # Node.js Socket.IO
│   └── web/ (same as above)
├── .github/workflows/ci.yml          # 6-stage CI pipeline
└── .opencode/plans/timeline/*        # THIS FILE — execution plan
```

---

## 9. QUALITY GATES (7 Gates)

Every PR must pass ALL enabled gates before merge:

| Gate | Tool | Pass Criteria | CI Stage |
|------|------|---------------|----------|
| G1 | PHP Lint + Pint | Zero errors, PSR-12 | lint-php |
| G2 | PHPStan level 6 | Zero errors | lint-php |
| G3 | Pest tests | 100% pass, no `--stop-on-failure` | test-php |
| G4 | E2E Playwright | 100% pass (all browsers) | Not in CI yet |
| G5 | Composer audit | Zero advisory-level deps | security |
| G6 | Trivy scan | Zero critical/high CVEs | security |
| G7 | npm audit | Zero high/critical | security |

**Testing env overrides**: CACHE_STORE=file, rate limits DISABLED, QUEUE_CONNECTION=sync

---

## 10. CURRENT BUGS (Must Fix Before New Features)

| # | Bug | Severity | File | Fix |
|---|-----|----------|------|-----|
| B1 | data-testid=board-card missing | HIGH | BoardsPage.tsx:47-64 | Add testid prop to board card button |
| B2 | Rate limiter exhausts with 4 workers | HIGH | playwright.config.ts | Set workers:1 in config |
| B3 | Create board test navigates to detail page | MEDIUM | app.spec.ts:73-76 | Update test expectation |
| B4 | BASE_URL fallback mismatch | LOW | app.spec.ts:3 | Change to https://localhost |
| B5 | Firefox login fails entirely | HIGH | Playwright Firefox | sessionStorage persistence bug |
| B6 | No composer.lock | MEDIUM | services/api/ | Run `composer install` and commit |
| B7 | No web lint/test in CI | MEDIUM | .github/workflows/ci.yml | Add web lint + test stages |
| B8 | No E2E stage in CI | MEDIUM | .github/workflows/ci.yml | Add Playwright E2E stage |
| B9 | No Semgrep SAST | LOW | .github/workflows/ci.yml | Add SAST scanning stage |
| B10 | Telescope MySQL noise | LOW | Laravel config | Disable Telescope in testing |

---

## 11. DECISION RECORD

| D# | Date | Decision | Rationale |
|----|------|----------|-----------|
| D001 | 05-04 | Monorepo (single repo) | Simpler CI/CD, shared config |
| D002 | 05-18 | Aquerii is THE main project | All repos are idea sources, not running services |
| D003 | 05-18 | InvenTree sidecar (MIT) | Best inventory tool with clean API |
| D004 | 05-18 | Excalidraw embed (MIT) | npm package, no separate service needed |
| D005 | 05-18 | pdfplumber for AI OCR | Already in Python deps, works with FastAPI |
| D006 | 05-18 | YetiForce rejected | PHP 7.4, MariaDB, no clean Docker |
| D007 | 05-18 | Twenty UI patterns stolen | AGPL-3.0 poison pill |
| D008 | 05-18 | aureuserp patterns used | Laravel module architecture reference |
| D009 | 05-21 | 3 developer groups | Parallel execution, clear ownership |
| D010 | 05-21 | Brutal testing after every feature | Prove guarantees, no regression |
| D011 | 05-21 | Add Laravel MCP (`laravel/mcp`) | AI-native module access via standardized MCP tools/resources |
| D012 | 05-21 | Add Playwright MCP for E2E debugging | AI drives live browser to diagnose failures, inspect console/network |
| D013 | 05-21 | Add Stripe MCP for billing operations | AI creates/manages subscriptions, products, refunds directly |
| D014 | 05-21 | Add GitHub MCP for CI/CD | AI automates PRs, code review, CI workflows from within agent |
| D015 | 05-21 | Add PostgreSQL MCP for performance | AI introspects schemas, detects N+1, recommends indexes |
| D016 | 05-21 | Add n8n sidecar for complex workflows | Complements Automation Engine for multi-step cross-system flows |
| D017 | 05-21 | MCP is additive, not replacing REST | SPA continues REST, AI agents use MCP — same auth/middleware |
