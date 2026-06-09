# Phase 1 Tasks — Core Infrastructure (PRODUCTION-GRADE)

**Phase**: Weeks 3-5  
**Owner**: Team Alpha (Core Infrastructure)  
**Goal**: Deploy all foundational infrastructure so that Phase 2 service deployments have a stable, secure, observable base to land on.

---

## Prerequisites (Must be complete before Phase 1 starts)

- [ ] Phase 0 exit criteria met (all 15 tasks complete, CCB sign-off)
- [ ] Server hardware/VM provisioned (staging + production specs from ENVIRONMENTS.md)
- [ ] DNS configured: `*.minesystem.local` resolves to server IP
- [ ] Git repo accessible from CI runner
- [ ] All team members have read STANDARDS.md and SECURITY_BASELINE.md

---

## T1.1: Docker Compose Core Stack (PostgreSQL, Redis, MinIO, Vault)

**Owner**: Team Alpha (Infra Lead)  
**Agent**: A09 infra-monitor + R02 security-auditor  
**Duration**: 1.5 days  

**Detailed Steps**:
1. Create `infra/docker-compose.core.yml` (see INFRA_AS_CODE.md template)
2. Deploy PostgreSQL 15.6-alpine with 6 databases:
   - `gateway_db` (FastAPI Gateway)
   - `inventree_db`
   - `aureusrep_db`
   - `twenty_db`
   - `paperless_db`
   - `yetiforce_db`
3. Configure PostgreSQL: `max_connections=200`, `shared_buffers=256MB`, WAL archiving enabled
4. Deploy Redis 7.2-alpine with `appendonly yes`, `maxmemory 512mb`, `maxmemory-policy allkeys-lru`
5. Deploy MinIO: create buckets `backups`, `documents`, `exports`
6. Deploy HashiCorp Vault 1.15 (see T1.5 for initialization)
7. Set all containers to non-root user (verify with `docker inspect`)
8. Verify all containers on `core_network`
9. Run `pg_isready` against all 6 databases from gateway container
10. Run Redis `PING` from gateway container

**Acceptance Criteria**:
- [ ] All 4 services (Postgres, Redis, MinIO, Vault) healthy (`docker ps` shows `healthy`)
- [ ] `pg_isready -h postgres -p 5432 -U postgres` returns "accepting connections" for all 6 DBs
- [ ] `redis-cli -h redis PING` returns `PONG`
- [ ] MinIO console accessible at port 9001; all 3 buckets created
- [ ] All containers running as non-root (UID ≠ 0)
- [ ] Test: `pytest tests/infra/test_core_stack.py`

---

## T1.2: Caddy Reverse Proxy + TLS

**Owner**: Team Alpha (Networking Lead)  
**Agent**: R02 security-auditor + G01 security  
**Duration**: 1 day  

**Detailed Steps**:
1. Create `infra/caddy/Caddyfile` with routes for all services (see INFRA_AS_CODE.md)
2. Configure TLS: staging uses self-signed cert (mkcert); production uses ACME/Let's Encrypt
3. Configure HTTP → HTTPS redirect (automatic in Caddy)
4. Set security headers in Caddy (HSTS, X-Frame-Options, CSP, etc.)
5. Configure access logs (JSON format, to stdout)
6. Wire to `dmz_network` only; other services on `app_network` only
7. Configure upstream health checks (Caddy active health check per upstream)
8. Test each route resolves correctly

**Routes to Configure**:
```
homarr.minesystem.local       → homarr:7575
gateway.minesystem.local      → gateway:8000
inventree.minesystem.local    → inventree-web:8080
erp.minesystem.local          → aureusrep-web:80
crm.minesystem.local          → twenty-web:3000
paperless.minesystem.local    → paperless-ngx:8000
yetiforce.minesystem.local    → yetiforce-web:80
signoz.minesystem.local       → signoz-frontend:3301
zulip.minesystem.local        → zulip:80
huixiangdou.minesystem.local  → huixiangdou:7860
```

