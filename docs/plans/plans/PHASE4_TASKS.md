# Phase 4 Tasks — UX, Hardening & Go-Live (PRODUCTION-GRADE)

**Phase**: Weeks 13-16  
**Owner**: Team Delta (UX) + Team Gamma support  
**Goal**: Complete the user-facing layer, harden the system through penetration testing and chaos engineering, conduct UAT with business stakeholders, and achieve production go-live approval.

---

## Prerequisites (Must be complete before Phase 4 starts)

- [ ] Phase 3 exit criteria met (CCB sign-off in PLAN_REVIEW.md)
- [ ] All 3 critical sync flows working end-to-end (stock sync, deal-to-invoice, OCR→AI)
- [ ] Integration test suite: 100% pass
- [ ] Load test at 2x load: all SLOs met
- [ ] DLQ: 0 depth after 24h clean run
- [ ] Phase 3 security gate passed (G01 sign-off)
- [ ] Zulip deployment (needed for T4.2) — can deploy in parallel with Phase 3 end

---

## T4.1: Homarr Dashboard — All Tiles + Live Widgets

**Owner**: Team Delta  
**Agent**: O05 excalidraw + R08 docs-writer  
**Duration**: 1.5 days  

**10 Service Tiles**:
1. InvenTree (link + health indicator)
2. AureusERP (link + health indicator)
3. Twenty CRM (link + health indicator)
4. Paperless-ngx (link + health indicator)
5. YetiForce CRM (link + health indicator)
6. SigNoz (link + health indicator)
7. Zulip (link)
8. Vault (link — admin only tile)
9. HuixiangDou AI (link)
10. Excalidraw (link)

**4 Live Widgets** (auto-refresh every 60s via Gateway API):
1. **Stock Alert Widget**: count of parts below reorder point (red if > 0) — `GET /api/v1/inventory/low-stock/count`
2. **Overdue Invoices Widget**: count + total value of overdue invoices — `GET /api/v1/erp/invoices/overdue/summary`
3. **Open Deals Widget**: count of open deals by pipeline stage — `GET /api/v1/crm/deals/summary`
4. **System Health Widget**: traffic-light status for all services — `GET /api/v1/health/services`

**Detailed Steps**:
1. Configure all 10 service tiles in Homarr with correct URLs and icons
2. Configure health check per tile (ping each service `/health` endpoint)
3. Implement 4 custom widget endpoints on Gateway
4. Configure Homarr iframe or custom widget blocks for live data
5. Set widget auto-refresh to 60 seconds
6. Role-based tile visibility: Vault tile only visible to `admin` role
7. Save config to persistent volume

**Acceptance Criteria**:
- [ ] All 10 service tiles load and click through to correct service
- [ ] Health indicators: green for all healthy services
- [ ] Health indicator turns red within 60s of a service going down
- [ ] All 4 live widgets display real data
- [ ] Widgets refresh automatically without page reload
- [ ] Vault tile not visible to non-admin roles
- [ ] Config survives Homarr container restart
- [ ] Test: `pytest tests/e2e/test_homarr_dashboard.py`

---

## T4.2: Zulip ChatOps Integration

**Owner**: Team Delta  
**Agent**: R08 docs-writer + A07 incident-responder  
**Duration**: 1 day  

**Zulip Channels to Create**:
| Channel | Purpose | Alert Sources |
|---------|---------|--------------|
| `#alerts-critical` | P0/P1 incidents | SigNoz, A07 incident-responder |
| `#alerts-warnings` | P2 warnings | SigNoz, DLQ depth |
| `#inventory` | Stock events | Gateway stock sync, auto-PO |
| `#finance` | Invoice/payment events | Gateway deal-to-invoice, overdue tracker |
| `#deployments` | Deploy events | CI/CD pipeline |
| `#system-health` | Daily health summaries | A09 infra-monitor |

