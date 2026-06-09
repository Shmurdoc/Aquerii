# FlowOS — System Architecture

**Version**: 1.0  
**Status**: AUTHORITATIVE  
**Owner**: Lead Architect

---

## 1. Architecture Overview

FlowOS is a **multi-tenant SaaS platform** built on a microservices architecture. Every company that signs up gets their own isolated **workspace** (tenant). All tenants share infrastructure but their data is strictly isolated via PostgreSQL Row-Level Security (RLS) and tenant-scoped API keys.

### Architecture Principles

1. **Tenant isolation is absolute** — no SQL query can return data from another tenant; enforced at DB level via RLS
2. **Real-time is first-class** — every state change fans out via WebSocket to all connected clients in < 200ms
3. **AI is ambient** — Gemini/Claude enhance every feature; never a separate "AI mode"
4. **Storage is metered** — every file upload tracked against tenant storage quota; enforce at write time
5. **Automations are metered** — every automation execution counted; enforce at trigger time
6. **The Super Admin sees everything** — platform owner has read access to all tenants, all metrics, all transactions
7. **Events are the source of truth** — all state changes emit events to ClickHouse for analytics and audit

---

## 2. High-Level System Diagram

```
                          ┌─────────────────────────────────────────────┐
                          │              CLIENTS                         │
                          │  React SPA │ PWA (offline) │ React Native   │
                          └─────────────────┬───────────────────────────┘
                                            │ HTTPS / WSS
                          ┌─────────────────▼───────────────────────────┐
                          │         CADDY (TLS termination)              │
                          │      Reverse proxy + rate limiting           │
                          └──┬──────────────┬──────────────┬────────────┘
                             │              │              │
              ┌──────────────▼──┐  ┌────────▼────────┐  ┌▼────────────────┐
              │  Laravel API    │  │ Node.js Realtime │  │ Super Admin     │
              │  (REST+GraphQL) │  │ (Socket.IO)      │  │ (Filament)      │
              └──────┬──────────┘  └────────┬─────────┘  └────────────────┘
                     │                      │
         ┌───────────┼──────────────────────┤
         │           │                      │
┌────────▼──┐  ┌─────▼──────┐  ┌───────────▼──────────┐
│ PostgreSQL│  │   Redis     │  │  Python AI Service   │
│ (RLS)     │  │ (cache/     │  │  (Gemini + Claude)   │
│           │  │  queues/    │  └──────────────────────┘
└───────────┘  │  pub/sub)   │
               └─────────────┘
         ┌──────────┬───────────┬──────────┐
         │          │           │          │
┌────────▼──┐ ┌─────▼────┐ ┌───▼───┐ ┌────▼──────────┐
│ Meilisearch│ │ MinIO    │ │ Click │ │ SigNoz (OTel) │
│ (search)  │ │ (files)  │ │ House │ │ (observability│
└───────────┘ └──────────┘ └───────┘ └───────────────┘
```

---

## 3. Service Definitions

### 3.1 Laravel API Service (`services/api/`)

**Language**: PHP 8.3  
**Framework**: Laravel 11  
**Responsibilities**:
- All business logic (boards, tasks, docs, CRM, projects)
- Multi-tenant data access (enforces RLS + tenant scoping)
- Authentication (JWT + OAuth: Google, GitHub, Microsoft)
- Authorization (RBAC per workspace)
- Billing integration (Stripe + PayFast webhook handling)
- Storage quota enforcement
- Automation engine execution (trigger → action pipeline)
- GraphQL API (using Lighthouse PHP)
- REST API for mobile + external integrations
- File upload handling (streams to MinIO)
- Background job dispatch to Laravel Horizon

**Source repos used**: `aureuserp-master/` (plugin architecture, billing, projects, analytics), `YetiForceCRM-developer/` (workflow engine, notification system), `twenty-main/` (CRM modules, activity tracking)

**Key Laravel Packages**:
- `laravel/sanctum` — API token auth
- `nuwave/lighthouse` — GraphQL
- `spatie/laravel-permission` — RBAC
- `spatie/laravel-multitenancy` — tenant isolation
- `laravel/horizon` — queue dashboard
- `laravel/telescope` — local debugging
- `stripe/stripe-php` — Stripe SDK
- `league/flysystem-aws-s3-v3` — MinIO/S3 file storage
- `laravel/scout` + Meilisearch driver — full-text search

---

### 3.2 Node.js Realtime Service (`services/realtime/`)

**Language**: TypeScript  
**Runtime**: Node.js 20 LTS  
**Framework**: Fastify + Socket.IO  
**Responsibilities**:
- WebSocket connection management (thousands of concurrent connections)
- Room management: workspace rooms, board rooms, document rooms
- Live cursors (user presence with position broadcast)
- Real-time task updates fan-out (task moved, renamed, status changed)
- Document collaborative editing (CRDT-based operational transforms via Y.js)
- Typing indicators ("Alex is typing...")
- Online presence tracking (who is online per workspace)
- Subscribes to Redis pub/sub channels (Laravel publishes here, Realtime fans out)