**Acceptance Criteria**:
- [ ] All routes accessible via HTTPS with no certificate warnings (staging)
- [ ] `curl -I https://gateway.minesystem.local` returns 200 with HSTS header
- [ ] HTTP request to any route is auto-redirected to HTTPS (301)
- [ ] Non-existent subdomain returns 404 (not exposing upstream errors)
- [ ] TLS version: TLS 1.2 minimum (verify with `nmap --script ssl-enum-ciphers`)
- [ ] Security headers present in all responses
- [ ] Caddy logs accessible and structured (JSON)

---

## T1.3: Homarr Dashboard — Basic Tiles

**Owner**: Team Alpha  
**Agent**: R08 docs-writer + O05 excalidraw  
**Duration**: 0.5 days  

**Detailed Steps**:
1. Deploy Homarr container on `app_network`
2. Configure basic service tiles (links to each service UI)
3. Add health-check indicators per tile (ping each service /health)
4. Add SigNoz tile (monitoring)
5. Save Homarr config to persistent volume (not lost on restart)

**Phase 1 Tiles (basic — Phase 4 adds widgets)**:
- InvenTree, AureusERP, Twenty CRM, Paperless-ngx, YetiForce, SigNoz, Zulip, Vault, MinIO

**Acceptance Criteria**:
- [ ] Homarr loads at `homarr.minesystem.local`
- [ ] All basic service tiles present and clicking opens correct URL
- [ ] Health indicators show green for deployed services
- [ ] Config persists after container restart

---

## T1.4: SigNoz Observability Stack

**Owner**: Team Alpha (Monitoring Lead)  
**Agent**: R03 performance + A09 infra-monitor  
**Duration**: 1.5 days  

**Detailed Steps**:
1. Deploy SigNoz stack: `signoz`, `clickhouse`, `otel-collector` (see INFRA_AS_CODE.md)
2. Configure ClickHouse data retention: 30 days traces, 90 days metrics
3. Configure OpenTelemetry Collector pipelines (OTLP gRPC on 4317, HTTP on 4318)
4. Configure receiver for: OTLP, Prometheus scrape, Docker stats
5. Create initial SigNoz dashboards (4 dashboards per MONITORING_RUNBOOKS.md):
   - Gateway Performance
   - Business Operations
   - Infrastructure Health
   - Event Bus Health
6. Configure Zulip alert channel integration (after T4.2 — placeholder in Phase 1)
7. Verify collector receives data from a test span

**Acceptance Criteria**:
- [ ] SigNoz UI loads at `signoz.minesystem.local`
- [ ] Send test trace: `curl -X POST http://signoz-otel:4318/v1/traces` with OTLP payload → appears in SigNoz within 60s
- [ ] Prometheus metrics endpoint at `otel-collector:8889/metrics` returning data
- [ ] All 4 dashboards created (empty — will populate when services send data)
- [ ] ClickHouse data retention configured correctly (verify via ClickHouse client)

---

## T1.5: HashiCorp Vault Initialization

**Owner**: Team Alpha (Security Lead)  
**Agent**: R02 security-auditor + G01 security  
**Duration**: 1 day  

**Detailed Steps**:
1. Initialize Vault: `vault operator init -key-shares=5 -key-threshold=3`
2. Store unseal keys and root token in secure offline location (document procedure)
3. Create unseal script (requires 3 of 5 keys — never auto-unseal in this configuration)
4. Enable KV v2 secrets engine at `secret/`
5. Create access policies per service (see SECURITY_BASELINE.md)
6. Enable AppRole auth method for service authentication
7. Create AppRole per service (gateway, inventree, aureusrep, twenty, paperless, yetiforce)
8. Store all service API tokens discovered in Phase 2 setup (placeholders for now)
9. Store JWT RS256 key pair (generate in T3.2, store here)
10. Document Vault path structure in `plans/SECURITY_BASELINE.md`

