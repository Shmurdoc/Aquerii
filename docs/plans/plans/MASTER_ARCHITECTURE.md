# MASTER ARCHITECTURE — Mine System Enterprise Platform

**Version**: 2.0  
**Status**: AUTHORITATIVE — All teams build to this spec  
**Owner**: Lead Architect  
**Last Updated**: 2026-05-04

---

## 1. System Overview

The Mine System is a **unified enterprise integration platform** combining best-of-breed open-source applications into a single, coherent, production-grade system. It is NOT a monolithic ERP — it is an **orchestrated mesh** of specialized services connected by a central API Gateway and event bus.

### 1.1 Design Philosophy

| Principle | Implementation |
|-----------|----------------|
| **Best-of-breed modularity** | Each service owns its domain; no cross-domain data duplication |
| **Event-driven integration** | Services communicate via events, not direct DB coupling |
| **Gateway as single entry point** | All external requests flow through FastAPI Gateway |
| **InvenTree as inventory hero** | Military-grade inventory: QR, BOM, lifecycle, supplier mgmt |
| **AI-augmented operations** | Agent automation layer on top of all services |
| **Observable by default** | Every service emits traces, metrics, logs to SigNoz |
| **Security-first** | Zero-trust: every call authenticated, every secret rotated |
| **Resilience by design** | Circuit breakers, retries, DLQ, graceful degradation everywhere |

---

## 2. Full System Component Map

```
╔══════════════════════════════════════════════════════════════════════════╗
║                         MINE SYSTEM ENTERPRISE PLATFORM                  ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌─────────────────────────── USER INTERFACE LAYER ─────────────────┐   ║
║  │  Homarr Dashboard  │  Twenty CRM UI  │  Excalidraw  │  Mobile    │   ║
║  │  (tiles/widgets)   │  (React/NestJS) │  (whiteboard)│  (PWA)     │   ║
║  └───────────────────────────────┬───────────────────────────────────┘   ║
║                                  │ HTTPS (Caddy reverse proxy)           ║
║  ┌─────────────────────────── GATEWAY LAYER ────────────────────────┐   ║
║  │            FastAPI Central Gateway (Port 8000)                    │   ║
║  │  Auth (JWT/OAuth2) │ Rate Limiting │ CORS │ Routing │ Tracing    │   ║
║  │  Event Bus (in-process) │ Idempotency │ DLQ dispatch             │   ║
║  └──┬────────┬─────────┬──────────┬───────────┬───────────┬─────────┘   ║
║     │        │         │          │           │           │              ║
║  ┌──▼─┐  ┌──▼──┐  ┌───▼──┐  ┌───▼──┐  ┌────▼──┐  ┌────▼─────┐       ║
║  │InvenTree│Twenty│AureusERP│Paperless│YetiForce│HuixiangDou │       ║
║  │:8001│  │:3000│  │:8003 │  │:8010 │  │:80    │  │:7860     │       ║
║  │     │  │     │  │      │  │      │  │       │  │(AI Agent)│       ║
║  └──┬──┘  └──┬──┘  └───┬──┘  └───┬──┘  └────┬──┘  └────┬────┘       ║
║     │        │          │         │           │          │              ║
║  ┌──▼────────▼──────────▼─────────▼───────────▼──────────▼──────────┐  ║
║  │                    DATA LAYER                                      │  ║
║  │  PostgreSQL 15 (per-service DB)  │  Redis 7  │  MinIO (S3)       │  ║
║  │  inventree_db │ twenty_db │ erp_db │ paperless_db │ gateway_db   │  ║
║  └───────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
║  ┌─────────────────── OBSERVABILITY LAYER ────────────────────────────┐  ║
║  │  SigNoz (traces + metrics + logs) │ Zulip (ChatOps alerts)        │  ║
║  │  Structured logging → OpenTelemetry → SigNoz collector            │  ║
║  └───────────────────────────────────────────────────────────────────┘  ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 3. Service Roles & Domain Ownership

| Service | Source | Domain | Source of Truth For | Port |
|---------|--------|--------|---------------------|------|
| **InvenTree** | `InvenTree-master/` | Inventory | Stock qty, BOM, parts, QR codes, suppliers, lifecycle | 8001 |
| **AureusERP** | `aureuserp-master/` | Finance/ERP | Invoices, POs, payments, accounting, employees | 8002 |
| **Twenty CRM** | `twenty-main/` | CRM | Contacts, deals, pipelines, companies, activities | 3000/3001 |
| **Paperless-ngx** | Docker image | Documents | Scanned docs, OCR text, document metadata | 8010 |
| **YetiForceCRM** | `YetiForceCRM-developer/` | Extended CRM | Service contracts, helpdesk, assets, HR modules | 80 |
| **HuixiangDou** | `HuixiangDou-main/` | AI Assistant | Knowledge base queries, chat, document Q&A | 7860 |
| **Excalidraw** | `excalidraw-master/` | Whiteboarding | Team diagrams, architecture boards, collaboration | 3002 |
| **Flowchart AI** | `flowchart-ai-main/` | Visual AI | Auto-generate flowcharts from data/patents | 8020 |
| **pdfplumber** | `pdfplumber-stable/` | PDF Extraction | PDF table extraction, patent parsing, data mining | (library) |
| **FastAPI Gateway** | `services/gateway/` | Integration | Auth tokens, event routing, API orchestration | 8000 |

### 3.1 Service Interaction Rules

```
RULE 1: Services NEVER call each other directly.
        All inter-service calls go through the Gateway.