**Detailed Steps**:
1. Deploy Zulip container (if not already running from Phase 1 placeholder)
2. Configure Zulip organization: name, logo, timezone
3. Create all 6 channels with correct permissions
4. Create Zulip bot account for Gateway alerts (credentials → Vault)
5. Store Zulip bot API key in Vault at `secret/zulip/bot_api_key`
6. Connect SigNoz alert rules to Zulip `#alerts-critical` and `#alerts-warnings`
7. Wire Gateway event handlers to send Zulip notifications on key events
8. Wire CI/CD pipeline to post deploy notifications to `#deployments`
9. Test end-to-end: trigger test alert → verify appears in Zulip within 30s

**Zulip Message Format**:
```
[P1 ALERT] Service: gateway | Error: DLQ depth > 50 events
Time: 2026-05-04 14:32:01 UTC | Trace: abc123
Runbook: https://docs.minesystem.local/runbooks/dlq-growing
```

**Acceptance Criteria**:
- [ ] All 6 channels created
- [ ] Bot API key in Vault
- [ ] Test SigNoz alert fires → message appears in `#alerts-critical` within 30s
- [ ] Auto-PO created → message appears in `#inventory` within 30s
- [ ] Invoice created from deal → message appears in `#finance` within 30s
- [ ] Deploy event → message in `#deployments`
- [ ] Test: `pytest tests/integration/test_zulip_notifications.py`

---

## T4.3: HuixiangDou Knowledge Base Population

**Owner**: Team Delta  
**Agent**: A11 etl-pipeline + R08 docs-writer  
**Duration**: 2 days  

**Knowledge Sources to Index**:
1. **InvenTree part catalog** (all parts, descriptions, specs) — exported via Gateway API
2. **Paperless-ngx documents** (full text, after OCR) — `document.ocr.complete` events
3. **AureusERP product catalog** — exported via Gateway API
4. **Plans documentation** (`plans/*.md`) — indexed as operational knowledge base
5. **User guides** (written in T4.8) — indexed after creation

**Detailed Steps**:
1. Deploy HuixiangDou from `HuixiangDou-main/` source
2. Configure embedding model and LLM backend
3. Implement initial bulk indexing script: fetch all parts from InvenTree → index in HuixiangDou
4. Implement initial bulk indexing: fetch all products from AureusERP → index
5. Implement incremental indexing: `document.ocr.complete` event handler already indexes docs (T3.14)
6. Index all `plans/*.md` files as operational documentation
7. Configure HuixiangDou retrieval parameters (top-k, similarity threshold)
8. Test: ask "What is the reorder point for BOLT-M6?" → correct answer returned

**Acceptance Criteria**:
- [ ] HuixiangDou accessible at `huixiangdou.minesystem.local`
- [ ] InvenTree catalog indexed: ≥ 90% of parts queryable
- [ ] AureusERP products indexed
- [ ] Plans documentation queryable: "What is the RBAC model?" returns correct info
- [ ] Sample Paperless document queryable
- [ ] Test: `pytest tests/integration/test_huixiangdou_queries.py` (5 sample query tests)
- [ ] Response time: P99 < 10s per query

---

## T4.4: Excalidraw Collaborative Boards

**Owner**: Team Delta  
**Agent**: O05 excalidraw + R08 docs-writer  
**Duration**: 0.5 days  

**Detailed Steps**:
1. Deploy Excalidraw from `excalidraw-master/` source
2. Configure persistent board storage (MinIO or volume)
3. Create initial architecture board (export from O05 excalidraw agent)
4. Configure team access (all team members)
5. Add Excalidraw tile to Homarr

**Boards to Pre-create**:
- "System Architecture" — high-level topology diagram
- "Integration Flows" — event bus flows
- "Network Topology" — Docker networks + ports

**Acceptance Criteria**:
- [ ] Excalidraw accessible at `excalidraw.minesystem.local`
- [ ] Boards persist after browser close
- [ ] Architecture board pre-populated
- [ ] Multiple users can view boards (share link works)

---

## T4.5: Flowchart AI Integration + Patent Pipeline

**Owner**: Team Delta  
**Agent**: R01 architect + R04 test-writer  
**Duration**: 1.5 days  