**Vault Path Structure**:
```
secret/gateway/jwt_private_key
secret/gateway/jwt_public_key
secret/inventree/api_token
secret/aureusrep/api_token
secret/twenty/api_token
secret/paperless/api_token
secret/yetiforce/api_key
secret/postgres/admin_password
secret/redis/password
secret/minio/access_key
secret/minio/secret_key
```

**Acceptance Criteria**:
- [ ] Vault initialized and unsealed
- [ ] `vault status` shows `Initialized: true`, `Sealed: false`
- [ ] All 11 secret paths created (with placeholder values where service not yet deployed)
- [ ] AppRole auth works: `vault write auth/approle/login role_id=... secret_id=...` returns token
- [ ] Gateway AppRole can only read its own secrets (policy enforced — test with other service path → 403)
- [ ] Vault UI accessible at port 8200 (behind Caddy only, not public)
- [ ] Test: `pytest tests/infra/test_vault.py`

---

## T1.6: RBAC Model Implementation

**Owner**: Team Alpha (Security Lead)  
**Agent**: R02 security-auditor + G01 security  
**Duration**: 1 day  

**6 Roles**:
| Role | Description | Services Accessible |
|------|-------------|-------------------|
| `admin` | Full system access | All |
| `manager` | Business operations | InvenTree (write), AureusERP (write), CRM (write) |
| `operator` | Day-to-day ops | InvenTree (write), AureusERP (read), CRM (read) |
| `viewer` | Read-only dashboards | All (read-only) |
| `service` | Machine-to-machine | Gateway internal only |
| `readonly` | External auditors | All (read-only, no sensitive data) |

**Detailed Steps**:
1. Implement roles as JWT claims in Gateway auth module (T3.2 will implement full JWT)
2. Create RBAC permission matrix (role → allowed endpoints)
3. Create test fixtures: one user per role with test JWT
4. Implement route-level permission checks (FastAPI dependencies)
5. Test each role against forbidden routes (expect 403)
6. Document RBAC in SECURITY_BASELINE.md

**Acceptance Criteria**:
- [ ] All 6 roles defined with documented permissions
- [ ] Test: `manager` role cannot access `/api/admin/*` (403)
- [ ] Test: `viewer` role cannot POST to any write endpoint (403)
- [ ] Test: `service` role can only access internal Gateway routes
- [ ] Test: `pytest tests/unit/test_rbac.py` (18 tests covering all role/route combos)

---

## T1.7: Docker Network Topology

**Owner**: Team Alpha (Infra Lead)  
**Agent**: R01 architect + A09 infra-monitor  
**Duration**: 0.5 days  

**4 Networks**:
```yaml
networks:
  core_network:     # PostgreSQL, Redis, MinIO, Vault — NO direct external access
    driver: bridge
    ipam: {config: [{subnet: 172.20.0.0/24}]}
  app_network:      # All application services + Gateway — talks to core_network
    driver: bridge
    ipam: {config: [{subnet: 172.21.0.0/24}]}
  monitoring_network: # SigNoz, otel-collector — all services send telemetry here
    driver: bridge
    ipam: {config: [{subnet: 172.22.0.0/24}]}
  dmz_network:      # Caddy only — internet-facing
    driver: bridge
    ipam: {config: [{subnet: 172.23.0.0/24}]}
```

**Acceptance Criteria**:
- [ ] All 4 networks created with correct subnets
- [ ] Core services (Postgres, Redis) NOT accessible from dmz_network (verify with `docker network inspect`)
- [ ] Gateway on `app_network` + `monitoring_network` (sends telemetry)
- [ ] Caddy on `dmz_network` + `app_network` only (not on core_network)
- [ ] No container on all 4 networks simultaneously
- [ ] Network isolation test: attempt to connect to postgres from dmz_network container → fails

---

## T1.8: Backup Infrastructure

**Owner**: Team Alpha (Ops Lead)  
**Agent**: A09 infra-monitor + R06 debugger  
**Duration**: 1 day  

