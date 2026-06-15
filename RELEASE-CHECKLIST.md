# Release Checklist — Aquerii Pilot

**Project:** Aquerii — Mining Operations Management Platform
**Release:** v0.1.0 (pre-pilot)
**Pilot Date:** TBD (per PILOT-STRATEGY.md)
**Owner:** Madoc (Founder)

---

## Environment Verification

- [ ] Root `.env` has all required variables set (not default/placeholder values)
- [ ] `APP_KEY` generated via `php artisan key:generate`
- [ ] `DB_PASSWORD`, `REDIS_PASSWORD`, `MINIO_SECRET` use production-strength values
- [ ] `MAIL_MAILER` set to `smtp` with BillionMail credentials (not `log`)
- [ ] `FRONTEND_URL` set to production domain (CORS whitelist)
- [ ] `CORS_ORIGINS` set in realtime service env
- [ ] All migrations have run against production database
- [ ] Queue workers are running and processing jobs (Horizon)
- [ ] Meilisearch index is populated and search works
- [ ] OTel collector endpoints reachable from all services
- [ ] Alertmanager configured with working notification channel

## Security Checklist

- [ ] Audit log review: no suspicious access patterns in staging
- [ ] Access control review: workspace isolation verified for pilot tenant
- [ ] CORS locked to `FRONTEND_URL` only (`config/cors.php`)
- [ ] Rate limiting active on all authenticated routes (60 req/min)
- [ ] AI endpoints have stricter rate limit (10 req/min)
- [ ] CORS origins for realtime service set (not localhost)
- [ ] InternalSecret middleware scoped per route (realtime vs AI)
- [ ] `.env` files excluded from version control (`.gitignore` confirmed)
- [ ] Trivy/SAST scan passes with no HIGH/CRITICAL findings
- [ ] Gitleaks scan passes — no secrets in repository
- [ ] Semgrep scan passes — no vulnerable patterns
- [ ] CSRF protection enabled on all state-changing routes
- [ ] Dependency audit (`npm audit`, `composer audit`) clean

## Data Integrity

- [ ] Backup strategy documented and tested
- [ ] Automated daily DB backups configured (Postgres pg_dump to MinIO/S3)
- [ ] Backup restore verified on staging environment
- [ ] Migration rollback plan exists for each migration in release
- [ ] Redis persistence (RDB/AOF) configured for queue data
- [ ] MinIO/S3 bucket versioning enabled for document storage
- [ ] ClickHouse data retention policy configured

## Monitoring

- [ ] Healthcheck endpoints return 200 for all services:
  - [ ] API (`GET /api/health`)
  - [ ] Realtime (`GET /health`)
  - [ ] Postgres (via postgres-exporter)
  - [ ] Redis (via redis-exporter)
- [ ] Prometheus targets all show `UP`
- [ ] Grafana dashboards loaded for:
  - [ ] API request rate / latency / error rate
  - [ ] Queue throughput and backlog
  - [ ] WebSocket connection count
  - [ ] Database connection pool
  - [ ] Host resource usage (CPU, memory, disk)
- [ ] SigNoz / OTel traces flowing for all services
- [ ] Alertmanager rules active and routing to correct channel
- [ ] Log aggregation (Grafana Loki) ingesting from all services
- [ ] Error tracking (Sentry or equivalent) configured
- [ ] Uptime monitoring / external healthcheck set up

## Rollback Plan

### Application Rollback
- Previous Docker images tagged in GHCR (e.g., `:v0.0.9`, `:v0.0.9-api`, etc.)
- `docker compose down` + restore previous compose version + `docker compose up -d`
- Full rollback ETA: ~10 minutes

### Database Rollback
- Run `php artisan migrate:rollback --step=N` for N migrations in this release
- If rollback unavailable: restore from pre-deployment pg_dump backup
- DB rollback ETA: ~5 minutes (migration) / ~30 minutes (full restore)

### Steps
1. Identify bad deployment (monitoring alert or user report)
2. Halt queue workers: `docker compose stop horizon`
3. Roll back API/web/realtime images to previous versions
4. Roll back database migrations if schema changed
5. Restore backup as last resort
6. Verify healthchecks pass
7. Resume queue workers
8. Notify pilot users of rollback via support channel

## Pilot-Specific

- [ ] Pilot workspace provisioned (per PILOT-SETUP.md)
- [ ] 10 pilot users created with correct roles
- [ ] Seed data loaded (hazards, incidents, deals, contacts, products, etc.)
- [ ] All 10 success scenarios verified end-to-end (from PILOT-STRATEGY.md):
  - [ ] S1: Log in and see workspace dashboard
  - [ ] S2: Create a deal
  - [ ] S3: Generate branded PDF
  - [ ] S4: Email a document
  - [ ] S5: Export contacts to Excel
  - [ ] S6: @mention colleague in hazard report
  - [ ] S7: Print any entity page
  - [ ] S8: Change workspace logo and colour
  - [ ] S9: Create and assign a ticket
  - [ ] S10: View and filter risk register
- [ ] Supervisor training session scheduled
- [ ] Support escalation path defined (email / WhatsApp group)
- [ ] NDA / Pilot agreement signed (per PILOT-AGREEMENT.md)
- [ ] Week 1 feedback call scheduled
- [ ] 2nd mine NDA in progress (pipeline de-risking per strategy)

## Go/No-Go Criteria

| Criteria | Status | Notes |
|----------|--------|-------|
| All Phase 0 items resolved (PRODUCTION_READINESS_PLAN.md) | ☐ | 12 items |
| All Phase 1 items resolved | ☐ | 10 items |
| Critical/blocker bugs: 0 open | ☐ | |
| Security scan: 0 CRITICAL/HIGH | ☐ | |
| All 10 pilot scenarios pass | ☐ | |
| Backup & restore verified | ☐ | |
| Monitoring shows all services healthy | ☐ | |
| Rollback plan tested | ☐ | |
| Pilot agreement signed | ☐ | |
| Support channel active | ☐ | |

**Decision:** ☐ GO / ☐ NO-GO
**Sign-off:** ______________________ **Date:** ______________
