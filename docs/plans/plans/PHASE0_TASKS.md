# Phase 0 Tasks — Governance & Planning (PRODUCTION-GRADE)

**Phase**: Weeks 1-2  
**Owner**: Lead Developer + Architect  
**Goal**: Produce all planning artifacts required before a single container is deployed. Every task here is a prerequisite gate for Phase 1.

---

## Prerequisites

- [ ] Git monorepo `mine-system` created; all team members have access
- [ ] `plans/` directory exists
- [ ] All 10 source projects available locally at `E:\Mine System\`

---

## T0.1: Naming Conventions & Standards

**Owner**: Lead Architect  
**Agent**: R01 architect + G02 api-contract  
**Duration**: 0.5 days  
**Output**: `plans/STANDARDS.md`

**Detailed Steps**:
1. Define container naming convention: `{service}-{role}` (e.g., `inventree-web`, `inventree-db`)
2. Define Docker volume naming: `{service}_data`, `{service}_config`
3. Define environment variable naming: `{SERVICE}_{SETTING}` (e.g., `INVENTREE_DB_HOST`)
4. Define database naming: `{service}_db` (e.g., `inventree_db`, `aureusrep_db`)
5. Define Docker network naming: `{layer}_network` (e.g., `core_network`, `app_network`)
6. Define API route naming convention: `/api/v{n}/{resource}` (plural, lowercase, kebab-case)
7. Define event naming: `{domain}.{entity}.{verb}` (e.g., `inventory.stock.low`)
8. Define file/directory structure conventions for `services/gateway/`
9. Define secret naming in Vault: `secret/{service}/{key}`
10. Define metric naming: `mine_{service}_{metric_name}_{unit}`

**Acceptance Criteria**:
- [ ] `plans/STANDARDS.md` created with all 10 categories above
- [ ] At least 3 examples per convention
- [ ] Reviewed and approved by Lead in CCB

---

## T0.2: Security Baseline

**Owner**: Security Lead  
**Agent**: R02 security-auditor + G01 security  
**Duration**: 1 day  
**Output**: `plans/SECURITY_BASELINE.md`

**Detailed Steps**:
1. Define secrets handling policy (Vault only, zero `.env` in production)
2. Define RBAC model: 6 roles (admin, manager, operator, viewer, service, readonly)
3. Define credential storage policy (Vault paths per service)
4. Define TLS policy (TLS 1.2+ only, ciphers allowed)
5. Define container security policy (non-root user, read-only filesystem where possible, no privileged mode)
6. Define network isolation policy (which networks each service can access)
7. Define audit logging requirements (what events must be logged)
8. Define vulnerability scanning policy (images scanned in CI before deploy)
9. Define patch cadence (critical CVEs within 48h, high within 7 days)
10. Define incident classification (P0–P3 definitions, response SLAs)

**Acceptance Criteria**:
- [ ] `plans/SECURITY_BASELINE.md` covers all 10 areas
- [ ] No secrets appear anywhere in the planning repo
- [ ] G01 security sign-off recorded in `plans/PLAN_REVIEW.md`

---

## T0.3: Technology Version Pinning

**Owner**: Lead Architect  
**Agent**: R01 architect  
**Duration**: 0.5 days  
**Output**: `plans/VERSIONS.md`

**Detailed Steps**:
1. Pin Python: `3.11.9`
2. Pin FastAPI: `0.111.0`
3. Pin PostgreSQL image: `postgres:15.6-alpine`
4. Pin Redis image: `redis:7.2-alpine`
5. Pin Node.js: `20.x LTS (20.14.0)`
6. Pin all service Docker images with exact digest or tag (not `:latest`)
7. Pin InvenTree: source from `InvenTree-master/` (local build, tag with commit hash)
8. Pin AureusERP: source from `aureuserp-master/` (local build)
9. Pin Twenty CRM: source from `twenty-main/` (local build)
10. Document rationale for each version selection (LTS, security, compatibility)

**Acceptance Criteria**:
- [ ] `plans/VERSIONS.md` — zero `:latest` tags; all pinned
- [ ] All versions cross-referenced with `plans/INFRA_AS_CODE.md`
- [ ] Compatible versions verified (e.g., Postgres driver version matches Postgres server)

---

## T0.4: Network Map & Port Allocation

**Owner**: Lead Architect  
**Agent**: R01 architect  
**Duration**: 0.5 days  
**Output**: `plans/NETWORK_MAP.md`

**Detailed Steps**:
1. Define 4 Docker networks: `core_network`, `app_network`, `monitoring_network`, `dmz_network`
2. Assign each service to its network(s) — services span max 2 networks
3. Allocate all 25 host ports (document in table: port, service, protocol, notes)
4. Document which services are accessible from host vs. container-only
5. Define Caddy as the ONLY service on `dmz_network` with host port 80/443
6. Document subnet CIDRs to avoid conflicts with host network
7. Create ASCII topology diagram

**Acceptance Criteria**:
- [ ] `plans/NETWORK_MAP.md` with complete port matrix (zero conflicts)
- [ ] Every service assigned to correct network(s)
- [ ] No service except Caddy exposes 80/443 to host

---

## T0.5: API Contracts & Event Catalog

**Owner**: API Lead  
**Agent**: G02 api-contract + R08 docs-writer  
**Duration**: 1.5 days  
**Output**: `plans/API_CONTRACTS.md`

**Detailed Steps**:
1. Define standard request envelope (headers: Idempotency-Key, Authorization, X-Correlation-ID)
2. Define standard response envelope (data, meta, errors fields)
3. Define standard error response format (code, message, field, trace_id)
4. Define all 17 event types with full JSON schema (per MASTER_ARCHITECTURE.md event catalog)
5. Define event envelope: {event_id, event_type, source_service, timestamp, hop_count, correlation_id, payload}
6. Define HMAC signature scheme for InvenTree webhooks
7. Define contract test skeleton (Pact or schema-based) for each service
8. Document versioning strategy (URI versioning: /api/v1/, /api/v2/)
9. Document pagination standard (cursor-based for all list endpoints)
10. Define all Gateway endpoints with request/response schemas

**Acceptance Criteria**:
- [ ] `plans/API_CONTRACTS.md` with all 17 event schemas
- [ ] Standard envelopes defined with JSON Schema snippets
- [ ] All team members reviewed and acknowledged

---

## T0.6: Risk Register

**Owner**: Lead Developer  
**Agent**: R02 security-auditor + G01 security  
**Duration**: 0.5 days  
**Output**: `plans/RISK_REGISTER.md`

**Detailed Steps**:
1. Identify minimum 15 risks across categories: technical, security, operational, business
2. Score each risk: Probability (1-5) × Impact (1-5) = Risk Score
3. Assign owner and mitigation action per risk
4. Mark top-5 risks as "Watch Items" for weekly review
5. Define residual risk threshold (score ≥ 15 = must mitigate before phase start)

**Key Risks to Include**:
- Service version incompatibility discovered late
- InvenTree plugin breaking on InvenTree upgrade
- AureusERP API changes breaking Gateway proxies
- Data loss during migration (seed or prod)
- Vault unsealing failure blocks all services
- Redis outage brings down event bus
- Gateway becomes single point of failure
- Idempotency key collision (two different ops, same key)
- DLQ growing unbounded (workers failing silently)
- Pentest finds critical vulnerability before go-live

**Acceptance Criteria**:
- [ ] `plans/RISK_REGISTER.md` with ≥ 15 risks scored
- [ ] All top-5 risks have documented mitigations
- [ ] Risk register reviewed in first CCB meeting

---

## T0.7: KPIs & SLO Definitions

**Owner**: Lead Developer  
**Agent**: R03 performance + G05 performance  
**Duration**: 0.5 days  
**Output**: `plans/KPIS.md`

**SLOs to Define**:
- Gateway API P99 latency: < 500ms
- Gateway API P50 latency: < 100ms
- Event processing latency (ingest → handler): < 5s
- Stock sync (low stock → PO created): < 30s
- Deal-to-invoice (deal.won → invoice created): < 30s
- System availability: 99.5% monthly (excluding planned maintenance)
- Error rate: < 0.1% of requests result in 5xx
- DLQ depth: 0 after 24h (no stuck events)
- Backup success rate: 100% of scheduled backups
- MTTR (mean time to restore): < 30 minutes

**Acceptance Criteria**:
- [ ] `plans/KPIS.md` with all SLOs and measurement method
- [ ] Prometheus metric name documented per SLO
- [ ] Alert threshold defined for each SLO breach

---

## T0.8: Rollback Plan

**Owner**: DevOps Lead  
**Agent**: R06 debugger  
**Duration**: 0.5 days  
**Output**: `plans/ROLLBACK_PLAN.md`

**Detailed Steps**:
1. Define RPO (Recovery Point Objective): 1 hour max data loss
2. Define RTO (Recovery Time Objective): 30 minutes
3. Document rollback procedure per service (DB migration rollback + container rollback)
4. Document full system rollback procedure
5. Define "point of no return" for each phase (when rollback becomes too costly)
6. Document backup verification steps
7. Script partial rollback (single service) and full rollback procedures
8. Define who has authority to trigger rollback (Lead only, or on-call + Lead)

**Acceptance Criteria**:
- [ ] `plans/ROLLBACK_PLAN.md` with RPO/RTO defined
- [ ] Rollback procedures cover each service individually
- [ ] Full system rollback covered
- [ ] Rollback tested in Phase 4 (T4.13)

---

## T0.9: Testing Strategy

**Owner**: QA Lead  
**Agent**: R04 test-writer + G03 testing  
**Duration**: 1 day  
**Output**: `plans/TESTING_STRATEGY.md`

**Test Levels to Define**:
1. **Unit tests**: pytest, ≥ 80% coverage on Gateway code; each module tested in isolation
2. **Integration tests**: pytest + docker-compose; test actual service interactions
3. **Contract tests**: schema-based; run against each service's API before deploy
4. **End-to-end tests**: critical user journeys (stock sync, deal-to-invoice, OCR pipeline)
5. **Load tests**: Locust; verify SLOs at 2x expected load
6. **Security tests**: OWASP ZAP scan in CI; Trivy image scan in CI
7. **Chaos tests**: Phase 4 only — kill containers, inject latency, fill disk

**Acceptance Criteria**:
- [ ] `plans/TESTING_STRATEGY.md` with all 7 test levels
- [ ] Test file locations documented (`tests/unit/`, `tests/integration/`, etc.)
- [ ] CI pipeline stages mapped to test levels
- [ ] Coverage targets defined per module

---

## T0.10: User Personas

**Owner**: Lead Developer  
**Agent**: R08 docs-writer  
**Duration**: 0.5 days  
**Output**: `plans/USER_PERSONAS.md`

**5 Personas Required**:
1. **Warehouse Operator**: Uses InvenTree daily; stock receipts, QR scanning, stocktakes
2. **Finance Manager**: Uses AureusERP daily; invoices, POs, monthly close, reports
3. **Sales Manager**: Uses Twenty CRM; deal pipeline, contacts, won/lost tracking
4. **System Admin**: Manages all services; Vault, Homarr, SigNoz, backups, deployments
5. **Executive**: Read-only dashboards; Homarr widgets, KPI views, AI assistant queries

**Per Persona**:
- Role description
- Primary tools used
- Key workflows (3+ per persona)
- Permissions required (maps to RBAC roles)
- Acceptance scenarios for UAT (T4.9)

**Acceptance Criteria**:
- [ ] `plans/USER_PERSONAS.md` with all 5 personas
- [ ] Each persona mapped to RBAC role
- [ ] UAT scenarios usable in T4.9

---

## T0.11: Training Plan

**Owner**: Lead Developer  
**Agent**: R08 docs-writer  
**Duration**: 0.5 days  
**Output**: `plans/TRAINING_PLAN.md`

**Content**:
1. Training materials checklist per persona
2. Delivery method (written guides, video walkthroughs)
3. Timeline (training happens during Phase 4 alongside UAT)
4. Sign-off process (each user confirms competency)

**Acceptance Criteria**:
- [ ] `plans/TRAINING_PLAN.md` with materials checklist
- [ ] Linked to USER_PERSONAS.md (one guide per persona)

---

## T0.12: Master Architecture Document

**Owner**: Lead Architect  
**Agent**: R01 architect + G02 api-contract  
**Duration**: 2 days  
**Output**: `plans/MASTER_ARCHITECTURE.md`

**Already complete** — verify these sections exist and are current:
- [ ] §1 System Overview (10-service topology)
- [ ] §2 Service Responsibilities (single source of truth per domain)
- [ ] §3 Architecture Rules (5 rules)
- [ ] §4 Docker Networks (4 networks)
- [ ] §5 Port Allocation (25 ports)
- [ ] §6 Service Startup Order
- [ ] §7 Event Catalog (17 events)
- [ ] §8 Gateway Structure
- [ ] §9 RBAC Matrix
- [ ] §10 Observability Strategy
- [ ] §11 Integration Flows
- [ ] §12 Deployment Environments

---

## T0.13: Service Catalog

**Owner**: Lead Architect  
**Agent**: R01 architect + R08 docs-writer  
**Output**: `plans/SERVICE_CATALOG.md`

**Already complete** — verify current with new services (AureusERP, YetiForce, pdfplumber):
- [ ] All 10 services documented
- [ ] Per-service: tech stack, ports, volumes, API summary, event emissions
- [ ] Cross-references to MASTER_ARCHITECTURE.md

---

## T0.14: Agent Playbooks

**Owner**: Lead Architect  
**Agent**: R01 architect  
**Output**: `plans/AGENT_PLAYBOOKS.md`

**Already complete** — verify all 15 agents have:
- [ ] Trigger conditions
- [ ] Step-by-step process
- [ ] Inputs/outputs
- [ ] Success criteria
- [ ] Escalation rules

---

## T0.15: CI/CD Pipeline Design

**Owner**: DevOps Lead  
**Agent**: A08 deploy-guardian + R02 security-auditor  
**Output**: `plans/CI_CD_PIPELINE.md`

**Already complete** — verify:
- [ ] 7-stage CI pipeline defined
- [ ] CD pipeline with manual production gate
- [ ] Branch strategy documented
- [ ] Deploy/rollback scripts referenced

---

## Phase 0 Exit Criteria

All of the following must be true before Phase 1 starts:

- [ ] All 15 tasks complete (T0.1–T0.15)
- [ ] All output documents exist in `plans/`
- [ ] CCB meeting held; all documents reviewed
- [ ] Phase 0→1 approval signed in `plans/PLAN_REVIEW.md`
- [ ] Risk register: no unmitigated risks with score ≥ 15
- [ ] All team members have read MASTER_ARCHITECTURE.md and STANDARDS.md
- [ ] Git repo initialized; all plans committed; access confirmed for all team members

---

*Owner: Lead Developer + Architect*  
*Agent Support: R01, R02, R03, R04, R06, R08, G01, G02, G03, G05, A08*