**Detailed Steps**:
1. Deploy `backup-runner` container (custom image: pg_dump + mc CLI + cron)
2. Configure daily PostgreSQL backup: 02:00 UTC — dumps all 6 databases
3. Upload backups to MinIO `backups/` bucket with timestamp prefix
4. Configure MinIO lifecycle policy: delete backups older than 30 days
5. Create backup verification script: restore to temp DB, run `pg_dump` size check
6. Configure Zulip notification on backup success/failure (placeholder until T4.2)
7. Test full restore procedure: drop DB, restore from backup, verify row counts

**Backup naming**: `backups/postgres/{db_name}/{YYYY-MM-DD}/{db_name}_{timestamp}.sql.gz`

**Acceptance Criteria**:
- [ ] Daily backup cron running (`crontab -l` shows entry)
- [ ] After first run: backup files visible in MinIO `backups/` bucket
- [ ] Restore test: `inventree_db` restored from backup; row count matches original
- [ ] Total backup time < 10 minutes for all 6 databases
- [ ] Backup file size > 0 bytes (not empty dumps)
- [ ] MinIO lifecycle policy active (verify via MinIO console)

---

## T1.9: Staging Environment Configuration

**Owner**: Team Alpha (DevOps Lead)  
**Agent**: A08 deploy-guardian + R02 security-auditor  
**Duration**: 1 day  

**Detailed Steps**:
1. Configure staging server per ENVIRONMENTS.md spec
2. Create `infra/docker-compose.staging.yml` (overrides for staging)
3. Create staging-specific Caddy config (`*.minesystem.staging`)
4. Create data refresh script: anonymize and copy subset of prod data to staging
5. Configure staging secrets in Vault (separate Vault instance or namespace)
6. Document staging vs. production differences in ENVIRONMENTS.md
7. Verify CI/CD pipeline can deploy to staging automatically on `main` branch push

**Acceptance Criteria**:
- [ ] Staging server accessible and all Phase 1 services running on staging
- [ ] Staging Caddy serving HTTPS at `*.minesystem.staging`
- [ ] Data refresh script runs without error (dry run with empty databases OK in Phase 1)
- [ ] CI pipeline deploys to staging automatically (push to main → staging updated within 10 min)
- [ ] Staging Vault has separate credentials from production

---

## T1.10: Phase 1 Security Gate

**Owner**: Security Lead  
**Agent**: G01 security + R02 security-auditor  
**Duration**: 0.5 days  

**G01 Checklist**:
- [ ] All containers running as non-root
- [ ] No secrets in environment variables (all via Vault)
- [ ] No `:latest` Docker image tags in use
- [ ] TLS enforced on all routes (HTTP redirects to HTTPS)
- [ ] Vault initialized; access policies in place
- [ ] RBAC model implemented and tested
- [ ] No services exposed directly to host except Caddy (ports 80/443)
- [ ] PostgreSQL not accessible from outside `core_network`
- [ ] Redis password set (not open)
- [ ] Trivy scan: 0 critical CVEs in deployed images

**Sign-off**: Record in `plans/PLAN_REVIEW.md` Phase 1→2 gate section.

---

## Phase 1 Exit Criteria

- [ ] All 10 tasks complete (T1.1–T1.10)
- [ ] All services healthy (`docker ps --filter status=running` shows all Phase 1 containers)
- [ ] SigNoz collecting telemetry
- [ ] Caddy routing all services via HTTPS
- [ ] Vault initialized and all secret paths created
- [ ] RBAC model tested
- [ ] Backup running and restore tested
- [ ] Staging environment configured
- [ ] Phase 1 security gate passed (G01 sign-off in PLAN_REVIEW.md)
- [ ] No P0/P1 open issues

---

*Owner: Team Alpha (Core Infrastructure)*  
*Agent Support: A09, R01, R02, R03, R06, R08, G01, G02, A08, O05*