**Pipeline**: Upload PDF (patent or technical doc) → pdfplumber extracts tables/text → Flowchart AI generates diagram → export to Excalidraw

**Detailed Steps**:
1. Deploy Flowchart AI from `flowchart-ai-main/` source
2. Integrate `pdfplumber-stable/` for PDF table/text extraction
3. Create Gateway endpoint: `POST /api/v1/documents/analyze` (accepts PDF, returns diagram)
4. Wire `GenFlowchart.py` from `flowchart-ai-main/GenFlowchart.py`
5. Configure output formats: JSON (Excalidraw-compatible) + SVG
6. Test with a sample patent PDF: upload → get flowchart output
7. Create Homarr tile for Flowchart AI UI

**Acceptance Criteria**:
- [ ] `POST /api/v1/documents/analyze` with sample PDF → returns diagram JSON within 60s
- [ ] Diagram JSON importable into Excalidraw
- [ ] Flowchart AI UI accessible at `flowchart.minesystem.local`
- [ ] Test: `pytest tests/integration/test_flowchart_pipeline.py`

---

## T4.6: Mobile PWA (Homarr + InvenTree)

**Owner**: Team Delta  
**Agent**: R05 code-reviewer + R04 test-writer  
**Duration**: 1 day  

**Detailed Steps**:
1. Verify InvenTree is PWA-installable (manifest.json, service worker)
2. Verify Homarr is mobile-responsive (breakpoints, touch targets)
3. Test QR code scanning via mobile camera (stock adjustments from phone)
4. Test on: iOS Safari, Android Chrome
5. Fix any critical mobile layout issues (overflow, font size, touch targets)
6. Verify offline capability: Homarr tiles still show last-known state when offline

**Acceptance Criteria**:
- [ ] Homarr: installable as PWA on Android Chrome and iOS Safari
- [ ] InvenTree: installable as PWA; stock adjustment works on mobile
- [ ] QR scan on mobile camera opens correct InvenTree part
- [ ] No horizontal scroll on any page at 375px viewport width
- [ ] Touch targets ≥ 44px (WCAG AA)
- [ ] Test: `pytest tests/e2e/test_mobile_pwa.py` (Playwright mobile viewport tests)

---

## T4.7: SigNoz Final Dashboards + Alerts

**Owner**: Team Delta (Monitoring Lead)  
**Agent**: R03 performance + A09 infra-monitor  
**Duration**: 1 day  

**Final Dashboard Configuration** (4 dashboards, per MONITORING_RUNBOOKS.md):

**Dashboard 1: Gateway Performance**
- Request rate (rpm)
- P50/P95/P99 latency
- Error rate by endpoint
- Circuit breaker states

**Dashboard 2: Business Operations**
- Events processed/hour
- DLQ depth
- Stock sync lag (low stock → PO time)
- Deal-to-invoice lag

**Dashboard 3: Infrastructure Health**
- Container CPU/memory per service
- PostgreSQL: connections, query time, replication lag
- Redis: memory, keyspace hits, connected clients
- Disk usage per volume

**Dashboard 4: Event Bus Health**
- Events ingested/hour
- Events processed/hour
- Retry count by event type
- DLQ depth by event type

**8 Alert Rules** (YAML in MONITORING_RUNBOOKS.md):
1. Gateway error rate > 1% for 5min → `#alerts-critical`
2. DLQ depth > 10 → `#alerts-warnings`
3. Circuit breaker OPEN (any) → `#alerts-critical`
4. P99 latency > 2s for 5min → `#alerts-warnings`
5. Any container down > 60s → `#alerts-critical`
6. Disk usage > 85% → `#alerts-warnings`
7. DB connections > 80% of max → `#alerts-warnings`
8. Backup failed → `#alerts-critical`

**Acceptance Criteria**:
- [ ] All 4 dashboards fully populated with real data (not empty)
- [ ] All 8 alert rules active in SigNoz
- [ ] Test alert: manually trigger DLQ depth > 10 → Zulip message received within 2min
- [ ] All dashboard panels rendering (no "No data" panels)

