# Pilot Deployment — Aquerii

**Version:** v0.1.0
**Date:** 2026-06-15
**Author:** Madoc (Founder)
**Status:** Draft

---

## 1. Pre-Deployment Checklist

- [ ] RELEASE-CHECKLIST.md go/no-go criteria all ✅
- [ ] All Phase 0–1 items from PRODUCTION_READINESS_PLAN.md complete
- [ ] `.env` populated with production values (no defaults)
- [ ] Docker images built and pushed to GHCR (latest + version tag)
- [ ] Target server has Docker + Docker Compose installed
- [ ] Target server DNS resolves to production domain
- [ ] SSL certificates provisioned (Caddy auto-TLS or manual)
- [ ] Firewall rules allow ports 80, 443, and internal service ports
- [ ] Monitoring stack (Prometheus, Grafana, Loki) deployed and accepting data
- [ ] Backup directory mounted and writable
- [ ] Pilot workspace credentials generated (per PILOT-SETUP.md)
- [ ] All 10 success scenarios verified on staging

---

## 2. Deployment Sequence

### Step 1 — Pull Images & Configure
```bash
# Clone / pull latest
git pull origin main

# Copy production env
cp .env.example .env
# Edit .env with production values (DB passwords, API keys, etc.)

# Pull latest Docker images
docker compose pull
```

### Step 2 — Run Database Migrations
```bash
docker compose up -d postgres redis
# Wait for postgres healthcheck to pass (10–30s)
docker compose exec -T postgres pg_isready -U aquerii_app

docker compose run --rm api php artisan migrate --force
docker compose run --rm api php artisan db:seed --class=PilotSeeder --force
```

### Step 3 — Start Queue Workers (Horizon)
```bash
docker compose up -d horizon
docker compose logs horizon --tail=10
# Verify: "Horizon started successfully"
```

### Step 4 — Start Realtime Service
```bash
docker compose up -d realtime
# Verify healthcheck:
curl http://localhost:3001/health
# Expected: {"status":"ok", ...}
```

### Step 5 — Start API and Web
```bash
docker compose up -d api caddy
# Verify:
curl http://localhost/api/health
# Expected: {"status":"ok", ...}

# Web: navigate to https://<production-domain> in browser
```

### Step 6 — Verify Full Stack
```bash
# All services healthy?
docker compose ps

# Healthcheck endpoints:
curl http://localhost/api/health          # API
curl http://localhost:3001/health         # Realtime
curl http://localhost:9090/-/ready        # Prometheus

# WebSocket connection test (browser): open devtools → Network → WS
# Should see connection to wss://<domain>/ws
```

### Step 7 — Provision Pilot Workspace
```bash
docker compose exec -T api php artisan provision:pilot \
  --workspace-name="Pilot Mine" \
  --slug=pilot-mine \
  --password=<pilot-password>
```

### Step 8 — Enable Monitoring & Alerting
```bash
docker compose up -d prometheus grafana alertmanager
# Verify all scrape targets are UP in Prometheus UI
# Verify alertmanager routes to correct notification channel
```

---

## 3. Post-Deployment Verification

| Check | Command / Action | Expected |
|-------|-----------------|----------|
| API health | `curl /api/health` | `{"status":"ok"}` |
| Web load | Browser → production URL | Login page renders |
| Login | Use pilot credentials | Dashboard loads |
| Realtime | Open 2 browser tabs on same board | Cursor sync works |
| Migrations | `php artisan migrate:status` | All green "Y" |
| Queue | `curl /api/horizon/status` | Workers active |
| Backup | `ls /backups/` | Recent `.sql.gz` file |
| Alerts | `curl /api/-/ready` (Prom) | Prometheus ready |
| Logs | Grafana Loki → Explore | Logs from all services |

---

## 4. Monitoring Dashboard References

| Dashboard | URL (local) | URL (production) |
|-----------|-------------|-------------------|
| Prometheus | `http://localhost:9090` | `https://prometheus.<domain>` |
| Grafana | `http://localhost:3000` | `https://grafana.<domain>` |
| SigNoz | `http://localhost:3301` | `https://signoz.<domain>` |
| Loki (via Grafana) | Grafana → Explore → Loki | Same pattern |
| Alertmanager | `http://localhost:9093` | `https://alertmanager.<domain>` |
| Caddy admin | `http://localhost:2019` | Internal only |

