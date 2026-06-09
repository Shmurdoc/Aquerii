# FlowOS — High-Level Architecture

**Version**: 1.0  
**Status**: AUTHORITATIVE — all team leads derive from this document  
**Owner**: Lead Architect  
**Last reviewed**: 2026-05-05  

> This is the single source of architectural truth. Every service, every data flow, every technology decision in this project is traceable back to a principle stated here. If something contradicts this document, this document wins. Change requests require Tech Lead + SRE Lead sign-off.

---

## 1. System Map

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                              FLOWOS SYSTEM MAP                                   ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║   ┌───────────────────────────────────────────────────────────┐                  ║
║   │                      CLIENT LAYER                          │                  ║
║   │                                                            │                  ║
║   │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │                  ║
║   │  │  React SPA   │  │  PWA/Offline │  │ React Native   │  │                  ║
║   │  │  (Vite+TS)   │  │ (ServiceWorker│  │ (Expo SDK 51)  │  │                  ║
║   │  │              │  │  IndexedDB)  │  │                │  │                  ║
║   │  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │                  ║
║   └─────────┼─────────────────┼──────────────────┼───────────┘                  ║
║             │                 │                  │                               ║
║             │     HTTPS / WSS (TLS 1.3)          │                               ║
║             │                                    │                               ║
║   ┌─────────▼────────────────────────────────────▼───────────┐                  ║
║   │              CADDY (TLS termination + Reverse Proxy)       │                  ║
║   │                                                            │                  ║
║   │  Route: api.flowos.app   → Laravel API :8000              │                  ║
║   │  Route: rt.flowos.app    → Realtime Service :3001         │                  ║
║   │  Route: admin.flowos.internal → Super Admin :8001         │                  ║
║   │  Route: flowos.app       → Static SPA assets              │                  ║
║   │                                                            │                  ║
║   │  Rate limiting (IP): 1000 req/min general                  │                  ║
║   │  Rate limiting (IP): 10 req/min on /auth/*                 │                  ║
║   └──────────────────────────┬─────────────────────────────────┘                  ║
║                              │                                                   ║
║         ┌────────────────────┼────────────────────┐                             ║
║         │                   │                    │                             ║
║  ┌──────▼──────┐   ┌────────▼───────┐   ┌───────▼────────┐                     ║
║  │ Laravel API │   │ Node Realtime  │   │  Super Admin   │                     ║
║  │ (PHP 8.3)   │   │ (Node 20 LTS)  │   │  (Filament 3)  │                     ║
║  │ Port 8000   │   │ Port 3001      │   │  Port 8001     │                     ║
║  │             │   │                │   │                │                     ║
║  │ REST API    │   │ Socket.IO      │   │ Internal only  │                     ║
║  │ Auth/RBAC   │   │ Y.js CRDT      │   │ VPN + MFA req  │                     ║
║  │ Business    │   │ Presence       │   │ DB role:       │                     ║
║  │ logic       │   │ Pub/Sub bridge │   │ superadmin     │                     ║
║  │ Queue       │   │                │   │ (bypasses RLS) │                     ║
║  │ dispatch    │   └────────┬───────┘   └────────────────┘                     ║
║  └──────┬──────┘            │                                                   ║
║         │                   │                                                   ║
║  ┌──────▼──────┐            │                                                   ║
║  │ Python AI   │            │                                                   ║
║  │ (FastAPI)   │            │                                                   ║
║  │ Port 8002   │            │                                                   ║
║  │             │            │                                                   ║
║  │ Gemini Flash│            │                                                   ║
║  │ Gemini Pro  │            │                                                   ║
║  │ Claude 3.5  │            │                                                   ║
║  │ RAG/ChromaDB│            │                                                   ║
║  │ Flowchart   │            │                                                   ║
║  └──────┬──────┘            │                                                   ║
║         │                   │                                                   ║
║  ═══════════════════════════════════════════════════════════════                 ║
║                   SHARED INFRASTRUCTURE LAYER                                    ║
║  ═══════════════════════════════════════════════════════════════                 ║
║         │                   │                                                   ║
║  ┌──────▼──────┐   ┌────────▼────────┐                                          ║
║  │ PostgreSQL  │   │     Redis 7.2   │                                          ║
║  │ 15.6        │   │                 │                                          ║
║  │             │   │ • Pub/Sub       │                                          ║
║  │ Primary     │   │ • Queue backend │                                          ║
║  │ + Replica   │   │ • Cache         │                                          ║
║  │             │   │ • Idempotency   │                                          ║
║  │ RLS on ALL  │   │ • Quota atomic  │                                          ║
║  │ tenant tbls │   │   counters      │                                          ║
║  │             │   │ • Session store │                                          ║
║  └──────┬──────┘   └─────────────────┘                                          ║
║         │                                                                        ║
║  ┌──────▼──────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐             ║
║  │ Meilisearch │  │ MinIO/R2   │  │ ClickHouse │  │ SigNoz (OTel)│             ║
║  │ (search)    │  │ (files)    │  │ (analytics)│  │ + Prometheus │             ║
║  │             │  │            │  │            │  │ + Grafana    │             ║
║  │ Per-tenant  │  │ Per-tenant │  │ Events +   │  │ + Loki       │             ║
║  │ index prefix│  │ bucket     │  │ analytics  │  │              │             ║
║  └─────────────┘  └────────────┘  └────────────┘  └──────────────┘             ║
║                                                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Ten Architecture Principles

Every design decision must satisfy these. If it violates one, reject or escalate.

| # | Principle | What it means in practice |
|---|-----------|--------------------------|
| 1 | **Tenant isolation is absolute** | PostgreSQL RLS on every tenant table. No query can leak data across workspaces. Enforced at DB level — app bugs cannot bypass it. |
| 2 | **PostgreSQL is the source of truth** | Redis, Meilisearch, ClickHouse, ChromaDB are derived. They can be rebuilt from PostgreSQL. Business logic reads from PostgreSQL only. |
| 3 | **Writes are always idempotent** | Every POST/PUT/PATCH/DELETE accepts an Idempotency-Key. Retrying any write is always safe. |
| 4 | **Real-time is first-class** | Every state change fans out to all connected clients via Socket.IO. Target: < 200ms from DB write to client delivery. |
| 5 | **Failures degrade gracefully** | AI service down → AI features disabled, product continues. Meilisearch down → search returns empty, product continues. Nothing kills the entire product. |
| 6 | **Secrets never in code or environment files** | All secrets from HashiCorp Vault. `.env` files in production contain only Vault address and token. |
| 7 | **Every deploy is zero-downtime** | Rolling updates. DB migrations are always backwards-compatible. No deploys require maintenance windows. |
| 8 | **Observability before launch** | Every service is fully instrumented (traces, metrics, logs) before it ships. Alerts are tested. Runbooks are written and drilled. |
| 9 | **Security is structural, not procedural** | Auth enforced by middleware. Permissions enforced by Policies. Tenant isolation enforced by RLS. Not by developer discipline. |
| 10 | **Nothing ships without tests** | Unit ≥ 80%, integration on every endpoint, E2E on every critical path, contract tests for every integration. CI blocks merge on failure. |

---

## 3. Technology Decisions Registry

| Decision | Choice | Alternatives considered | Reason |
|----------|--------|------------------------|--------|
| Backend language | PHP 8.3 / Laravel 11 | Node.js, Python, Go | Strong ORM, Eloquent, Filament ecosystem, team expertise, source repos |
| Realtime | Node.js + Socket.IO | Laravel Reverb, Pusher, Ably | Control, cost, Y.js integration, horizontal scale via Redis adapter |
| AI service | Python FastAPI | Laravel AI packages | Python ecosystem for ML/AI is unmatched; isolates AI dependency churn |
| Database | PostgreSQL 15.6 | MySQL, CockroachDB | RLS support, JSONB, pgvector future, maturity |
| Column values | `JSONB` on items table | EAV table, separate column tables | Flexible, GIN-indexed, performant for mixed types |
| Document editor | BlockNote | TipTap, Quill, ProseMirror | React-native, extensible, BlockNote AI extensions exist |
| Collaborative editing | Y.js CRDT | Operational Transform | Conflict-free, offline-first, robust library ecosystem |
| Search | Meilisearch | Elasticsearch, Typesense | Self-hosted, fast, typo-tolerant, per-tenant index isolation |
| File storage | MinIO / Cloudflare R2 | AWS S3 | Self-hosted option for cost; R2 for egress-free CDN delivery |
| AI models | Gemini Flash + Gemini Pro + Claude 3.5 | OpenAI GPT-4 | Cost model, context windows, specific task fit |
| Auth | JWT (HS256) + HttpOnly cookies | Session-based, Passport | Stateless API, refresh token rotation, mobile-compatible |
| Queue | Laravel Horizon + Redis | AWS SQS, RabbitMQ | Native Laravel, excellent UI, sufficient scale for MVP |
| Observability | SigNoz + OTel | Datadog, New Relic | Self-hosted, OpenTelemetry native, cost |
| Container | Docker + Docker Compose | Kubernetes | Complexity justified only at scale beyond Phase 5 |
| Reverse proxy | Caddy | Nginx, Traefik | Automatic HTTPS, simple config, built-in rate limiting |
| Admin panel | Filament 3 | Custom React admin | Rapid development, rich component library, Laravel-native |

---

## 4. Network Topology

```
docker network: flowos-public
  ├── caddy
  └── (only caddy is internet-facing)

docker network: flowos-api
  ├── caddy
  ├── flowos-api (Laravel)
  ├── flowos-realtime (Node.js)
  └── flowos-ai (Python)

docker network: flowos-data
  ├── flowos-api
  ├── flowos-ai
  ├── flowos-super-admin
  ├── postgres-primary
  ├── postgres-replica
  ├── redis
  ├── meilisearch
  ├── minio
  └── clickhouse

docker network: flowos-observability
  ├── flowos-api
  ├── flowos-realtime
  ├── flowos-ai
  ├── signoz
  ├── prometheus
  ├── grafana
  └── loki

docker network: flowos-admin
  ├── caddy (internal route only)
  └── flowos-super-admin
```

**Rule**: No service communicates with another service on `flowos-public`. Only Caddy is on `flowos-public`. All service-to-service traffic is on internal Docker networks.

---

## 5. Data Domains & Ownership

| Domain | Owner Service | Read Access | Write Access |
|--------|--------------|-------------|--------------|
| Users + Auth | Laravel API | API, Super Admin | API only |
| Workspaces + Members | Laravel API | API, Super Admin | API only |
| Boards + Items | Laravel API | API, Super Admin | API only |
| Documents (content) | Realtime (Y.js) | Realtime, API (metadata) | Realtime (CRDT content), API (metadata) |
| CRM (contacts, deals) | Laravel API | API, Super Admin | API only |
| Automations | Laravel API | API, Super Admin | API only |
| Files | Laravel API + MinIO | API (metadata), MinIO (binary) | API (metadata), MinIO (binary) |
| AI credits + usage | Laravel API | API, AI service (read), Super Admin | API only |
| Billing (subscriptions) | Laravel API | API, Super Admin | API (via Stripe/PayFast webhooks) |
| Analytics events | ClickHouse | Super Admin, AI service | Laravel API (via Horizon job) |
| Search index | Meilisearch | API (proxy) | Laravel Horizon job |
| AI embeddings | ChromaDB | AI service | AI service (via Horizon job) |
| Audit log | PostgreSQL superadmin schema | Super Admin only | Super Admin actions only |

---

## 6. Critical Path Dependencies

Before any service can process a real request, these dependencies must be healthy:

```
flowos-api depends on:
  ├── postgres-primary (write) ← CRITICAL: no writes without this
  ├── postgres-replica (read) ← DEGRADED: falls back to primary
  ├── redis (queue + cache + idempotency) ← DEGRADED: falls back to DB for quota
  └── vault (secrets on boot) ← CRITICAL: won't start without this

flowos-realtime depends on:
  ├── redis (pub/sub + presence) ← CRITICAL: no real-time without this
  └── postgres (event catch-up queries) ← DEGRADED: catch-up unavailable

flowos-ai depends on:
  ├── redis (credit metering) ← DEGRADED: falls back to DB check
  ├── chromadb (RAG) ← DEGRADED: RAG queries return empty
  └── external APIs (Gemini, Claude) ← DEGRADED: AI features disabled per model

flowos-super-admin depends on:
  ├── postgres (direct, bypasses RLS) ← CRITICAL
  └── vault (secrets) ← CRITICAL
```

---

## 7. Deployment Architecture

### Environments

| Environment | Purpose | Data | Deploy trigger |
|-------------|---------|------|----------------|
| `local` | Developer machines | Synthetic seed data | Manual (`docker compose up`) |
| `ci` | Automated tests | Fresh DB per run | Every PR commit |
| `staging` | Integration + QA | Anonymized production snapshot (weekly) | Merge to `main` |
| `production` | Live system | Real customer data | Manual approval gate |

### Deploy Flow

```
Developer PR
  ↓
CI pipeline: lint → static analysis → unit → integration → contract → E2E → security
  ↓ (all green)
Merge to main
  ↓ (automatic)
Deploy to staging: docker service update (rolling, zero-downtime)
  ↓
QA sign-off on staging (P0/P1 checklist)
  ↓ (manual approval: Tech Lead)
Deploy to production: same rolling process
  ↓
10-minute observation window (error rate, latency dashboards)
  ↓ (automatic rollback if p95 > 600ms or error rate > 2%)
Deploy confirmed
```

---

## 8. Scale Projections

| Metric | Launch day | 6 months | 12 months | Scale trigger |
|--------|-----------|---------|----------|--------------|
| Concurrent users | 500 | 5,000 | 20,000 | Horizontal scale Node.js realtime at 5k |
| Workspaces | 1,000 | 10,000 | 50,000 | Read replica at 10k workspaces |
| Items | 1M | 50M | 250M | Table partitioning at 100M |
| Storage | 1 TB | 10 TB | 50 TB | Multi-region storage at 10 TB |
| DB size | 50 GB | 500 GB | 2 TB | Connection pooling (PgBouncer) at 500 GB |
| API req/min | 10k | 100k | 500k | Horizontal API scale at 100k |

**Single Docker Compose stack handles launch + first 6 months.** Kubernetes migration planned at 6-month scale triggers, not before.

---

*Owner: Lead Architect*  
*Cross-reference: All FlowOS/*.md documents derive from this*