---

## T4.8: User Training Materials

**Owner**: Team Delta  
**Agent**: R08 docs-writer  
**Duration**: 2 days  

**Materials Required** (one guide per persona from USER_PERSONAS.md):
1. **Warehouse Operator Guide**: InvenTree stock management, QR scanning, stocktake, part lookup
2. **Finance Manager Guide**: AureusERP invoicing, PO approval, monthly close, report generation
3. **Sales Manager Guide**: Twenty CRM pipeline, deal management, contact management
4. **System Admin Guide**: Vault management, backup procedures, Homarr, SigNoz, deployment
5. **Executive Guide**: Homarr dashboard reading, AI assistant queries, KPI interpretation

**Per Guide**:
- Step-by-step task walkthroughs (screenshot-ready)
- Common errors and resolutions
- Who to contact for issues
- Quick-reference card (1 page)

**Acceptance Criteria**:
- [ ] All 5 guides written and stored in `plans/training/`
- [ ] Each guide reviewed by one team member for accuracy
- [ ] Quick-reference cards created for each persona
- [ ] Training schedule drafted (timing relative to go-live)

---

## T4.9: Staging UAT — Business Stakeholders

**Owner**: Team Delta + Team Beta  
**Agent**: A06 erp-admin + R08 docs-writer  
**Duration**: 3 days  

**5 UAT Personas** (from USER_PERSONAS.md):

**Warehouse Operator Scenarios**:
- [ ] Receive stock against a Purchase Order in InvenTree
- [ ] Perform a stocktake for one location
- [ ] Scan a QR code and adjust stock quantity
- [ ] Look up a part and view its BOM

**Finance Manager Scenarios**:
- [ ] View and approve an auto-generated PO in AureusERP
- [ ] Create a manual invoice and send to customer
- [ ] Run aged debtors report
- [ ] Mark an invoice as paid

**Sales Manager Scenarios**:
- [ ] Create a new deal and move it through the pipeline to Won
- [ ] Verify invoice was auto-created in AureusERP after deal Won
- [ ] Add a note to a contact
- [ ] Export contact list

**System Admin Scenarios**:
- [ ] View all service health in Homarr
- [ ] Access SigNoz and find a specific trace by correlation_id
- [ ] Manually replay a DLQ event
- [ ] Verify last backup succeeded

**Executive Scenarios**:
- [ ] View Homarr dashboard and interpret all 4 widgets
- [ ] Ask HuixiangDou AI assistant: "How many parts are below reorder point?"
- [ ] View overdue invoices widget

**Acceptance Criteria**:
- [ ] All 5 personas complete all assigned scenarios without blocking errors
- [ ] UAT sign-off form signed by each stakeholder persona
- [ ] All UAT-raised issues logged and triaged (P0/P1 must be fixed before go-live)
- [ ] UAT report filed in `plans/UAT_REPORT.md`

---

## T4.10: Penetration Test

**Owner**: Security Lead  
**Agent**: G07 red-team + R02 security-auditor  
**Duration**: 3 days  

**Scope**:
- All services accessible via Caddy (external attack surface)
- Gateway API (authentication bypass, injection, rate limit bypass)
- InvenTree, AureusERP, Twenty, Paperless, YetiForce web UIs
- Internal network segmentation (can attacker pivot from dmz to core?)

**Test Categories** (OWASP Top 10 + infrastructure):
1. Authentication bypass (JWT attacks, session fixation)
2. Authorization bypass (RBAC circumvention, IDOR)
3. SQL injection (all input points)
4. XSS (all web UIs)
5. SSRF (Gateway proxy endpoints)
6. Rate limit bypass
7. Secrets exposure (headers, responses, error messages)
8. Container escape (if in scope)
9. Network pivot (dmz → core_network)
10. TLS/cipher weaknesses

**Acceptance Criteria**:
- [ ] **0 Critical findings** (must fix before go-live — no exceptions)
- [ ] **0 High findings** (must fix before go-live — no exceptions)
- [ ] Medium findings: fix plan documented; fix within 30 days post-go-live
- [ ] G07 red-team report filed in `plans/PENTEST_REPORT.md`
- [ ] All Critical/High findings re-tested after fix and confirmed closed

