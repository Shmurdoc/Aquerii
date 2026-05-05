# Aquerii (FlowOS)

**Production-ready multi-tenant SaaS platform** — Boards, Documents, CRM, Automation, AI.

## Architecture

- **Laravel 11 / PHP 8.3** — REST API, business logic, billing, auth
- **Node.js 20 LTS + Socket.IO 4** — Realtime events, Y.js CRDT collaborative docs
- **Python 3.11 FastAPI** — AI service (Gemini + Claude), RAG pipeline
- **PostgreSQL 15.6** — Source of truth, Row-Level Security on all tenant tables
- **Redis 7.2** — Pub/sub, queues, cache, idempotency, quota counters
- **Meilisearch** — Full-text search (per-workspace index prefix)
- **MinIO** — Object storage (files, attachments)
- **ClickHouse** — Analytics events
- **Caddy** — TLS termination, reverse proxy, rate limiting
- **Filament 3** — Super Admin panel
- **SigNoz + Prometheus + Grafana + Loki** — Observability

## Quick Start

```bash
cp .env.example .env
# Fill in secrets in .env (dev only — production uses Vault)
docker compose up -d
docker compose exec api php artisan migrate --seed
```

App: http://localhost (Caddy)  
API: http://localhost/api/v1  
Super Admin: http://localhost:8001  
Grafana: http://localhost:3000  
Horizon: http://localhost/horizon  

## Structure

```
services/
  api/          Laravel 11 REST API
  realtime/     Node.js Socket.IO realtime service
  ai/           Python FastAPI AI service
  super-admin/  (served by api/ via Filament — separate Caddy route)
infra/
  postgres/     Init SQL (schemas, RLS, roles)
  redis/        Redis config
  caddy/        Caddyfile
  prometheus/   Alert rules + scrape config
  grafana/      Dashboards + datasources
  vault/        Vault dev config
  meilisearch/  Meilisearch config
.github/
  workflows/    CI pipeline
scripts/        Helper scripts (smoke test, reindex, seed)
```

## Documentation

All architecture, API contracts, security, and operational docs live in `E:\Mine System\FlowOS\`.

## Phase Plan

See `E:\Mine System\FlowOS\PHASE_PLAN.md` — 32-week, 5-phase execution plan.
