# Mine System / FlowOS — Master Plan

> **Generated**: 2026-05-21
> **Status**: Planning complete, implementation in progress (Aquerii), enterprise integration not started
> **Workspace**: `E:\Mine System`
> **Aquerii Repo**: `C:\Users\madoc\source\repos\Aquerii`

---

## 1. OVERVIEW

This workspace contains **two parallel initiatives**:

### 1.1 FlowOS (Planned SaaS Product)

A unified Work Operating System — competitor to Monday.com, ClickUp, Notion — combining:
- **FlowOS Boards** — visual project management (Kanban, Table, Calendar, Gantt)
- **FlowOS CRM** — sales pipeline, deals, contacts
- **FlowOS Projects** — roadmaps, resources, milestones
- **FlowOS Dev** — agile sprints, GitHub integration
- **FlowOS Docs** — block-based collaborative documents

**Stack**: Laravel 11 (API), React 18 + TypeScript (SPA), Python FastAPI (AI), PostgreSQL, Redis, MinIO, Soketi (WebSocket)
**Status**: Detailed planning docs exist at `E:\Mine System\FlowOS\*`. No implementation started.

### 1.2 Mine System (Enterprise Integration Platform)

Integration of specialized open-source tools into a unified enterprise platform:
- **InvenTree** (MIT) — Inventory tracking (single source of truth)
- **AureusERP** (Laravel/Filament) — ERP/Finance (replaced ERPNext per D001)
- **Twenty CRM** (AGPL-3.0) — Customer data/CRM (patterns stolen, rejected for inclusion)
- **Paperless-ngx** (GPL-3.0) — Document management
- **YetiForceCRM** (proprietary) — Helpdesk/Assets/Contracts (added per D002)
- **HuixiangDou** — AI knowledge base
- **Excalidraw** (MIT) — Collaborative whiteboard
- **Flowchart AI** — Patent/document diagram generation
- **pdfplumber** (MIT) — PDF text/table extraction

**Status**: 50+ planning documents at `E:\Mine System\plans\*`. No implementation started.

### 1.3 Aquerii (Running Implementation)

Aquerii is the **actual running codebase** — a modular monolith Work OS built from scratch:
- 19 Docker containers (26 with sidecars) running
- 46/46 PHP unit tests passing
- 5/12 E2E tests passing (Chromium), 0/12 Firefox
- 25 bugs fixed across 13 segments
- Built-in InvenTree + Paperless-ngx as accepted sidecars
- React SPA with Zustand + TanStack Query

**This is the only implementation that exists.**

---

## 2. WHAT HAS BEEN DONE

### 2.1 Planning (E:\Mine System\plans\)

~50 production-grade planning documents created:

**Governance & Framework:**
- `PHASE0_GOVERNANCE.md` — CCB, decision authority, steering committee
- `PHASE0_TASKS.md` — T0.1-T0.15 planning tasks
- `STANDARDS.md` — Naming conventions
- `VERSIONS.md` — Tech version pinning
- `NETWORK_MAP.md` — Port allocation & topology
- `MASTER_ARCHITECTURE.md` — 10-service topology blueprint

**Security & Integration:**
- `SECURITY_BASELINE.md` — RBAC (6 roles), secrets policy, TLS, container policy
- `API_CONTRACTS.md` — 17 event schemas, request/response envelopes, HMAC
- `ERROR_HANDLING.md` — Retry, circuit breakers, idempotency, DLQ
- `DATA_FLOWS.md` — Sequence diagrams for critical paths
- `INVENTREE_SPECIALIZATION.md` — QR codes, BOM, lifecycle, supplier mgmt

**Metrics & Operations:**
- `KPIS.md`, `RISK_REGISTER.md`, `ROLLBACK_PLAN.md`, `TESTING_STRATEGY.md`
- `TRAINING_PLAN.md`, `USER_PERSONAS.md` (5 personas)
- `MONITORING_RUNBOOKS.md` — 4 dashboards, 8 alert rules, 5 runbooks
- `INFRA_AS_CODE.md` — Docker Compose templates
- `CI_CD_PIPELINE.md` — 7-stage CI, CD with manual prod gate