---

## T4.11: Chaos Engineering Tests

**Owner**: Team Gamma  
**Agent**: R06 debugger + R04 test-writer  
**Duration**: 2 days  

**Chaos Scenarios**:

| Scenario | Method | Expected Behavior |
|----------|--------|------------------|
| Kill Gateway container | `docker stop gateway` | Services degrade; events queue in InvenTree plugin; Gateway restarts within 30s |
| Kill PostgreSQL | `docker stop postgres` | Gateway returns 503 with helpful message; no data loss; recovers when Postgres restarts |
| Kill Redis | `docker stop redis` | Event bus pauses; circuit breakers trip; recovers when Redis restarts |
| Network partition: core_network isolated | `docker network disconnect` | App services get 503 from Gateway; core restores within 60s |
| Disk full (inject on volumes) | `fallocate -l 10G /tmp/fill` | Services log errors; alerts fire in Zulip; no data corruption |
| InvenTree down | `docker stop inventree-web` | Gateway circuit breaker trips; 503 returned to callers; breaker recovers when InvenTree restarts |
| AureusERP down | `docker stop aureusrep-web` | Auto-PO events go to DLQ; DLQ alert fires; replayed when AureusERP returns |
| High CPU (stress test) | `stress --cpu 8` | P99 latency degrades but SLO not breached; throttling kicks in |
| Memory pressure | `stress --vm 2 --vm-bytes 4G` | OOM killer fires; container restarts; no persistent corruption |

**Acceptance Criteria**:
- [ ] All 9 chaos scenarios executed on staging
- [ ] Each scenario: system recovers without manual intervention (except disk full)
- [ ] No data loss or corruption in any scenario
- [ ] Zulip alerts fired correctly in each scenario
- [ ] DLQ events replayed successfully after service recovery
- [ ] Chaos test results documented in `plans/CHAOS_REPORT.md`

---

## T4.12: Final Load Test (Production Specification)

**Owner**: Team Gamma  
**Agent**: R03 performance + G05 performance  
**Duration**: 1 day  

**Load Profile** (Locust):
- Ramp-up: 0 → 100 concurrent users over 5 minutes
- Sustain: 100 concurrent users for 30 minutes
- Spike: 200 concurrent users for 5 minutes (2x expected peak)
- Ramp-down: 200 → 0 over 5 minutes

**Endpoints to Test**:
- `GET /api/v1/inventory/parts` (most common)
- `POST /events/ingest` (event ingestion)
- `GET /api/v1/erp/invoices` (list)
- `POST /api/v1/erp/invoices` (create, with idempotency key)
- `GET /health` (health check — used by load balancer)

**SLO Targets** (must be met at 200 concurrent users):
- P50 latency: < 100ms
- P99 latency: < 500ms
- Error rate: < 0.1%
- Throughput: ≥ 500 req/s
- No memory leaks (memory stable after 30min sustained load)

**Acceptance Criteria**:
- [ ] All SLO targets met at 200 concurrent users (2x expected)
- [ ] No memory growth > 20% during sustained load
- [ ] No circuit breakers tripped during normal load (only spike is acceptable)
- [ ] Locust report archived in `plans/LOAD_TEST_FINAL_REPORT.md`

---

## T4.13: Rollback Plan Final Test

**Owner**: Team Gamma  
**Agent**: R06 debugger + A08 deploy-guardian  
**Duration**: 1 day  

**Test the complete rollback procedure** (from ROLLBACK_PLAN.md):

1. Deploy a "bad" Gateway version to staging (intentionally broken)
2. Detect failure (SigNoz alert fires, health check fails)
3. Execute Gateway rollback: `docker-compose up -d --no-deps gateway` with previous image
4. Verify rollback completes within 30 minutes
5. Verify 0 data loss (check event counts before and after)
6. Test database rollback: apply a test migration, then roll it back with Alembic
7. Test full system rollback: all services to previous versions simultaneously

