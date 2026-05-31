# Phase 3 Tasks — Integration Layer (PRODUCTION-GRADE)

**Phase**: Weeks 10-12  
**Owner**: Team Gamma (Integration) + Team Beta support  
**Goal**: Build the central FastAPI Gateway, wire all service integrations, implement event-driven automation, and achieve production-grade resilience.

---

## Prerequisites (Must be complete before Phase 3 starts)

- [ ] All Phase 2 services healthy on staging for 48+ hours
- [ ] InvenTree Gateway plugin installed and emitting events
- [ ] All service API tokens stored in Vault
- [ ] PostgreSQL gateway_db created
- [ ] Redis running and accessible from gateway container
- [ ] Phase 2 security gate passed (G01 sign-off)

---

## T3.1: FastAPI Gateway Scaffold

**Owner**: Team Gamma (Gateway Lead)  
**Agent**: R01 architect + G02 api-contract  
**Duration**: 2 days  
**Dependencies**: None (start immediately in Phase 3)

**Detailed Steps**:
1. Create `services/gateway/` directory structure per MASTER_ARCHITECTURE.md §8.1
2. Initialize FastAPI app with lifespan context (startup/shutdown)
3. Configure Pydantic BaseSettings for all config (no raw os.environ)
4. Set up SQLAlchemy async session factory
5. Initialize Alembic for database migrations
6. Create initial migration: events, dlq, idempotency_keys, processed_events tables
7. Add /health endpoint returning service + DB + Redis status
8. Add /metrics endpoint (Prometheus format)
9. Add /docs endpoint (auto-generated OpenAPI)
10. Wire OpenTelemetry instrumentation (see MONITORING_RUNBOOKS.md)
11. Add structured JSON logging via structlog

**Acceptance Criteria**:
- [ ] GET /health returns 200 with all dependencies healthy
- [ ] GET /metrics returns Prometheus metrics
- [ ] GET /docs returns valid OpenAPI spec
- [ ] All migrations run without error
- [ ] Test: `pytest tests/unit/test_health.py` passes
- [ ] Docker image builds and starts in < 60 seconds
- [ ] Traces visible in SigNoz within 60 seconds of first request

---

## T3.2: Auth Middleware (JWT RS256)

**Owner**: Team Gamma (Security Lead)  
**Agent**: R02 security-auditor + G01 security  
**Duration**: 1.5 days  

**Detailed Steps**:
1. Generate RS256 key pair; store in Vault (secret/gateway/jwt_private_key, jwt_public_key)
2. Implement JWT token generation at POST /auth/login
3. Implement JWT validation middleware (FastAPI dependency injection)
4. Map JWT claims to RBAC roles (roles claim → permissions check)
5. Implement token refresh at POST /auth/refresh
6. Implement token blacklist via Redis (for logout)
7. Wire JWT verification to all authenticated routes
8. Add service-to-service tokens (long-lived, stored in Vault) for agent automation

**Acceptance Criteria**:
- [ ] Valid JWT: request passes through
- [ ] Expired JWT: 401 returned with `WWW-Authenticate: Bearer error="token_expired"`
- [ ] Invalid signature: 401 returned
- [ ] Missing token: 401 returned
- [ ] Role `viewer` cannot POST to write endpoints (403)
- [ ] Blacklisted token: 401 returned even if not expired
- [ ] Test: `pytest tests/unit/test_auth.py` (15 tests, 100% coverage on auth module)

---

## T3.3: Rate Limiting + CORS + Security Headers

**Owner**: Team Gamma  
**Agent**: R02 security-auditor + G02 api-contract  
**Duration**: 1 day  

**Detailed Steps**:
1. Redis-backed rate limiting (slowapi or custom) per IP + per user
2. Apply rate limit tiers from MASTER_ARCHITECTURE.md §8.2
3. Configure CORS: whitelist only minesystem.local domains
4. Add security headers middleware:
   - Strict-Transport-Security
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Content-Security-Policy
5. Input validation: all incoming bodies validated by Pydantic schemas
6. Request size limits: max 10MB body size

**Acceptance Criteria**:
- [ ] Rate limit enforced: 201st request in 60s window gets 429
- [ ] CORS: request from unknown origin gets 403
- [ ] All security headers present in every response
- [ ] Oversized body: 413 returned
- [ ] Test: `pytest tests/unit/test_security_middleware.py`

---

## T3.4: Idempotency Middleware

**Owner**: Team Gamma  
**Agent**: R04 test-writer + G02 api-contract  
**Duration**: 1 day  

**Detailed Steps**:
1. Create `idempotency_keys` table in gateway_db
2. Implement middleware: extract `Idempotency-Key` header from POST/PATCH/DELETE
3. On first request: process and store result with idempotency key (TTL: 24h)
4. On duplicate request: return stored result immediately (no re-processing)
5. Return `Idempotency-Status: replayed` header on cached responses
6. Make Idempotency-Key header REQUIRED on all write endpoints (400 if missing)