RULE 2: Data ownership is absolute.
        InvenTree stock qty is THE stock qty — no service may shadow it.

RULE 3: Events are immutable after emission.
        Once an event is fired, it cannot be recalled — use compensation events.

RULE 4: Every external write is idempotent.
        Callers must supply an Idempotency-Key header on all POST/PATCH/DELETE.

RULE 5: The Gateway is not a service proxy.
        It applies business logic (auth, rate limit, transformation) — not a dumb pass-through.
```

---

## 4. Network Architecture

### 4.1 Docker Networks

```yaml
networks:
  mine_frontend:   # Caddy ↔ all services (HTTP/HTTPS)
  mine_backend:    # Services ↔ databases (no external exposure)
  mine_observe:    # All services ↔ SigNoz collector
  mine_cache:      # Services ↔ Redis
```

### 4.2 Port Allocation (Complete)

| Port | Service | Protocol | Network |
|------|---------|----------|---------|
| 80 | Caddy (HTTP redirect) | HTTP | frontend |
| 443 | Caddy (HTTPS) | HTTPS | frontend |
| 3000 | Twenty Frontend | HTTP | frontend |
| 3001 | Twenty API (NestJS) | HTTP | frontend |
| 3002 | Excalidraw | HTTP | frontend |
| 5432 | PostgreSQL (main) | TCP | backend |
| 5433 | PostgreSQL (Twenty) | TCP | backend |
| 5434 | PostgreSQL (AureusERP) | TCP | backend |
| 5435 | PostgreSQL (Paperless) | TCP | backend |
| 6379 | Redis | TCP | cache |
| 7860 | HuixiangDou | HTTP | frontend |
| 8000 | FastAPI Gateway | HTTP | frontend |
| 8001 | InvenTree | HTTP | frontend |
| 8002 | AureusERP | HTTP | frontend |
| 8003 | Homarr Dashboard | HTTP | frontend |
| 8010 | Paperless-ngx | HTTP | frontend |
| 8020 | Flowchart AI | HTTP | frontend |
| 8080 | YetiForceCRM | HTTP | frontend |
| 8200 | Vault (Secrets) | HTTP | backend |
| 9000 | SigNoz UI | HTTP | observe |
| 9090 | SigNoz collector (OTLP) | gRPC | observe |
| 9200 | MinIO API | HTTP | backend |
| 9300 | Zulip | HTTP | frontend |

### 4.3 Caddy Routing Rules

```caddyfile
# Caddyfile (configs/caddy/Caddyfile)
{
  email admin@minesystem.local
}