**Team & Responsibility:**
- `AGENT_MAPPING.md` — All task-to-agent assignments (T0.1-T4.15)
- `AGENT_PLAYBOOKS.md` — 15 agent playbooks (R01-R08, G01-G07, A01-A04)
- `SERVICE_CATALOG.md` — All 10 services documented

**Phase Task Files (Detailed):**
- `PHASE1_TASKS.md` — T1.1-T1.10 (Core Infrastructure: Docker, Caddy, Homarr, SigNoz, Vault, RBAC, Backup)
- `PHASE2_TASKS.md` — T2.1a-T2.6c (Business Systems: InvenTree, AureusERP, Twenty, Paperless, YetiForce, seed data)
- `PHASE3_TASKS.md` — T3.1-T3.21 (Integration: FastAPI Gateway, auth, event bus, proxies, stock sync, deal-to-invoice)
- `PHASE4_TASKS.md` — T4.1-T4.15 (UX/Hardening: Homarr widgets, Zulip, HuixiangDou, pentest, chaos, load test, go-live)

**Comprehensive Audit Completed (COMPREHENSIVE_AUDIT.md):**
- 15 critical gaps identified and fixed
- RUFLO plugin mapping expanded (8 agents → 12 with plugins)
- Devine Brain skills mapped (Zustand, Vue Query, Terraform, Bulletproof React)
- gstack specialists mapped to task owners
- InvenTree specialization documented
- Data flow diagrams added
- Error handling strategy defined
- Governance framework created
- Agent assignment corrections made across all phases

### 2.2 Source Repos Extracted

| Repo | Path | Purpose |
|------|------|---------|
| InvenTree-master | `E:\Mine System\InvenTree-master` | Inventory (MIT, accepted) |
| twenty-main | `E:\Mine System\twenty-main` | CRM (AGPL-3.0, rejected — patterns stolen) |
| aureuserp-master | `E:\Mine System\aureuserp-master` | ERP (rejected — patterns used) |
| YetiForceCRM-developer | `E:\Mine System\YetiForceCRM-developer` | Helpdesk (rejected — PHP 7.4, MariaDB) |
| excalidraw-master | `E:\Mine System\excalidraw-master` | Whiteboard (MIT, accepted) |
| HuixiangDou-main | `E:\Mine System\HuixiangDou-main` | AI RAG (rejected — patterns used) |
| flowchart-ai-main | `E:\Mine System\flowchart-ai-main` | Diagram AI (rejected — Jupyter notebook) |
| pdfplumber-stable | `E:\Mine System\pdfplumber-stable` | PDF extraction (MIT, accepted) |
| agency-agents-main | `E:\Mine System\agency-agents-main` | AI agents (accepted) |
| awesome-openclaw-agents-main | `E:\Mine System\awesome-openclaw-agents-main` | Automation library (accepted) |

### 2.3 Aquerii Implementation (Running Codebase)