**Acceptance Criteria**:
- [ ] POST with same key twice: second returns same result with `Idempotency-Status: replayed`
- [ ] POST without key: 400 returned with helpful error message
- [ ] After 24h: key expires; next request processes fresh
- [ ] Test: `pytest tests/unit/test_idempotency.py` (8 tests including concurrent request test)

---

## T3.5: Event Ingestion Endpoint

**Owner**: Team Gamma (Event System Lead)  
**Agent**: R01 architect + R04 test-writer  
**Duration**: 1.5 days  

**Detailed Steps**:
1. POST /events/ingest endpoint accepting event envelope (per API_CONTRACTS.md)
2. Validate event envelope schema (JSON Schema validation)
3. Validate event_type is in approved catalog (reject unknown types with 422)
4. Store event in gateway_db.events table (durable)
5. Publish to Redis pub/sub channel: `events:{event_type}`
6. Return 202 Accepted (async processing)
7. Add HMAC signature validation for InvenTree webhooks (`X-InvenTree-Signature` header)

**Acceptance Criteria**:
- [ ] Valid event: 202 returned; event in DB; published to Redis
- [ ] Invalid schema: 422 returned with field-level error
- [ ] Unknown event_type: 422 returned
- [ ] Invalid HMAC: 401 returned
- [ ] Duplicate event_id: returns 200 (idempotent) with existing record
- [ ] Test: `pytest tests/integration/test_event_ingestion.py`

---

## T3.6: Event Bus (Workers + Fan-out)

**Owner**: Team Gamma  
**Agent**: R01 architect + R06 debugger  
**Duration**: 2 days  

**Detailed Steps**:
1. Implement async event workers (asyncio tasks or Celery)
2. Workers subscribe to Redis channels per event_type
3. Each worker routes to appropriate handler function
4. Implement retry logic (exponential backoff from ERROR_HANDLING.md)
5. On max retries exceeded → send to DLQ
6. Implement hop_count tracking for loop prevention
7. Each event consumer logs correlation_id for tracing

**Event Worker Routing Table**:
```python
EVENT_HANDLERS = {
    'inventory.stock.low': [handlers.create_auto_po],
    'crm.deal.won': [handlers.create_invoice, handlers.reserve_stock],
    'erp.po.approved': [handlers.update_inventree_order_status],
    'document.ocr.complete': [handlers.index_in_huixiangdou],
    'crm.contact.created': [handlers.sync_to_yetiforce],
    'erp.payment.overdue': [handlers.trigger_invoice_chase],
}
```

**Acceptance Criteria**:
- [ ] Event published → handler executes within 5 seconds
- [ ] Handler failure → retried with backoff (verified via logs)
- [ ] After 5 retries → event in DLQ (verified via DLQ API)
- [ ] Loop detection: hop_count > 5 → event killed + DLQ + alert
- [ ] Test: `pytest tests/integration/test_event_bus.py`

---

## T3.7: DLQ Management API

**Owner**: Team Gamma  
**Agent**: R06 debugger + R04 test-writer  
**Duration**: 1 day  

**Endpoints**:
```
GET  /api/admin/dlq/summary          → counts by status
GET  /api/admin/dlq/events           → list with filters (status, event_type, date)
GET  /api/admin/dlq/events/{id}      → single event detail + error traceback
POST /api/admin/dlq/events/{id}/replay  → retry single event
POST /api/admin/dlq/events/{id}/ignore  → mark as ignored
POST /api/admin/dlq/replay-all       → replay all pending (filtered by event_type)
```