minesystem.local {
  # API Gateway — primary entry
  handle /api/* {
    reverse_proxy gateway:8000
  }
  # Service UIs
  handle /inventory/* { reverse_proxy inventree:8001 }
  handle /erp/*        { reverse_proxy aureuserpmaster:8002 }
  handle /crm/*        { reverse_proxy twenty-front:3000 }
  handle /docs/*       { reverse_proxy paperless:8010 }
  handle /crm2/*       { reverse_proxy yetiforce:8080 }
  handle /ai/*         { reverse_proxy huixiangdou:7860 }
  handle /draw/*       { reverse_proxy excalidraw:3002 }
  handle /charts/*     { reverse_proxy flowchart-ai:8020 }
  handle /dashboard/*  { reverse_proxy homarr:8003 }
  handle /chat/*       { reverse_proxy zulip:9300 }
  # Default
  handle { reverse_proxy homarr:8003 }
  # TLS
  tls internal
}
```

---

## 5. Data Architecture

### 5.1 Database Strategy

Each service uses its own isolated PostgreSQL database. **No shared tables. No cross-DB foreign keys.**

```
PostgreSQL cluster (single host, separate DBs):
├── inventree_db     — InvenTree inventory data
├── twenty_db        — Twenty CRM data  
├── erp_db           — AureusERP / financial data
├── paperless_db     — Paperless-ngx document metadata
├── yetiforce_db     — YetiForceCRM extended CRM
├── gateway_db       — Idempotency keys, DLQ, audit log, tokens
└── signoz_db        — SigNoz metrics (separate instance)
```

### 5.2 Shared Data via Gateway

When Service A needs data from Service B:
1. Service A calls Gateway endpoint (e.g., `GET /api/inventory/part/{id}`)
2. Gateway calls InvenTree API, transforms response, returns to caller
3. Service A caches result in Redis (TTL: 5 min for non-critical, 30s for stock qty)

### 5.3 Redis Usage Map

| Key Pattern | Owner | TTL | Purpose |
|-------------|-------|-----|---------|
| `inv:part:{id}:qty` | InvenTree | 30s | Stock qty cache |
| `crm:contact:{id}` | Twenty | 5m | Contact cache |
| `auth:token:{jti}` | Gateway | match expiry | JWT blacklist |
| `rate:ip:{ip}` | Gateway | 60s | Rate limit counter |
| `dlq:pending` | Gateway | permanent | DLQ event list |
| `lock:part:{id}` | Gateway | 30s | Stock reservation lock |

---

## 6. Event Architecture

### 6.1 Event Bus Design

The Gateway maintains an **in-process event bus** backed by PostgreSQL for durability. Redis pub/sub handles low-latency fan-out.

```
Event Flow:
Source Service emits webhook → Gateway /events/ingest
    → Validate schema (JSON Schema)
    → Store in gateway_db.events (durable)
    → Publish to Redis channel
    → Subscribers (async workers) pick up and process
    → On failure: exponential backoff → DLQ
```

### 6.2 Canonical Event Catalog

```json
// All events MUST conform to this envelope
{
  "event_id": "uuid-v4",
  "event_type": "domain.entity.action",
  "source_service": "inventree|aureusrep|twenty|paperless|yetiforce",
  "schema_version": "1.0",
  "idempotency_key": "service_entityid_action_timestamp_ms",
  "timestamp_utc": "2026-05-04T10:00:00Z",
  "correlation_id": "uuid-v4",
  "payload": { ... }
}
```

**Full Event Catalog**:

| Event Type | Source | Consumers | Trigger |
|------------|--------|-----------|---------|
| `inventory.part.created` | InvenTree | Gateway, AureusERP | New part added |
| `inventory.stock.low` | InvenTree | Gateway → AureusERP (auto-PO) | Stock ≤ reorder point |
| `inventory.stock.updated` | InvenTree | Gateway, AureusERP | Any stock change |
| `inventory.po.received` | InvenTree | Gateway, AureusERP | PO goods received |
| `inventory.build.completed` | InvenTree | Gateway, AureusERP | Build order done |
| `inventory.part.qr_scanned` | InvenTree | Gateway, HuixiangDou | QR scan event |
| `crm.deal.created` | Twenty | Gateway → InvenTree (reserve) | New deal |
| `crm.deal.won` | Twenty | Gateway → AureusERP (invoice) | Deal closed won |
| `crm.contact.created` | Twenty | Gateway → YetiForce (sync) | New contact |
| `erp.invoice.created` | AureusERP | Gateway | Invoice generated |
| `erp.po.approved` | AureusERP | Gateway → InvenTree | PO approved |
| `erp.payment.received` | AureusERP | Gateway → Twenty (update deal) | Payment in |
| `document.uploaded` | Paperless | Gateway → HuixiangDou | Document ingested |
| `document.ocr.complete` | Paperless | Gateway | OCR done |
| `document.classified` | Gateway | HuixiangDou | AI classification |
| `support.ticket.created` | YetiForce | Gateway → Zulip | New helpdesk ticket |
| `system.alert.critical` | SigNoz | Zulip | Threshold breach |

### 6.3 Event Loop Prevention

```python
# All event handlers MUST check this before re-emitting
def should_emit_event(event: Event, context: ProcessingContext) -> bool:
    # Prevent loops: don't re-emit if already processing this correlation chain
    if context.hop_count >= 5:
        logger.error(f"Event loop detected: {event.correlation_id}, hop={context.hop_count}")
        dlq.send(event, reason="max_hop_count_exceeded")
        return False
    if event.source_service == context.current_service:
        return False  # Don't echo back to self
    return True
```

---

## 7. Security Architecture

### 7.1 Authentication Flow

```
Client → Caddy (TLS termination)
       → Gateway /auth/login
       → Gateway issues JWT (RS256, 1hr expiry)
       → Client sends JWT in Authorization header
       → Gateway validates JWT on every request
       → Gateway injects user context into upstream calls
       → Upstream services trust Gateway (IP allowlist only)
```

### 7.2 RBAC Matrix

| Role | InvenTree | AureusERP | Twenty | Paperless | YetiForce | Gateway Admin |
|------|-----------|-----------|--------|-----------|-----------|---------------|
| `admin` | Full | Full | Full | Full | Full | Full |
| `inventory_manager` | Full | Read POs | Read deals | Read | No | No |
| `finance_manager` | Read | Full | Read | Read | No | No |
| `sales_rep` | Read stock | Read invoices | Full | Read | Read | No |
| `warehouse_op` | Stock only | No | No | No | No | No |
| `viewer` | Read | Read | Read | Read | Read | No |
| `ai_agent` | Read+Write | Read+Write | Read | Read | No | No |

### 7.3 Secrets Management

```
HashiCorp Vault (Port 8200) — single secrets authority
├── secret/inventree/db_password
├── secret/aureusrep/db_password
├── secret/twenty/db_password
├── secret/gateway/jwt_private_key
├── secret/gateway/jwt_public_key
├── secret/services/redis_password
└── secret/services/minio_access_key

All containers: NEVER use .env files in production.
Use Vault agent sidecar or environment injection at container start.
Rotation: all secrets rotated every 90 days via Vault policy.
```

---

## 8. API Gateway Architecture

### 8.1 Gateway Structure

```
services/gateway/
├── main.py                    # FastAPI app entry point
├── routers/
│   ├── auth.py                # Login, token refresh, logout
│   ├── inventory.py           # InvenTree proxy + business logic
│   ├── erp.py                 # AureusERP proxy + business logic
│   ├── crm.py                 # Twenty CRM proxy + business logic
│   ├── documents.py           # Paperless proxy + OCR triggers
│   ├── yetiforce.py           # YetiForceCRM proxy
│   └── events.py              # Event ingestion + fan-out
├── middleware/
│   ├── auth_middleware.py     # JWT validation
│   ├── rate_limit.py          # Redis-backed rate limiting
│   ├── idempotency.py         # Idempotency key enforcement
│   ├── tracing.py             # OpenTelemetry instrumentation
│   └── correlation.py         # Correlation ID injection
├── services/
│   ├── event_bus.py           # Event routing + fan-out
│   ├── circuit_breaker.py     # Per-service circuit breakers
│   ├── dlq.py                 # Dead-letter queue management
│   ├── sync/
│   │   ├── stock_sync.py      # InvenTree ↔ AureusERP stock sync
│   │   ├── contact_sync.py    # Twenty ↔ YetiForce contact sync
│   │   ├── invoice_sync.py    # AureusERP ↔ Twenty invoice sync
│   │   └── document_sync.py   # Paperless ↔ HuixiangDou doc sync
│   └── ai/
│       ├── agent_runner.py    # AI automation task runner
│       ├── po_automator.py    # Auto-PO creation agent
│       └── classify_docs.py   # AI document classifier
├── models/
│   ├── events.py              # Event schemas (Pydantic)
│   ├── auth.py                # Auth models
│   └── dlq.py                 # DLQ models
├── db/
│   ├── session.py             # SQLAlchemy session management
│   └── migrations/            # Alembic migrations
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
└── config.py                  # Settings (Pydantic BaseSettings)
```

### 8.2 Rate Limiting Policy

| Endpoint Type | Limit | Window | Burst |
|---------------|-------|--------|-------|
| Auth (`/auth/*`) | 10 req | 60s | 5 |
| Read endpoints | 1000 req | 60s | 200 |
| Write endpoints | 200 req | 60s | 50 |
| Webhook ingestion | 500 req | 60s | 100 |
| AI endpoints | 50 req | 60s | 10 |
| Admin endpoints | 100 req | 60s | 20 |

---

## 9. AI / Automation Architecture

### 9.1 AI Agent Framework

```
HuixiangDou (Port 7860) — Knowledge Base AI
├── Indexes: InvenTree parts catalog, AureusERP products, all Paperless docs
├── Queries: "What is the reorder policy for BOLT-M6?" → answers from KB
└── Integration: Gateway calls HuixiangDou API for AI-augmented responses

agency-agents-main — Pre-built agent templates
├── supply-chain/inventory-forecaster  → InvenTree demand forecasting
├── supply-chain/vendor-evaluator      → AureusERP supplier scoring  
├── finance/invoice-tracker            → AureusERP invoice chase
├── business/erp-admin                 → Automated ERP admin tasks
├── devops/incident-responder          → SigNoz alert → auto-remediation
└── data/etl-pipeline                  → Gateway data sync tasks

awesome-openclaw-agents-main — Additional agent configs
├── engineering/backend-architect      → Code review & architecture
├── devops/deploy-guardian             → Deployment safety checks
├── testing/api-tester                 → Automated API testing
└── security/security-hardener        → Security scan automation

Flowchart AI — Visual intelligence
├── Input: pdfplumber extracts tables from patent PDFs
├── GenFlowchart.py generates process maps from extracted data
└── Output: Excalidraw-compatible diagrams for team whiteboarding
```

### 9.2 Automation Triggers

| Trigger | Agent | Action | Service |
|---------|-------|--------|---------|
| `inventory.stock.low` | po_automator | Draft PO → send to AureusERP | InvenTree → AureusERP |
| `crm.deal.won` | invoice_automator | Create invoice | Twenty → AureusERP |
| `document.uploaded` | classify_docs | OCR + classify + index | Paperless → HuixiangDou |
| `system.alert.critical` | incident_responder | Page + remediate | SigNoz → Zulip |
| `erp.payment.overdue` | invoice_tracker | Chase email | AureusERP → Twenty |
| Daily 08:00 | inventory_forecaster | Demand forecast report | InvenTree → Homarr |
| Daily 08:00 | financial_forecaster | Cash flow report | AureusERP → Homarr |

---

## 10. Integration Flows (Detailed)

### 10.1 Low Stock → Auto Purchase Order

```
InvenTree detects stock ≤ reorder_point
    → emits: inventory.stock.low (event_id, part_id, current_qty, reorder_qty, preferred_supplier_id)
    → Gateway receives event
    → Gateway checks: is_auto_po_enabled(part_id) → True
    → Gateway gets supplier info from InvenTree API
    → Gateway builds PO payload
    → Gateway calls AureusERP POST /api/purchases/orders (with idempotency_key)
    → AureusERP creates draft PO
    → AureusERP emits: erp.po.created (po_id, part_id, qty, supplier)
    → Gateway updates InvenTree: mark part as "on_order"
    → Zulip notification: "Auto-PO created: #PO-1234 for BOLT-M6 x100"
```

### 10.2 Deal Won → Invoice

```
Twenty CRM: Rep marks deal as WON
    → emits: crm.deal.won (deal_id, contact_id, value, line_items)
    → Gateway receives event
    → Gateway fetches contact from Twenty (name, email, billing_address)
    → Gateway fetches part details from InvenTree for each line_item
    → Gateway calls AureusERP POST /api/invoices (with idempotency_key)
    → AureusERP creates invoice
    → AureusERP emits: erp.invoice.created (invoice_id, deal_id, amount)
    → Gateway updates Twenty deal: add invoice_id custom field
    → Gateway calls InvenTree: reserve stock for line_items
    → Zulip notification: "Invoice #INV-456 created for Deal DEAL-789"
```

### 10.3 Document Upload → AI Knowledge Base

```
User uploads document to Paperless-ngx
    → Paperless triggers OCR (built-in Tesseract)
    → Paperless emits webhook: document.ocr.complete (doc_id, text_content, tags)
    → Gateway receives webhook
    → Gateway calls pdfplumber service (if PDF): extract tables + structured data
    → Gateway calls HuixiangDou POST /api/index (doc_id, text, metadata)
    → HuixiangDou indexes document into knowledge base
    → document is now queryable via AI chat
    → Zulip notification: "Document 'Q4-Report.pdf' indexed and ready for AI search"
```

### 10.4 YetiForce ↔ Twenty Contact Sync

```
New contact created in Twenty CRM
    → emits: crm.contact.created (contact_id, name, email, company)
    → Gateway receives event
    → Gateway transforms to YetiForce contact format
    → Gateway calls YetiForce API POST /webservice.php?module=Contacts&action=Save
    → YetiForce creates contact record
    → Gateway stores mapping: twenty_contact_id ↔ yetiforce_contact_id
    → Future updates: Gateway keeps both in sync via bidirectional sync loop
    (Loop prevention: source_service tag prevents echo)
```

---

## 11. Deployment Architecture

### 11.1 Docker Compose Strategy

```
docker/
├── docker-compose.core.yml        # Caddy, PostgreSQL, Redis, MinIO
├── docker-compose.inventory.yml   # InvenTree
├── docker-compose.erp.yml         # AureusERP (Laravel/Filament)
├── docker-compose.crm.yml         # Twenty (NestJS + React)
├── docker-compose.docs.yml        # Paperless-ngx
├── docker-compose.crm2.yml        # YetiForceCRM (PHP)
├── docker-compose.ai.yml          # HuixiangDou, Flowchart AI
├── docker-compose.gateway.yml     # FastAPI Gateway
├── docker-compose.ux.yml          # Homarr, Excalidraw, Zulip
├── docker-compose.observe.yml     # SigNoz, Vault
└── docker-compose.override.yml    # Local dev overrides (gitignored)
```

### 11.2 Startup Order

```
1. core (postgres, redis, minio, vault) — MUST be healthy first
2. inventree, aureusrep, twenty-server, paperless, yetiforce — parallel
3. gateway — AFTER all services healthy
4. caddy — AFTER gateway healthy
5. homarr, zulip, excalidraw, huixiangdou — parallel, after gateway
6. signoz — always running (independent)
```

### 11.3 Health Check Standards

Every service MUST expose `GET /health` returning:
```json
{
  "status": "healthy|degraded|unhealthy",
  "version": "1.0.0",
  "timestamp": "2026-05-04T10:00:00Z",
  "dependencies": {
    "database": "healthy",
    "redis": "healthy",
    "upstream_services": {}
  }
}
```

---

## 12. Observability Architecture

### 12.1 Three Pillars

```
TRACES (OpenTelemetry → SigNoz)
  Every request gets a trace_id + span_id
  Propagated via W3C TraceContext headers across all services
  
METRICS (Prometheus → SigNoz)
  Each service exposes /metrics endpoint
  Custom metrics: stock_qty_gauge, po_creation_counter, dlq_depth_gauge
  
LOGS (Structured JSON → SigNoz)
  All logs: {"timestamp", "level", "service", "trace_id", "message", ...}
  No unstructured print() logs in production
```

### 12.2 SigNoz Dashboard Panels

| Panel | Metric | Alert Threshold |
|-------|--------|-----------------|
| Gateway RPS | http_requests_total | - |
| Gateway P99 Latency | http_duration_p99 | > 2s → warn, > 5s → critical |
| Error Rate | http_errors_rate | > 2% → warn, > 5% → critical |
| DLQ Depth | dlq_pending_count | > 10 → warn, > 50 → critical |
| Stock Events/min | inventory_events_total | - |
| Auto-PO Rate | auto_po_created_total | - |
| InvenTree Health | service_health{service="inventree"} | unhealthy → critical |
| DB Connection Pool | db_pool_used | > 80% → warn |
| Redis Memory | redis_memory_used_bytes | > 80% → warn |
| Circuit Breaker State | circuit_breaker_state | OPEN → critical |

---

## 13. Phase Architecture Timeline

```
Week 1-2  │ Phase 0: Governance, Standards, Plan approval
Week 3-5  │ Phase 1: Core infrastructure (Docker, PostgreSQL, Redis, Caddy, SigNoz)
Week 6-9  │ Phase 2: Deploy all services (InvenTree, AureusERP, Twenty, Paperless, YetiForce)
Week 10-12│ Phase 3: Integration layer (Gateway, events, sync, automation)
Week 13-15│ Phase 4: UX layer (Homarr, Zulip, HuixiangDou, Excalidraw, mobile)
Week 16   │ Phase 5: Hardening, security audit, go-live
```

---

## 14. Technology Versions (Pinned)

| Component | Version | Justification |
|-----------|---------|---------------|
| Python | 3.11.9 | InvenTree + Gateway |
| FastAPI | 0.111.0 | Gateway framework |
| Node.js | 20.x LTS | Twenty CRM |
| PHP | 8.2 | YetiForceCRM, AureusERP |
| PostgreSQL | 15.6 | Stability + JSON support |
| Redis | 7.2 | Latest stable |
| Docker | 26.x | Platform |
| Docker Compose | 2.27.x | Orchestration |
| Caddy | 2.7.x | Reverse proxy |
| SigNoz | 0.45.x | Observability |

---

*This document is the authoritative architecture reference. All service implementations, agent playbooks, and phase plans derive from this blueprint.*

*Owner: Lead Architect + Team Alpha*  
*Review: Monthly or on any architectural decision*
