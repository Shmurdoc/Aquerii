# Phase 4 — Production Hardening & Finalization

## Objective
Lock down the system for production. Security audit, performance baseline, documentation sync, CI/CD finalization, and deployment readiness.

## Tasks

### 4.1 — Security Hardening
- Run Semgrep SAST scan on all PHP/JS/TS code
- Fix any findings (SQL injection, XSS, CSRF, mass assignment)
- Audit RLS middleware for all tenant tables
- Verify idempotency enforcement on all mutating endpoints
- Run `npm audit` and `composer audit`
- Check for hardcoded secrets in codebase
- Add security headers CSP, HSTS, X-Frame-Options

### 4.2 — Performance Baseline
- Run k6 load test on critical paths: login, board list, item CRUD, CRM pipeline
- Establish baseline: p50, p95, p99 response times
- Identify slow queries (>100ms)
- Add database indexes where missing
- Configure Redis caching for frequent queries

### 4.3 — Test Coverage Expansion
- Target: 80%+ code coverage on API controllers
- Every endpoint must have a feature test
- Add missing tests:
  - CRM: leads, sequences, call logs, quotas, forecasting
  - ERP: purchase orders, sales orders, inventory
  - Email: accounts, threads, AI suggestions
  - Support: tickets, SLA, knowledge base
  - Marketing: campaigns, email templates, segments

### 4.4 — E2E Test Fix
- Fix 7 failing Chromium E2E tests
- Fix 12 Firefox E2E tests (sessionStorage + rate limiter)
- Add E2E smoke tests for:
  - CRM pipeline drag-and-drop
  - ERP invoice creation flow
  - Settings tab navigation
  - Subscription plan upgrade

### 4.5 — CI/CD Pipeline Finalization
- `.github/workflows/ci.yml`:
  - PHP lint (Pint)
  - PHPStan analysis
  - PHPUnit tests (parallel)
  - npm lint + typecheck
  - npm test
  - npm build
  - E2E tests (Chromium + Firefox)
  - Semgrep SAST
  - Trivy container scan
  - k6 load test (nightly)
- `.github/workflows/deploy.yml`:
  - Docker build + push
  - DB migration
  - Health check
  - Rollback on failure

### 4.6 — Documentation Sync
- Update `Aquerii_superprompt.md` to match actual codebase
- Write README with project overview, stack, setup instructions
- Write API documentation (auto-generated from OpenAPI specs)
- Write deployment guide
- Write admin guide

### 4.7 — Monitoring & Alerting
- Verify Grafana dashboards for all services
- Set up alerts:
  - API 5xx rate > 1%
  - Queue backlog > 100
  - DB connection pool > 80%
  - Redis memory > 80%
- Configure Loki log aggregation
- Set up uptime monitoring (status page)

## CI Gate
```bash
pint --test && phpstan analyse && php artisan test --parallel && npm run build && npm run test:e2e
```

## Commit Strategy
1. `chore(security): fix Semgrep findings and add security headers`
2. `chore(perf): add database indexes and Redis caching`
3. `test: add feature tests for CRM, ERP, Email, Support, Marketing`
4. `test: fix E2E tests for Chromium and Firefox`
5. `ci: finalize CI/CD pipeline with all stages`
6. `docs: sync documentation with codebase reality`
7. `chore(ops): configure monitoring alerts and dashboards`