**Acceptance Criteria**:
- [ ] Gateway rollback completes in < 30 minutes (RTO met)
- [ ] 0 data loss verified (RPO met)
- [ ] Database migration rollback succeeds
- [ ] Full system rollback completes in < 30 minutes
- [ ] Rollback procedure documented with any corrections in ROLLBACK_PLAN.md

---

## T4.14: Documentation Complete

**Owner**: Team Delta  
**Agent**: R08 docs-writer + G02 api-contract  
**Duration**: 2 days  

**Documentation Checklist**:
- [ ] `plans/README.md` — up to date with all ~50 files; all links valid
- [ ] `plans/MASTER_ARCHITECTURE.md` — reflects final production state
- [ ] `plans/API_CONTRACTS.md` — all Gateway endpoints documented with examples
- [ ] `plans/MONITORING_RUNBOOKS.md` — all 8 runbooks complete and tested
- [ ] `plans/ROLLBACK_PLAN.md` — updated from T4.13 test results
- [ ] `plans/TRAINING_PLAN.md` — complete with delivery schedule
- [ ] `services/gateway/README.md` — developer setup guide
- [ ] Per-service deployment notes (one README per service)
- [ ] OpenAPI spec exported and archived: `docs/api/gateway-openapi.json`
- [ ] Architecture decision records (ADRs) for all major decisions (from PLAN_REVIEW.md decision log)

**Acceptance Criteria**:
- [ ] All checklist items complete
- [ ] All internal links in README.md resolve without 404
- [ ] OpenAPI spec validates without errors (`spectral lint`)
- [ ] R08 docs-writer review: all runbooks reviewed and approved

---

## T4.15: Phase 4 Security Gate + Go-Live Approval

**Owner**: Lead Developer + Steering Committee  
**Agent**: G01 security + G07 red-team  
**Duration**: 1 day (CCB meeting)  

**G01 Phase 4 Final Checklist**:
- [ ] Penetration test: 0 Critical, 0 High findings (G07 sign-off)
- [ ] All chaos tests passed
- [ ] Final load test SLOs met
- [ ] Rollback plan tested (< 30 min)
- [ ] All documentation complete
- [ ] UAT signed off by all 5 personas
- [ ] Backup: tested restore within RPO/RTO targets
- [ ] On-call rotation defined and staffed
- [ ] SigNoz all 8 alert rules active
- [ ] Zulip all 6 channels active
- [ ] No P0/P1 open issues
- [ ] No unmitigated Critical/High risks in RISK_REGISTER.md
- [ ] All secrets in Vault (zero secrets in config files or environment)
- [ ] Business stakeholder sign-off obtained

**Go-Live Approval** (from PLAN_REVIEW.md Phase 4→Production gate):
- Signed by: Lead Developer, Lead Architect, Business Sponsor, Steering Committee

**Acceptance Criteria**:
- [ ] All 14 G01 checklist items pass
- [ ] Go-live approval signed by all required parties in PLAN_REVIEW.md
- [ ] Production deployment executed per INFRA_AS_CODE.md + CI_CD_PIPELINE.md
- [ ] Post-deploy smoke test passes (all /health endpoints green)
- [ ] Zulip `#deployments` shows successful production deploy notification

---

## Phase 4 Exit Criteria = Production Go-Live

- [ ] All 15 tasks complete (T4.1–T4.15)
- [ ] All services healthy in production
- [ ] All 3 critical sync flows verified in production (one real transaction each)
- [ ] Monitoring active: SigNoz showing real production traffic
- [ ] Zulip `#system-health` receiving daily health summary
- [ ] HuixiangDou answering queries from production knowledge base
- [ ] Business stakeholders confirmed system operational
- [ ] Hypercare period begins: 2-week enhanced support window

---

*Owner: Team Delta (UX) + Team Gamma (Hardening)*  
*Agent Support: R01, R02, R03, R04, R05, R06, R08, G01, G02, G03, G05, G07, A06, A07, A08, A09, A11, O05*