**Source repos used**: `excalidraw-master/` (multiplayer WebSocket patterns), `Kojit` (live cursors, presence indicators), `twenty-main/src/modules/sse-db-event/` (SSE patterns)

**Key Packages**:
- `socket.io` — WebSocket server
- `ioredis` — Redis pub/sub subscriber
- `yjs` — CRDT for collaborative document editing
- `y-websocket` — Y.js WebSocket provider
- `@fastify/websocket` — WebSocket adapter

---

### 3.3 Python AI Service (`services/ai/`)

**Language**: Python 3.11  
**Framework**: FastAPI  
**Responsibilities**:
- Gemini API calls (task descriptions, subtask generation, status summaries, auto-labels)
- Claude API calls (document analysis, long-form summaries, complex automation generation)
- AI credit metering (count tokens consumed per workspace per month)
- RAG pipeline (workspace-scoped knowledge base via HuixiangDou patterns)
- Flowchart generation from documents (pdfplumber → flowchart-ai pipeline)
- AI agent orchestration (project manager agent, CRM agent, support desk agent)
- Background AI tasks via Celery workers
- Prompt management and versioning

**Source repos used**: `HuixiangDou-main/` (RAG backend, message queue, scheduler), `flowchart-ai-main/` (GenFlowchart.py pipeline), `agency-agents-main/` + `awesome-openclaw-agents-main/` (agent personas)

**Key Packages**:
- `google-generativeai` — Gemini SDK
- `anthropic` — Claude SDK
- `langchain` — AI chain orchestration
- `celery` — async AI task queue
- `chromadb` — vector store for RAG
- `pdfplumber` — PDF parsing
- `fastapi` — API server

---

### 3.4 Laravel Horizon Workers (`services/worker/`)

**Responsibilities**:
- Execute automation rules (trigger → condition → action)
- Send email notifications
- Send push notifications (Firebase FCM)
- Process file uploads (virus scan, thumbnail generation, text extraction)
- Sync GitHub commits to boards (Multiboard-style)
- Dispatch AI tasks to Python AI service
- Run scheduled reports
- Storage quota recalculation
- Automation run counter increment

**Queues**:
- `critical` — auth tokens, billing webhooks (highest priority)
- `high` — automation execution, notifications
- `default` — file processing, AI tasks
- `low` — analytics, search indexing, report generation

---

### 3.5 Super Admin Panel (`superadmin/`)

**Framework**: Laravel + Filament 3  
**Access**: Only you (platform owner). URL: `admin.flowos.app`  
**Full specification in SUPER_ADMIN.md**

---

### 3.6 Meilisearch (`services/search/`)

**Searchable entities**: tasks, boards, documents, contacts, deals, comments, files  
**Per-tenant index isolation**: each tenant gets prefixed index (`tenant_{id}_tasks`)  
**Sync**: Laravel Scout observer triggers re-index on every save  
**Autocomplete**: < 50ms response for all search queries

---

## 4. Multi-Tenancy Architecture

### Tenant Model

```
Organization (Tenant)
├── workspace_id: UUID (primary isolation key)
├── plan: free|basic|standard|pro|enterprise
├── storage_quota_bytes: bigint
├── storage_used_bytes: bigint (live counter)
├── automations_quota: int (per month)
├── automations_used: int (resets monthly)
├── ai_credits_quota: int (per month)
├── ai_credits_used: int (resets monthly)
└── custom_domain: string|null
```

### Row-Level Security (PostgreSQL RLS)

Every table that contains tenant data has:
```sql
-- Applied to ALL data tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tasks
  USING (workspace_id = current_setting('app.workspace_id')::uuid);

-- Set at the start of every DB session
SET app.workspace_id = '{workspace_id}';
```

This means: even if a bug in application code queries without a WHERE clause, the DB returns zero rows for other tenants. It is impossible to leak data.

### Tenant Resolution

1. Request arrives at Caddy
2. Laravel middleware reads JWT → extracts `workspace_id`
3. Laravel sets PostgreSQL session variable: `SET app.workspace_id = ?`
4. All queries automatically scoped — no `WHERE workspace_id = ?` needed in app code
5. Super Admin bypasses RLS with a special `superadmin` DB role

---

## 5. Authentication & Authorization

### Auth Methods
- **Email + Password** (Argon2id hashing)
- **Magic Link** (passwordless, expires in 15min)
- **OAuth**: Google, GitHub, Microsoft (Azure AD)
- **SSO/SAML** (Enterprise plan only)
- **2FA**: TOTP (Google Authenticator) + SMS (Twilio)

### JWT Structure
```json
{
  "sub": "user_id",
  "workspace_id": "uuid",
  "role": "owner|admin|member|guest|viewer",
  "plan": "pro",
  "exp": 1234567890
}
```

### RBAC Roles (per workspace)
| Role | Capabilities |
|------|-------------|
| `owner` | All actions + billing + delete workspace |
| `admin` | All actions + manage members |
| `member` | Create/edit/delete items they can access |
| `guest` | Limited access to specific boards only (external) |
| `viewer` | Read-only on assigned boards |