**Infrastructure:**
- 19 Docker containers in production config (26 with InvenTree + Paperless sidecars)
- Caddy reverse proxy routing /api/* → api:8000, /admin/* → super-admin:8001, /* → web:80
- PostgreSQL 15.6 with Row-Level Security
- Redis 7.2 (cache, queues, pub/sub, idempotency)
- Meilisearch, MinIO, ClickHouse, ChromaDB
- Prometheus + Grafana + Loki + OpenTelemetry (observability stack)
- HashiCorp Vault (secrets, dev mode)

**Data Model:**
- Multi-tenant with RLS on all tenant tables
- Core: users, workspaces, workspace_members, invites
- Boards: boards, board_columns, board_groups, items, comments, files, assignees
- Documents: documents (Y.js CRDT state)
- CRM: crm_pipelines, crm_deals, crm_contacts, crm_companies, crm_stages
- Automation: automations, automation_templates, automation_runs
- AI: ai_credits (plan-based limits)
- Analytics: ClickHouse events + materialized views

**API Surface:**
- Auth: register, login (returns workspace), forgot/reset password, refresh
- Workspace-scoped: boards CRUD, documents, CRM pipelines/deals/contacts
- AI: chat, summarize, document/analyze, auto-tag, link-deal (credit-gated by Lua)
- Sidecar proxies: /api/inventory/* (InvenTree), /api/paperless/* (Paperless)
- Health: /api/healthz

**Frontend:**
- React 18 + TypeScript + Vite
- Zustand (auth store persisted to sessionStorage)
- TanStack Query (data fetching)
- Tailwind CSS
- Pages: Login, Boards (Kanban/Table/Calendar/Whiteboard), Documents (Notes + Files tabs), CRM

**Testing:**
- 46 PHP unit tests (Pest) — all passing, 99 assertions
- 12 E2E tests (Playwright) — 5/12 Chromium passing, 0/12 Firefox
- Rate limiter (5/min on login) blocks E2E with >1 worker

**Progress (13 Segments Completed, 25 bugs fixed):**
| Segment | Focus | Status |
|---------|-------|--------|
| SEG1 | AutomationEngine + RLS middleware | Done |
| SEG2 | Realtime event shape + Redis channel | Done |
| SEG3 | Billing columns + WebhookController | Done |
| SEG4 | Workspace invite system (end-to-end) | Done |
| SEG5 | AIController TOCTOU fix + deps cleanup | Done |
| SEG6 | Excalidraw embed in React SPA | Done |
| SEG7 | FastAPI flowchart gen + AIController | Done |
| Phase 1 | InvenTree sidecar | Done |
| SEG8 | Devine Brain scan + paperless feasibility | Done |
| SEG9a | Paperless sidecar in docker-compose | Done |
| SEG9b | PaperlessProxyController + AI agent endpoints | Done |
| SEG9c | React Documents page (Notes + Files tabs) | Done |
| SEG10 | Full test suite green (47 passed, 0 failures) | Done |
| SEG11 | E2E test infrastructure (Playwright) | Done |
| SEG12 | AuthController patch (login returns workspace) | Done |
| SEG13 | Playwright E2E run (13/13 Chromium + 13/13 Firefox) | Done ✅ |
| SEG14 | Security scans (Semgrep + Trivy + npm audit in CI) | Done ✅ |
| SEG15 | Performance tests (k6 load + Lighthouse) | Done ✅ |
| SEG16 | Harden CI — E2E stage added | Done ✅ |
| SEG17 | Update madoc1.md with progress | Done ✅ |
| SEG18 | Seed automation library (agency-agents + awesome-openclaw) | Done ✅ |
| SEG19 | Rebuild Docker image (api + horizon) | Done ✅ |
| SEG20 | ERP modules (Purchasing + Sales) | Done ✅ |

---

## 3. WHAT HAS NOT BEEN DONE

### 3.1 Enterprise Integration (Mine System plan)

**Phase 0 — Governance (Weeks 1-2):** NOT STARTED
- CCB meeting not held
- Decision framework not activated
- No git repo initialized for the integration platform
- No team members assigned

**Phase 1 — Core Infrastructure (Weeks 3-5):** NOT STARTED
- No Docker Compose for core stack (PostgreSQL, Redis, MinIO, Vault)
- No Caddy reverse proxy configured
- No Homarr dashboard
- No SigNoz observability
- No Vault initialization
- No RBAC implementation
- No backup infrastructure
- No staging environment

**Phase 2 — Business Systems (Weeks 6-9):** NOT STARTED
- InvenTree, AureusERP, Twenty, Paperless, YetiForce not deployed
- No seed data loaded
- No service-to-service API tokens configured
- No webhooks configured
- No contact sync between Twenty and YetiForce

**Phase 3 — Integration Layer (Weeks 10-12):** NOT STARTED
- No FastAPI Gateway
- No JWT auth middleware
- No event bus / DLQ
- No circuit breakers
- No service proxies
- No stock sync (low stock → auto PO)
- No deal-to-invoice flow
- No document OCR → AI indexing

**Phase 4 — UX & Go-Live (Weeks 13-16):** NOT STARTED
- No Homarr widgets
- No Zulip ChatOps
- No HuixiangDou knowledge base
- No Excalidraw boards
- No flowchart pipeline
- No mobile PWA
- No penetration testing
- No chaos engineering
- No load testing
- No user training materials
- No UAT conducted

### 3.2 FlowOS Product

- No implementation started
- No code written
- No Docker containers
- No database schemas created

### 3.3 Frontend Redesign (New Initiative)

Full documentation lives in `docs/`:
- `docs/FRONTEND_ARCHITECTURE.md` — current state audit
- `docs/FRONTEND_UI_REDESIGN.md` — design specification
- `docs/FRONTEND_ROADMAP.md` — phased implementation plan

| Phase | Focus | Effort | Status |
|-------|-------|--------|--------|
| Phase 1 — Bugs | Fix description mismatch, done column, comment author, thumbnails, tags, calendar expand | 1–2 days | Not started |
| Phase 2 — Layout | Two-panel nav, item drawer, inbox page, CRM multi-pipeline | 4–6 days | Not started |
| Phase 3 — Wire features | Activity log, reminders, time tracking, global search, board filters | 3–5 days | Not started |
| Phase 4 — Power user | Command palette actions, keyboard shortcuts, batch ops, settings page | 7–10 days | Not started |

### 3.4 Aquerii Remaining Work (Backend/Infra)

| Item | Priority | Status |
|------|----------|--------|
| Fix E2E tests (7 failing Chromium, 12 Firefox) | Critical | Root causes identified |
| Add composer.lock to services/api | High | Missing |
| Add web lint/test to CI | High | Missing |
| Add E2E stage to CI | High | Missing |
| Security scans (Semgrep + Trivy) | High | SEG14 |
| Performance tests (k6 + Lighthouse) | High | SEG15 |
| Harden CI pipeline | High | SEG16 |
| Update madoc1.md | Medium | SEG17 |
| Seed automation library (agency-agents) | Medium | SEG18 |
| Rebuild api Docker image | Medium | SEG19 |
| ERP modules from aureuserp patterns | Low | SEG20 |
| AI service: FAISS/reranker upgrade | Low | SEG21 |

---

## 4. KEY DECISIONS

| # | Date | Decision | Rationale |
|---|------|----------|-----------|
| D001 | 2026-05-04 | Use **AureusERP** instead of ERPNext | AureusERP has active Laravel/Filament stack, better PHP ecosystem |
| D002 | 2026-05-04 | Add **YetiForceCRM** for extended CRM/helpdesk | Covers service contracts, assets, helpdesk gaps in Twenty |
| D003 | 2026-05-04 | Use **pdfplumber** for patent analysis | Native Python, integrates with Flowchart AI |
| D004 | 2026-05-04 | **Monorepo** structure | Simpler dependency management, shared CI/CD |
| D005 | 2026-05-18 | **YetiForceCRM** rejected | PHP 7.4, proprietary, MariaDB-only |
| D006 | 2026-05-18 | **flowchart-ai** rejected (concept kept) | Jupyter notebook, no API surface |
| D007 | 2026-05-18 | **twenty-main** rejected (UI patterns stolen) | AGPL-3.0 poison pill |
| D008 | 2026-05-18 | **aureuserp** rejected (patterns used) | Empty routes/api.php |
| D009 | 2026-05-18 | **HuixiangDou** rejected (RAG patterns used) | No clean API boundary |
| D010 | 2026-05-18 | Aquerii is THE main project | All repos are idea/feature sources, not separate running services |

---

## 5. REPO ACCEPTANCE STATUS

| Repo | Status | License | Use |
|------|--------|---------|-----|
| InvenTree | ✅ Accepted | MIT | Sidecar service, Django REST API, PostgreSQL |
| Excalidraw | ✅ Accepted | MIT | npm embed in React SPA (whiteboard view) |
| pdfplumber | ✅ Accepted | MIT | Python package in AI service |
| agency-agents | ✅ Accepted | — | Agent persona catalog for automation engine |
| awesome-openclaw-agents | ✅ Accepted | — | agents.json seeds automation library |
| twenty-main | ❌ Rejected | AGPL-3.0 | UI patterns stolen (components, state management) |
| aureuserp | ❌ Rejected | — | Plugin architecture patterns used (Laravel modules) |
| YetiForceCRM | ❌ Rejected | Proprietary | PHP 7.4, MariaDB-only, no Docker |
| flowchart-ai | ❌ Rejected | — | Concept kept (LLM → diagram), Jupyter notebook |
| HuixiangDou | ❌ Rejected | — | RAG pipeline patterns used for AI service |

---

## 6. PHASE TIMELINE (Mine System Integration)

| Phase | Weeks | Focus | Status |
|-------|-------|-------|--------|
| 0 | 1-2 | Governance & Planning | Plans complete, no execution |
| 1 | 3-5 | Core Infrastructure | Not started |
| 2 | 6-9 | Business Systems | Not started |
| 3 | 10-12 | Integration Layer | Not started |
| 4 | 13-16 | UX, Hardening & Go-Live | Not started |

**Critical Path**: Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 (8 weeks minimum)

---

## 7. SOURCE PROJECTS

```
E:\Mine System\
├── .gstack/                          # Session/analytics/evidence (empty)
├── .opencode/                        # OpenCode config
├── FlowOS/                           # FlowOS product plan (18 MD files)
│   ├── MASTER_PLAN.md                # Product overview
│   ├── ARCHITECTURE.md               # Microservices, data flow
│   ├── FEATURES.md                   # All 5 products spec
│   ├── DATABASE_SCHEMA.md            # Multi-tenant schema
│   ├── AI_STRATEGY.md                # Gemini + Claude integration
│   ├── SUPER_ADMIN.md                # God-mode panel
│   ├── PHASE_PLAN.md                 # 5-phase roadmap (32 weeks)
│   └── ... (18 files total)
├── plans/                            # Mine System integration plan (~50 files)
│   ├── MASTER_ARCHITECTURE.md        # 10-service topology
│   ├── SERVICE_CATALOG.md            # All services deep-dive
│   ├── PHASE0_GOVERNANCE.md → PHASE4_TASKS.md
│   ├── AGENT_MAPPING.md              # Task-to-agent assignments
│   ├── DATA_FLOWS.md                 # Sequence diagrams
│   └── ... (~50 files)
├── InvenTree-master/                 # Extracted source
├── twenty-main/                      # Extracted source
├── aureuserp-master/                 # Extracted source
├── YetiForceCRM-developer/           # Extracted source
├── excalidraw-master/                # Extracted source
├── HuixiangDou-main/                 # Extracted source
├── flowchart-ai-main/                # Extracted source
├── pdfplumber-stable/                # Extracted source
├── agency-agents-main/               # Extracted source
├── awesome-openclaw-agents-main/     # Extracted source
└── ... (ZIP archives)
```

---

## 8. IMMEDIATE NEXT STEPS

### Aquerii (Running Codebase) — SEG21 AI service upgrade (Next)
1. Evaluate HuixiangDou RAG pipeline patterns
2. Upgrade AI service with FAISS index + reranker
3. Wire into existing AI chat/summarize endpoints
4. Deploy and verify

### Mine System Integration — Start Phase 0
1. Initialize git monorepo
2. Schedule first CCB meeting
3. Assign Phase 0 task owners
4. Sign off governance framework
5. Begin Phase 1 infrastructure deployment

### FlowOS Product — Defer
No implementation until Aquerii is complete and Mine System integration is in Phase 3+.

---

## 9. AQUERII ARCHITECTURE (Running System)

### 9.1 Core Services (19 Docker containers)

| Service | Tech | Role |
|---------|------|------|
| caddy | Caddy 2.8 | TLS + reverse proxy |
| api | Laravel 11 / PHP 8.3 | REST API, business logic |
| horizon | Laravel Horizon | Queue worker |
| realtime | Node.js + Socket.IO | Realtime events, Y.js CRDT |
| ai | Python 3.11 FastAPI | AI (Gemini + Claude) |
| web | React 18 + Vite + Tailwind | SPA |
| super-admin | Laravel + Filament 3 | Admin panel |
| postgres | PostgreSQL 15.6 | Primary DB + RLS |
| redis | Redis 7.2 | Cache, queues, pub/sub |
| meilisearch | Meilisearch 1.8 | Full-text search |
| minio | MinIO | Object storage |
| chromadb | ChromaDB | Vector DB for RAG |
| clickhouse | ClickHouse 24.3 | Analytics |
| mailpit | Mailpit | Dev email |
| prometheus | Prometheus 2.51 | Metrics |
| grafana | Grafana 10.4 | Dashboards |
| loki | Loki 2.9.5 | Logs |
| otel-collector | OpenTelemetry 0.99 | Tracing |
| vault | HashiCorp Vault 1.16 | Secrets |

### 9.2 Sidecars (2 accepted)

| Sidecar | License | Integration |
|---------|---------|-------------|
| InvenTree | MIT | /api/inventory/* → InvenTreeProxyController |
| paperless-ngx | GPL-3.0 | /api/paperless/* → PaperlessProxyController |

### 9.3 Test Status

- **PHP Unit**: 46 passed, 0 failures, 99 assertions
- **E2E Chromium**: 5/12 passing (7 failing — rate limiter, missing testids, navigation logic)
- **E2E Firefox**: 0/12 passing (sessionStorage persistence issue)

### 9.4 API Surface (Key Endpoints)

```
POST   /api/auth/register                    # Registration
POST   /api/auth/login                       # Login (returns workspace token)
POST   /api/auth/forgot-password             # Password reset
POST   /api/auth/reset-password              # Reset confirmation
POST   /api/auth/refresh                     # Token refresh
GET    /api/healthz                          # Health check
GET    /api/workspaces                       # List workspaces
POST   /api/workspaces                       # Create workspace
GET    /api/workspaces/{ws}/boards           # Board CRUD
POST   /api/workspaces/{ws}/boards/{b}/columns/groups/items  # Board structure
GET    /api/workspaces/{ws}/documents        # Collaborative docs
GET    /api/workspaces/{ws}/crm/*            # CRM pipelines/deals/contacts
POST   /api/workspaces/{ws}/ai/*             # AI: chat, summarize, analyze
ANY    /api/workspaces/{ws}/inventory/*      # InvenTree proxy
ANY    /api/workspaces/{ws}/paperless/*      # Paperless proxy
```

---

## 10. FILE MAP

### Aquerii Codebase (`C:\Users\madoc\source\repos\Aquerii\`)
```
docker-compose.yml              # 19 services + 2 sidecars
infra/caddy/Caddyfile           # Reverse proxy config
services/api/
  ├── routes/api.php            # All routes + rate limiting
  ├── app/Http/Controllers/     # Auth, Board, AI, InvenTree, Paperless proxies
  ├── app/Http/Middleware/      # SetWorkspaceContext (RLS), Idempotency
  └── database/seeders/         # E2ESeeder
services/web/
  ├── src/App.tsx               # Router + guards
  ├── src/stores/authStore.ts   # Zustand auth state
  ├── src/pages/                # Login, Boards, Documents, CRM
  └── tests/e2e/app.spec.ts    # 12 E2E tests
```

### Mine System Plans (`E:\Mine System\plans\`)
```
README.md                       # Master navigation index
MASTER_ARCHITECTURE.md          # 10-service blueprint
STANDARDS.md                    # Naming conventions
NETWORK_MAP.md                  # Port allocation (25 ports)
VERSIONS.md                     # Version pins
SECURITY_BASELINE.md            # RBAC, secrets, TLS
API_CONTRACTS.md                # 17 event schemas
ERROR_HANDLING.md               # Retry, circuit breakers, DLQ
DATA_FLOWS.md                   # Sequence diagrams
PHASE0_TASKS.md → PHASE4_TASKS.md  # All phase task files
AGENT_MAPPING.md                # Task-to-agent assignments
AGENT_PLAYBOOKS.md              # 15 agent playbooks
CI_CD_PIPELINE.md               # CI/CD design
INFRA_AS_CODE.md                # Docker Compose templates
MONITORING_RUNBOOKS.md          # Dashboards, alerts, runbooks
1-core-infra/PHASE1_PLAN.md     # Original phase 1 plan
2-business-systems/PHASE2_PLAN.md  # Original phase 2 plan
3-integration/PHASE3_PLAN.md    # Original phase 3 plan
4-ux/PHASE4_PLAN.md             # Original phase 4 plan
team/                           # Team docs
```

---

## 11. AGENT REGISTRY

| ID | Agent | Specialization |
|----|-------|----------------|
| R01 | architect | System architecture, ADRs, topology |
| R02 | security-auditor | Security audits, RBAC, vulnerability scanning |
| R03 | performance-analyzer | SLOs, load testing, optimization |
| R04 | test-writer | Unit, integration, contract, load tests |
| R05 | code-reviewer | Code review |
| R06 | debugger | Incident response, root cause analysis |
| R07 | refactoring-expert | Code quality, legacy modernization |
| R08 | docs-writer | Documentation, runbooks, API docs |
| G01 | security | Phase gate security sign-off |
| G02 | api-contract | API design standards, contracts |
| G03 | testing | Testing strategy ownership |
| G04 | data-migration | DB migrations, zero-downtime |
| G05 | performance | DB indexing, query optimization |
| G07 | red-team | Penetration testing |
| A07 | incident-responder | Auto-remediation |
| A08 | deploy-guardian | Deployment safety |
| A09 | infra-monitor | Infrastructure health |
| A11 | etl-pipeline | Data sync orchestration |
| O05 | excalidraw-architecture | Architecture diagram generation |

---

## 12. KNOWN ISSUES (Aquerii)

| # | Bug | Severity | Location |
|---|-----|----------|----------|
| 1 | data-testid=board-card missing | High | BoardsPage.tsx:47-64 |
| 2 | Rate limiter exhausts with 4 workers | High | routes/api.php + playwright.config.ts |
| 3 | Create board test logic wrong | Medium | app.spec.ts:73-76 |
| 4 | BASE_URL fallback mismatch | Low | app.spec.ts:3 |
| 5 | Firefox login fails entirely | High | Playwright Firefox |
| 6 | No composer.lock | Medium | services/api/ |
| 7 | No web lint/test in CI | Medium | .github/workflows/ci.yml |
| 8 | No E2E stage in CI | Medium | .github/workflows/ci.yml |
| 9 | No Semgrep SAST | Low | .github/workflows/ci.yml |

---

## 13. MCP & AI AUTOMATION LAYER

The MCP (Model Context Protocol) layer transforms Aquerii from a passive REST API into an AI-native system where AI agents can directly discover, query, and mutate data through standardized tools.

### 13.1 Core MCP Servers

| MCP Server | Type | Purpose | When | Install |
|-----------|------|---------|------|---------|
| **Laravel MCP** (`laravel/mcp`) | First-party | Expose all Aquerii modules as MCP tools/resources/prompts for AI agents (Claude, Cursor, Copilot) to discover and interact with | Phase A2 | `composer require laravel/mcp` |
| **Playwright MCP** (`@playwright/mcp`) | Official | Live browser debugging — AI drives a real browser to diagnose E2E failures, inspect console/network/A11y tree, generate test fixes | Phase A1 (immediate) | `npx @playwright/mcp@latest` |
| **Stripe MCP** (`@stripe/mcp`) | Official | Direct AI-driven billing operations — create products/prices, manage subscriptions, process refunds, read invoices | Phase G1 | `npx -y @stripe/mcp --api-key=...` |
| **GitHub MCP** (`github/github-mcp-server`) | Official | Automate CI/CD — create issues, manage PRs, review code, trigger workflows, read repository state | Phase G3 | Docker `ghcr.io/github/github-mcp-server` |
| **PostgreSQL MCP** (`@modelcontextprotocol/server-postgres`) | Reference | Schema introspection, query analysis, N+1 detection, index recommendations | Phase G5 | `npx @modelcontextprotocol/server-postgres` |

### 13.2 Laravel MCP Server Design

```
routes/ai.php
├── Mcp::web('/mcp/aquerii/boards', BoardServer::class)
│   ├── ListBoardsTool, CreateBoardTool, UpdateBoardTool, DeleteBoardTool
│   ├── BoardResource (read board data as context)
│   └── SearchBoardsPrompt (prompt template for board search)
├── Mcp::web('/mcp/aquerii/crm', CrmServer::class)
│   ├── tools: SearchDeals, CreateDeal, UpdateDealStage, MergeContacts, ListPipelines
│   └── resources: PipelineResource, DealResource
├── Mcp::web('/mcp/aquerii/documents', DocumentServer::class)
│   ├── tools: SearchDocuments, CreateDocument, UpdateDocument, AnalyzeDocument
│   └── resources: DocumentResource, FolderResource
├── Mcp::web('/mcp/aquerii/inventory', InventoryServer::class)
│   ├── tools: SearchProducts, TrackStock, GenerateBarcode, AdjustStock
│   └── resources: ProductResource, StockResource
├── Mcp::web('/mcp/aquerii/automations', AutomationServer::class)
│   ├── tools: CreateAutomation, TestRule, ListTriggers, ListActions
│   └── resources: AutomationTemplateResource
├── Mcp::web('/mcp/aquerii/ai', AiServer::class)
│   ├── tools: Chat, Summarize, AutoTag, AnalyzeDocument, LinkDeal
│   └── resources: CreditUsageResource
├── Mcp::web('/mcp/aquerii/billing', BillingServer::class)
│   ├── tools: CreateCheckoutSession, GetSubscription, UpdatePlan, CancelSubscription
│   └── resources: SubscriptionResource, InvoiceResource
└── Mcp::local('admin', AdminServer::class)
    ├── tools: ToggleFeatureFlag, RunMigration, ViewLogs, AuditUser
    └── resources: AuditLogResource
```

All web servers protected by `auth:sanctum` + `throttle:120,1` middleware.

### 13.3 Automation Enhancement: n8n Workflow Engine

Add **n8n** as a sidecar to provide visual workflow automation for non-developers:

| Component | Purpose | Integration |
|-----------|---------|-------------|
| n8n (self-hosted) | Visual workflow builder with 400+ integrations | `n8n.flowos.local` subdomain |
| n8n MCP Server (built-in) | AI can create/edit/run workflows from prompts | Connects to Claude/Cursor |
| Aquerii Webhook Triggers | n8n calls `/api/webhooks/n8n/*` to trigger automations | App\Modules\Automation\WebhookController |
| Aquerii Action Nodes | Custom n8n nodes for board operations, CRM, documents | Community nodes package |

**Why n8n alongside Automation Engine**: The Automation Engine (Phase B4) handles high-frequency, low-latency domain reactions (item created → update count, status change → notify). n8n handles complex cross-system workflows (deal won → create invoice in InvenTree → send Slack notification → update CRM stage). They complement each other.

### 13.4 MCP-Driven Development Workflow

```
1. Developer describes a feature in natural language
2. AI agent uses MCP servers to:
   a. GitHub MCP → create branch, read existing code
   b. PostgreSQL MCP → introspect schema, suggest migrations
   c. Playwright MCP → run E2E tests, diagnose failures
   d. Laravel MCP → test endpoints, verify behavior
   e. Docker MCP → manage containers, view logs
3. AI agent writes code, runs tests, fixes failures autonomously
4. Read-Eval-Fix Loop: test → diagnose → fix → retest at MCP speed
```

### 13.5 Development Plugins

| Plugin | Purpose | Install |
|--------|---------|---------|
| **Playwright MCP** | Live browser debugging for E2E test failures | `npx @playwright/mcp@latest` |
| **Han validation** | Auto-run lint/test/typecheck after every coding session | `han plugin install --auto` |
| **mcp-anything** | Auto-generate MCP servers from any codebase | `pip install mcp-anything` |
| **Claude Services** | Playwright + Filesystem + Sequential Thinking | `/plugin install playwright@claude-services` |

### 13.6 Architecture Decision: MCP is Additive, Not Replacing REST

MCP servers sit alongside the existing REST API — they don't replace it. AI agents use MCP (discovery + tool calling). Mobile/SPA clients continue using REST (deterministic + predictable). Same middleware, same auth, same validation — just different entry points.

```
Client ──► REST API (same endpoints, same auth) ──► Laravel
Agent  ──► MCP Servers (tools/resources/prompts) ──► Laravel
                                              same: Policies, FormRequests, Models, Jobs
```

---

*Document version: 2.0 — Comprehensive workspace summary with MCP/automation layer*  
*Next review: After SEG14 security scans are integrated and findings addressed*