### Key Grafana Dashboards (to create after deploy)

- **Aquerii — API Overview**: Request rate, p50/p95/p99 latency, error rate by route
- **Aquerii — Queue**: Horizon queue size, processing time, failure rate
- **Aquerii — Realtime**: Active WS connections, messages/sec, room count
- **Aquerii — Database**: Connection pool, query time, slow queries
- **Aquerii — Host**: CPU, memory, disk, network per container

---

## 5. Rollback Steps

### Application Rollback
```bash
# 1. Stop all services
docker compose down

# 2. Revert Docker image tags in docker-compose.yml to previous version
# Example: api:latest → api:v0.0.9

# 3. Restart
docker compose up -d

# 4. Verify healthchecks pass
```

### Database Migration Rollback
```bash
# Option A: Rollback last batch
docker compose exec -T api php artisan migrate:rollback --step=1 --force
docker compose exec -T api php artisan migrate:rollback --step=2 --force
# (repeat for each migration in this release)

# Option B: Full DB restore from backup
docker compose exec -T postgres psql -U aquerii_app -d aquerii -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c /backups/aquerii_<date>.sql.gz | \
  docker compose exec -T postgres psql -U aquerii_app -d aquerii
```

### Full Rollback Timeline
| Action | ETA |
|--------|-----|
| Identify issue | 0–5 min |
| Roll back application images | ~10 min |
| Roll back DB migrations | ~5 min |
| Full DB restore | ~30 min |
| Verify and notify | ~5 min |

---

## 6. Contact Escalation

| Failure Mode | Contact | Method | SLA |
|-------------|---------|--------|-----|
| API down / 5xx | Madoc | WhatsApp | 15 min |
| Database unavailable | Madoc | Phone | 10 min |
| Realtime disconnected | Madoc | WhatsApp | 30 min |
| Security incident | Madoc | Phone | Immediate |
| Workspace data loss | Madoc | Phone | Immediate |
| General user issue | Madoc | WhatsApp group | 1 hour |
| Feature bug / missing | Madoc | GitHub issue | 24 hours |

**Pilot Support Channel:** (TBD — WhatsApp group or email)

---

## 7. 12-Week Pilot Milestones

| Week | Milestone | Owner |
|------|-----------|-------|
| **W1** | Deploy + user onboarding + scenario verification | Madoc |
| **W2** | Bug triage + NPS survey + feedback call | Madoc |
| **W3** | Feature fixes (high priority) + 2nd mine NDA start | Madoc |
| **W4** | Mid-point check: 8/10 scenarios without help? | Madoc |
| **W6** | Feature backlog prioritised | Madoc |
| **W8** | Pilot renewal intent survey + pivot or proceed | Madoc |
| **W9** | 2nd mine onboarding (if renewal intent positive) | Madoc |
| **W10** | Case study draft + pricing finalized | Madoc |
| **W12** | Pilot close: convert/expand/sunset decision | Madoc |

### Success Criteria (from PILOT-STRATEGY.md)

| Metric | Target | W1 | W4 | W8 | W12 |
|--------|--------|----|----|----|-----|
| Scenarios w/o help | 8/10 | ☐ | ☐ | ☐ | ☐ |
| NPS Score | ≥ 6 | ☐ | ☐ | ☐ | ☐ |
| Critical bugs open | 0 | ☐ | ☐ | ☐ | ☐ |
| Renewal intent | "Yes" | — | — | ☐ | ☐ |

---

## 8. Post-Deployment Tasks

- [ ] Confirm monitoring dashboards are populated with data
- [ ] Send welcome credentials to pilot users
- [ ] Schedule Week 1 feedback call
- [ ] Create support WhatsApp group
- [ ] Verify all 10 success scenarios work in pilot environment
- [ ] Run first backup iteration
- [ ] Set up recurring backup cron job
- [ ] Update VERSION to v0.1.1 after first patch