---

## 6. Storage Architecture

### Storage Quota Enforcement

```
File Upload Request
    ↓
Check: workspace.storage_used + file.size <= workspace.storage_quota
    ↓
If over quota → 402 Payment Required (upgrade or add storage)
    ↓
Upload to MinIO → add file.size to storage_used (atomic)
    ↓
Emit storage.updated event → recalculate storage widget
```

### File Storage Layout in MinIO
```
bucket: flowos-files
└── {workspace_id}/
    ├── attachments/
    │   └── {board_id}/{task_id}/{filename}
    ├── documents/
    │   └── {doc_id}/{filename}
    ├── avatars/
    │   └── {user_id}/avatar.webp
    └── exports/
        └── {date}/{export_id}.csv
```

---

## 7. Real-Time Architecture

### Event Flow

```
User drags task to new column
    ↓
React frontend → REST PATCH /tasks/{id}/status
    ↓
Laravel API → updates DB → publishes to Redis channel:
  board:{board_id}:task_updated → {task_id, column_id, moved_by}
    ↓
Node.js Realtime → receives from Redis
    ↓
Emits to Socket.IO room: board:{board_id}
    ↓
All connected clients in that room receive update → React re-renders
```

### Collaborative Document Editing (Y.js CRDT)

```
User types in document
    ↓
Y.js captures operation (insert at position X: "hello")
    ↓
y-websocket broadcasts to all peers in doc room
    ↓
All clients apply CRDT merge (conflict-free)
    ↓
Laravel persists final document state every 5 seconds
```

---

## 8. Automation Engine Architecture

### Automation Structure

```
Automation
├── trigger: {type, conditions}
├── filters: [{field, operator, value}]
└── actions: [{type, config}]
```

### Supported Triggers
- Item status changes to X
- New item created in board
- Due date arrives
- Column value changes
- Item assigned to person
- Form submitted
- GitHub commit pushed to branch
- Time-based (every day/week/month at HH:MM)
- Webhook received (external)
- AI detects pattern (Pro+ only)

### Supported Actions
- Change item status/column value
- Assign to person
- Send notification (in-app / email / Slack / webhook)
- Create new item in board
- Move item to board
- Create subtask
- Send email to contact
- Update CRM deal stage
- Call webhook (custom URL)
- Run AI action (generate summary, suggest next steps)
- Create invoice in FlowOS CRM

### Automation Metering
```
On every automation execution:
    1. Increment workspace.automations_used (atomic Redis counter)
    2. Check automations_used <= automations_quota
    3. If over quota → pause automation + notify owner + offer upgrade
    4. Monthly cron resets automations_used = 0
```

---

## 9. Network Topology

### Docker Networks
```
core_network       → PostgreSQL, Redis, MinIO, Vault, Meilisearch, ClickHouse
app_network        → Laravel API, Node.js Realtime, Python AI, Workers, Super Admin
monitoring_network → SigNoz, otel-collector
dmz_network        → Caddy only
```

### Port Allocation

| Service | Internal Port | External (via Caddy) |
|---------|--------------|---------------------|
| Laravel API | 8000 | api.flowos.app |
| Node.js Realtime | 3001 | ws.flowos.app |
| Python AI | 8001 | (internal only) |
| Super Admin | 8002 | admin.flowos.app |
| React Frontend | 3000 (dev) | flowos.app |
| PostgreSQL | 5432 | (internal only) |
| Redis | 6379 | (internal only) |
| MinIO | 9000 | files.flowos.app (pre-signed URLs) |
| Meilisearch | 7700 | (internal only) |
| ClickHouse | 8123 | (internal only) |
| SigNoz | 3301 | monitoring.flowos.app |
| Vault | 8200 | (internal only) |

---

## 10. Observability

### Metrics (Prometheus via SigNoz)

| Metric | Type | Description |
|--------|------|-------------|
| `flowos_http_requests_total` | counter | All API requests by endpoint + status |
| `flowos_http_duration_seconds` | histogram | P50/P95/P99 per endpoint |
| `flowos_ws_connections_active` | gauge | Active WebSocket connections |
| `flowos_automation_executions_total` | counter | By workspace + result |
| `flowos_ai_tokens_consumed_total` | counter | By workspace + model |
| `flowos_storage_used_bytes` | gauge | By workspace |
| `flowos_tenant_count_total` | gauge | Total tenants by plan |
| `flowos_mrr_usd` | gauge | Monthly recurring revenue (from billing events) |
| `flowos_file_uploads_total` | counter | By workspace |
| `flowos_search_queries_total` | counter | Total search queries |

### SLOs
- API P99 latency < 500ms
- WebSocket message delivery < 200ms
- Search query response < 50ms
- Automation execution < 10s
- AI response (Gemini Flash) < 5s
- File upload (< 10MB) < 3s
- Uptime: 99.9% monthly

---

*Owner: Lead Architect*  
*Cross-reference: MASTER_PLAN.md, DATABASE_SCHEMA.md, REALTIME.md*