**Acceptance Criteria**:
- [ ] All CRUD operations functional
- [ ] Replay resets retry counter and reprocesses event
- [ ] Ignored events excluded from auto-retry
- [ ] Only `admin` role can access /api/admin/* endpoints
- [ ] Test: `pytest tests/unit/test_dlq_api.py`

---

## T3.8: Circuit Breakers

**Owner**: Team Gamma  
**Agent**: R06 debugger + R03 performance  
**Duration**: 1 day  

**Per-service circuit breakers**:
```python
CIRCUIT_BREAKERS = {
    'inventree': CircuitBreaker(failure_threshold=5, timeout=60, name='inventree'),
    'aureusrep': CircuitBreaker(failure_threshold=3, timeout=120, name='aureusrep'),
    'twenty': CircuitBreaker(failure_threshold=5, timeout=60, name='twenty'),
    'paperless': CircuitBreaker(failure_threshold=5, timeout=60, name='paperless'),
    'yetiforce': CircuitBreaker(failure_threshold=5, timeout=60, name='yetiforce'),
}
```

**Acceptance Criteria**:
- [ ] After 5 failures: breaker OPEN; subsequent calls get immediate 503 (no waiting)
- [ ] After 60s: breaker HALF-OPEN; next call is test probe
- [ ] On probe success: breaker CLOSED; normal operation resumes
- [ ] Metric: `mine_circuit_breaker_state` gauge emitted for each breaker
- [ ] Alert fires when any breaker is OPEN (Zulip)
- [ ] Test: `pytest tests/unit/test_circuit_breaker.py` (12 state transition tests)

---

## T3.9–T3.11: Service API Proxies

**Owner**: Team Gamma API designers  
**Agent**: R01 architect + G02 api-contract  
**Duration**: 2 days  

Each service proxy:
- Applies auth (JWT validation + service token)
- Applies rate limiting
- Applies idempotency
- Transforms request to service-native format
- Transforms response to standard envelope
- Emits traces with service name as span attribute
- Handles service errors gracefully (circuit breaker)

**Acceptance Criteria per proxy**:
- [ ] All read endpoints: 200 with correct data shape
- [ ] All write endpoints: 201/200 with idempotency working
- [ ] Downstream service down: 503 with helpful message (not raw connection error)
- [ ] Circuit breaker respected
- [ ] Traces visible in SigNoz with service attribution
- [ ] Contract tests pass against each service

---

## T3.12: Stock Sync (Low Stock → Auto PO)

**Owner**: Team Beta/Gamma  
**Agent**: R04 test-writer + G03 testing  
**Duration**: 2 days  

**Exact flow** (see DATA_FLOWS.md for sequence diagram):
1. InvenTree plugin emits `inventory.stock.low`
2. Gateway event bus routes to `handlers.create_auto_po`
3. Handler fetches part + preferred supplier from InvenTree
4. Handler constructs PO payload per AureusERP API spec
5. Handler generates idempotency key: `auto_po_{part_id}_{date}`
6. Handler calls AureusERP POST /api/purchases/orders
7. On success: update InvenTree part with "on_order" status
8. On success: send Zulip notification
9. On failure: retry → DLQ → manual intervention path

**Acceptance Criteria**:
- [ ] Test scenario: set BOLT-M6 stock to 2 (below reorder of 10)
- [ ] Within 30 seconds: PO appears in AureusERP
- [ ] PO line item quantity = reorder_qty from InvenTree
- [ ] PO vendor = preferred_supplier from InvenTree
- [ ] Second trigger with same part/date: returns idempotent result (no duplicate PO)
- [ ] InvenTree BOLT-M6 shows "On Order" status
- [ ] Zulip #inventory shows notification
- [ ] Test: `pytest tests/integration/test_stock_sync.py`

---

## T3.13: Deal-to-Invoice Flow

**Owner**: Team Beta/Gamma  
**Agent**: A11 etl-pipeline + R04 test-writer  
**Duration**: 1.5 days  

**Exact flow**:
1. Twenty webhook fires `crm.deal.won`
2. Handler fetches deal details (line items, contact, company) from Twenty GraphQL
3. Handler fetches part details from InvenTree (for each line item)
4. Handler maps deal value to invoice lines
5. Handler calls AureusERP POST /api/invoices (idempotency: `invoice_deal_{deal_id}`)
6. Handler calls InvenTree: create stock reservation for deal line items
7. Handler calls Twenty GraphQL mutation: add invoice_id to deal custom field
8. Send Zulip notification

**Acceptance Criteria**:
- [ ] Deal marked Won in Twenty → invoice in AureusERP within 30s
- [ ] Invoice contact matches deal contact
- [ ] Invoice line items match deal line items
- [ ] Stock reserved in InvenTree
- [ ] Twenty deal updated with invoice reference
- [ ] Zulip #finance notification sent
- [ ] Test: `pytest tests/integration/test_deal_invoice_flow.py`

---

## T3.14–T3.15: Remaining Sync Flows

(Document OCR→AI, Contact sync) — follow same pattern as T3.12/T3.13.  
Test suites: `test_document_flow.py`, `test_contact_sync.py`

---

## T3.16: AI Automation Agents

**Owner**: Team Gamma (AI Lead)  
**Agent**: A07 incident-responder + A01 inventory-forecaster  
**Duration**: 2 days  

**Agents to wire**:
1. **inventory-forecaster** (A01): Scheduled daily 08:00; reads 90d sales; outputs reorder recommendations to Homarr
2. **erp-admin** (A06): Monthly close automation; daily invoice aging scan
3. **incident-responder** (A07): SigNoz alert → auto-remediation (container restart, pool resize)
4. **invoice-tracker** (A03): Daily scan for overdue invoices → Zulip + email chase

---

## T3.17–T3.21: Observability, Testing & Gates

See MONITORING_RUNBOOKS.md, TESTING_STRATEGY.md, and AGENT_MAPPING.md for full details.

**Phase 3 Exit Criteria**:
- [ ] All 21 Phase 3 tasks complete
- [ ] Integration test suite: 100% pass
- [ ] Load test: all SLOs met at 2x expected load
- [ ] DLQ depth: 0 after 24h clean run
- [ ] No P0/P1 incidents in 48h staging run
- [ ] Security gate G01 Phase 3 checklist: 100% pass
- [ ] All 3 critical sync flows working end-to-end

---

*Owner: Team Gamma*  
*Agent Support: RUFLO R01-R08, gstack G01-G06, Agency A01-A11*
