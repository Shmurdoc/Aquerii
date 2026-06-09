# AGENT PLAYBOOKS — Elite Agent Workload Definitions

**Version**: 2.0  
**Status**: AUTHORITATIVE  
**Owner**: Lead Architect  
**Purpose**: Every agent in this system has an explicit, elite-level playbook. No vague assignments. Every agent knows exactly what to do, when to do it, what success looks like, and what tools to use.

---

## Playbook Structure

Each playbook defines:
1. **Identity**: Who this agent is
2. **Trigger**: When this agent activates
3. **Inputs**: What data this agent receives
4. **Process**: Step-by-step elite execution
5. **Outputs**: What this agent produces
6. **Success Criteria**: Measurable completion signals
7. **Escalation**: When to alert humans

---

## RUFLO Agent Playbooks

### PB-R01: architect.md — System Architect Agent

**Identity**: Principal architect responsible for technical coherence of the entire platform  
**Source**: `E:\RUFLO\ruflo-main\ruflo-main\.opencode\agents\architect.md`

**Trigger**: 
- Any new service being added to the system
- Any change to port allocation, network topology, or database schema
- Phase start/end architectural review
- Breaking API change proposals

**Inputs**:
- Service specification (name, tech stack, domain)
- MASTER_ARCHITECTURE.md (current state)
- NETWORK_MAP.md (current port allocations)
- Proposed change description

**Process**:
1. **Validate against principles**: Check proposed change against 8 design principles in MASTER_ARCHITECTURE.md §1.1
2. **Impact analysis**: Identify all affected services, ports, data flows
3. **Update MASTER_ARCHITECTURE.md**: Add/modify component map section
4. **Update NETWORK_MAP.md**: Reserve ports, add to Docker network
5. **Update API_CONTRACTS.md**: Define new endpoints/events
6. **Update DATA_FLOWS.md**: Add sequence diagrams for new flows
7. **Create ADR** (Architecture Decision Record): Document the decision, alternatives considered, rationale
8. **Risk assessment**: Add new risks to RISK_REGISTER.md if applicable
9. **CCB review**: Flag for CCB approval if breaking change

**Outputs**:
- Updated MASTER_ARCHITECTURE.md
- Architecture Decision Record (ADR-XXX.md in `plans/adrs/`)
- Updated NETWORK_MAP.md
- Impact assessment report

**Success Criteria**:
- [ ] All 8 design principles maintained
- [ ] No port conflicts in NETWORK_MAP.md
- [ ] ADR approved by Lead Architect
- [ ] All affected team leads notified
- [ ] No breaking changes without migration plan

**Escalation**: If proposed change violates core principles → block and escalate to CCB immediately

---

### PB-R02: security-auditor.md — Security Audit Agent

**Identity**: Security specialist ensuring every component meets the security baseline  
**Source**: `E:\RUFLO\ruflo-main\ruflo-main\.opencode\agents\security-auditor.md`

**Trigger**:
- New service deployed (Phase 1-4)
- Any auth/permission change
- Pre-phase go/no-go gate
- Incident response (security event)
- Monthly security sweep

**Inputs**:
- SECURITY_BASELINE.md
- Service configuration files
- API endpoint definitions
- Docker Compose files
- Environment variable configs

**Process (Per-Service Security Audit)**:
1. **Authentication audit**: Verify service uses only Gateway-issued JWT; no service has its own auth bypass
2. **Network exposure audit**: Verify service is NOT accessible on public network; only via Caddy → Gateway
3. **Secrets audit**: Verify no hardcoded credentials; all secrets from Vault; `.env` not in git
4. **RBAC audit**: Verify all endpoints have role checks; no anonymous access to write operations
5. **Input validation audit**: Verify all external inputs sanitized (SQL injection, XSS, path traversal)
6. **Dependency scan**: Run `safety check` (Python) or `npm audit` (Node) for CVEs
7. **Container audit**: No root processes; read-only filesystem where possible; no privileged containers
8. **TLS audit**: All external communication over HTTPS; internal service mesh via trusted network
9. **Rate limiting audit**: All public endpoints have rate limits configured in Gateway
10. **Log audit**: No passwords/tokens logged; PII masked in logs

**Outputs**:
- Security audit report with PASS/FAIL per check
- CVE report with severity ratings
- Remediation tickets for any FAIL items
- Updated SECURITY_BASELINE.md if new patterns found

**Success Criteria (Phase Gate)**:
- [ ] 0 critical CVEs in production dependencies
- [ ] 0 hardcoded secrets
- [ ] All endpoints behind auth
- [ ] All containers non-root
- [ ] TLS verified on all external endpoints
- [ ] Rate limiting active on all public routes
- [ ] Penetration test pass (Phase 4 gate)

**Escalation**: Critical vulnerability → immediate page to Lead + block deployment

---

### PB-R03: performance-analyzer.md — Performance Analyst Agent

**Identity**: Performance engineer ensuring system meets SLO targets  
**Source**: `E:\RUFLO\ruflo-main\ruflo-main\.opencode\agents\performance-analyzer.md`

**Trigger**:
- Phase go/no-go gate (performance benchmarks required)
- P99 latency alert from SigNoz (> 2s warning threshold)
- Weekly performance review
- After any significant code change to Gateway or sync logic

**Inputs**:
- KPIS.md (target SLOs)
- SigNoz metrics (latency, RPS, error rate, DB pool utilization)
- Load test results (k6 or locust output)

**Process**:
1. **Baseline measurement**: Record P50/P95/P99 latency for all Gateway endpoints
2. **Bottleneck identification**: Use SigNoz traces to find slowest spans
3. **DB query analysis**: Check for N+1 queries, missing indexes, slow queries (> 100ms)
4. **Cache efficiency**: Measure Redis hit rate; identify uncached hot paths
5. **Connection pool**: Check pool utilization; size for peak load
6. **Event bus throughput**: Measure events/second processed; DLQ growth rate
7. **Load test**: Run k6 script at 2x expected peak load
8. **Optimization recommendations**: Document top 3 improvements with estimated impact
9. **SLO compliance report**: Green/Yellow/Red for each KPI in KPIS.md

**SLO Targets**:
| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| Gateway /health | < 10ms | < 50ms | < 100ms |
| Inventory list | < 200ms | < 500ms | < 1s |
| PO creation | < 500ms | < 1s | < 2s |
| Event ingestion | < 100ms | < 300ms | < 500ms |
| AI query | < 2s | < 5s | < 10s |

**Success Criteria**:
- [ ] All P99 targets met under 2x peak load
- [ ] DB pool < 70% utilized at peak
- [ ] Redis hit rate > 85% for cacheable endpoints
- [ ] 0 timeout errors in 1-hour load test
- [ ] DLQ not growing during sustained load

---

### PB-R04: test-writer.md — Test Author Agent

**Identity**: Test engineering specialist who writes comprehensive test suites  
**Source**: `E:\RUFLO\ruflo-main\ruflo-main\.opencode\agents\test-writer.md`

**Trigger**:
- New service or endpoint implemented
- Bug fix (regression test required)
- Phase 3 integration testing sprint
- Pre-release test suite validation

**Process (Test Suite Creation)**:
1. **Unit tests**: Every function with business logic gets unit tests. Mock all I/O.
   ```python
   # Naming: test_{function_name}_{scenario}_{expected_outcome}
   def test_create_po_idempotent_same_key_returns_cached():
   def test_circuit_breaker_opens_after_5_failures():
   def test_stock_sync_inventree_wins_on_conflict():
   ```
2. **Contract tests**: Every external API call has a contract test. Use Pact or manual schema validation.
3. **Integration tests**: Test full flows end-to-end with real services (Docker Compose test profile).
4. **Error scenario tests**: Test every retry, DLQ, and fallback path.
5. **Load tests**: k6 scripts for each critical endpoint.

**Test Coverage Requirements**:
| Layer | Minimum Coverage | Target |
|-------|-----------------|--------|
| Gateway business logic | 85% | 95% |
| Event handlers | 90% | 98% |
| Sync logic | 90% | 95% |
| Auth middleware | 95% | 100% |
| Error handlers | 85% | 95% |

**Outputs**:
- Test files in `services/gateway/tests/unit/`, `tests/integration/`, `tests/contract/`
- Coverage report
- Test run results (CI-compatible JUnit XML)

---

### PB-R05: code-reviewer.md — Code Review Agent

**Identity**: Senior engineer performing elite-level code reviews  
**Source**: `E:\RUFLO\ruflo-main\ruflo-main\.opencode\agents\code-reviewer.md`

**Review Checklist (mandatory for all PRs)**:
```
SECURITY:
  [ ] No hardcoded credentials
  [ ] All inputs validated
  [ ] SQL queries use parameterization
  [ ] Auth checks present on all write endpoints
  [ ] Sensitive data not logged

RESILIENCE:
  [ ] All external calls have timeouts
  [ ] Retry logic uses exponential backoff
  [ ] Idempotency keys on all write operations
  [ ] DLQ path exists for all async operations
  [ ] Circuit breakers configured

CODE QUALITY:
  [ ] Functions < 50 lines
  [ ] No duplication (DRY)
  [ ] Descriptive variable names
  [ ] Type hints on all Python functions
  [ ] Docstrings on public functions

TESTING:
  [ ] Unit tests for all new business logic
  [ ] Integration test for new endpoints
  [ ] Error paths tested

OBSERVABILITY:
  [ ] Structured logging added
  [ ] Metrics emitted for key operations
  [ ] Trace spans created for new functions
```

---

### PB-R06: debugger.md — Incident Debugger Agent

**Identity**: On-call incident responder for production issues  
**Source**: `E:\RUFLO\ruflo-main\ruflo-main\.opencode\agents\debugger.md`

**Trigger**: P0/P1 incident alert from SigNoz or Zulip

**Process (Incident Response)**:
1. **Triage** (0-5 min): Determine severity (P0=system down, P1=feature broken, P2=degraded)
2. **Isolation** (5-15 min): Identify failing service(s) via SigNoz trace waterfall
3. **Immediate action** (15-30 min): Apply known fix OR rollback (per ROLLBACK_PLAN.md)
4. **Communication** (ongoing): Post to Zulip #incidents channel every 15 min
5. **Root cause analysis** (post-incident): Create incident report in `plans/incidents/`
6. **Prevention**: Add monitoring rule to catch this failure class earlier

---

### PB-R07: refactoring-expert.md — Code Refactor Agent

**Identity**: Code quality specialist for legacy and complex code  
**Source**: `E:\RUFLO\ruflo-main\ruflo-main\.opencode\agents\refactoring-expert.md`

**Primary Use Cases**:
- YetiForceCRM PHP customization (legacy code patterns)
- AureusERP Laravel customization
- Gateway sync logic simplification after Phase 3

**Refactoring Standards**:
1. Never refactor working code without tests first (Red-Green-Refactor)
2. One concern per function
3. Extract to named functions instead of comments
4. Replace magic numbers with named constants
5. Use dependency injection, not static calls

---

### PB-R08: docs-writer.md — Documentation Agent

**Identity**: Technical writer ensuring all documentation is accurate and useful  
**Source**: `E:\RUFLO\ruflo-main\ruflo-main\.opencode\agents\docs-writer.md`

**Documentation Standards**:
- Every API endpoint: method, path, auth, request body, response, error codes
- Every event type: schema, source, consumers, example payload
- Every deployment: step-by-step with expected output
- Every config: field name, type, default, description
- Runbooks: prerequisite state, step-by-step actions, expected outcome, rollback

---

## gstack-main Specialist Playbooks

### PB-G01: security.md — Security Review Specialist

**Source**: `E:\elit dev Skills1\gstack-main\review\specialists\security.md`

**Responsibility**: Formal security review sign-off for each phase gate.

**Phase Gate Security Checklist**:
```
PHASE 1 GATE:
  [ ] Caddy TLS configured (internal CA or Let's Encrypt)
  [ ] All services on backend network (not exposed directly)
  [ ] Vault initialized and unsealed
  [ ] PostgreSQL: no default passwords, remote access restricted
  [ ] Redis: password-protected, no public exposure

PHASE 2 GATE:
  [ ] InvenTree: admin password rotated from default
  [ ] AureusERP: APP_KEY generated and stored in Vault
  [ ] Twenty: JWT_SECRET stored in Vault
  [ ] Paperless: admin password rotated
  [ ] YetiForce: API keys generated and stored in Vault

PHASE 3 GATE:
  [ ] Gateway JWT keys (RS256) in Vault, not environment
  [ ] Rate limiting tested under load
  [ ] CORS configured (whitelist only)
  [ ] All webhook endpoints require HMAC signature validation
  [ ] No service-to-service calls bypass Gateway

PHASE 4 GATE:
  [ ] OWASP ZAP scan: 0 High, 0 Critical findings
  [ ] Dependency audit: 0 Critical CVEs
  [ ] Penetration test completed by gstack red-team.md
  [ ] Secret rotation policy documented and tested
  [ ] Incident response plan tested
```

---

### PB-G02: api-contract.md — API Contract Specialist

**Source**: `E:\elit dev Skills1\gstack-main\review\specialists\api-contract.md`

**Responsibility**: Enforce API design standards and contract compatibility.

**Contract Standards**:
```python
# All Gateway endpoints MUST follow this pattern:

# 1. Versioned path
GET /api/v1/inventory/parts

# 2. Standard response envelope
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "per_page": 20 },
  "errors": []
}

# 3. Standard error response
{
  "success": false,
  "data": null,
  "errors": [
    { "code": "INSUFFICIENT_STOCK", "message": "...", "field": "quantity" }
  ]
}

# 4. Required headers
X-Request-ID: uuid-v4       # Correlation ID
X-Idempotency-Key: string   # Required on POST/PATCH/DELETE
Authorization: Bearer {jwt}  # Required on all authenticated routes
```

**Contract Compatibility Rules**:
1. **Never remove a field** from a response (additive only)
2. **Never change a field type** without major version bump
3. **Never change event schema** without bumping `schema_version`
4. **Consumer-driven contract tests** must pass before any API change

---

### PB-G03: testing.md — Testing Strategy Specialist

**Source**: `E:\elit dev Skills1\gstack-main\review\specialists\testing.md`

**Testing Ownership Matrix** (resolves previous ambiguity):

| Test Type | Author | Executor | Frequency |
|-----------|--------|----------|-----------|
| Unit tests | Developer (Team Gamma/Beta) | CI pipeline | Every commit |
| Contract tests | Team Gamma + PB-G02 | CI pipeline | Every PR |
| Integration tests | RUFLO test-writer (PB-R04) | CI + nightly | Every PR + nightly |
| Load tests | RUFLO performance-analyzer (PB-R03) | Weekly + pre-release | Weekly |
| Security tests | gstack security.md (PB-G01) | Pre-phase gate | Per phase gate |
| Chaos tests | RUFLO debugger.md (PB-R06) | Pre-release | Phase 4 only |
| E2E tests | Team Delta | CI + nightly | Nightly |
| Smoke tests | DevOps (Team Alpha) | Post-deploy | Every deploy |

---

### PB-G04: data-migration.md — Data Migration Specialist

**Source**: `E:\elit dev Skills1\gstack-main\review\specialists\data-migration.md`

**Migration Standards** (used in Phase 2):
1. **Always reversible**: Every migration has `up()` and `down()` methods
2. **Idempotent**: Running migration twice must produce same result
3. **Zero-downtime**: Use expand-contract pattern for schema changes
4. **Seed data**: Separate seed data from schema migrations
5. **Tested**: Run migration against copy of production data before applying

**Migration Checklist**:
```
Before running ANY migration:
  [ ] Backup current database
  [ ] Test migration on staging first
  [ ] Verify down() migration restores state
  [ ] Check query performance after migration (EXPLAIN ANALYZE)
  [ ] Schedule during low-traffic window
  [ ] Have rollback plan ready (< 5 min execution)
```

---

### PB-G05: performance.md — Performance Specialist

**Source**: `E:\elit dev Skills1\gstack-main\review\specialists\performance.md`

**Database Performance Standards**:
```sql
-- All queries touching > 1000 rows MUST have:
-- 1. Appropriate indexes
CREATE INDEX CONCURRENTLY idx_stock_part_location 
ON stock_stockitem(part_id, location_id) 
WHERE is_building = false;

-- 2. EXPLAIN ANALYZE verification (must not use Seq Scan on large tables)
EXPLAIN ANALYZE SELECT * FROM stock_stockitem WHERE part_id = 123;

-- 3. Query timeout (prevent long-running queries blocking pool)
SET statement_timeout = '10s';
```

---

### PB-G06: maintainability.md — Maintainability Specialist

**Source**: `E:\elit dev Skills1\gstack-main\review\specialists\maintainability.md`

**Code Structure Standards**:
- Max file size: 300 lines (split if larger)
- Max function size: 50 lines
- Max cyclomatic complexity: 10
- Dependency injection required for all service classes
- No global state in Gateway service modules
- All configuration via Pydantic BaseSettings (never os.environ directly)

---

### PB-G07: red-team.md — Penetration Testing Specialist

**Source**: `E:\elit dev Skills1\gstack-main\review\specialists\red-team.md`

**Activation**: Phase 4 gate only (pre-production)

**Penetration Test Scope**:
1. **External perimeter**: Caddy TLS, exposed ports scan
2. **Authentication bypass**: JWT forgery, session fixation, token replay
3. **Authorization**: RBAC bypass, privilege escalation, IDOR
4. **Injection**: SQL, NoSQL, command injection in all input fields
5. **Business logic**: Stock manipulation, invoice fraud, data exfiltration paths
6. **API security**: Rate limit bypass, mass assignment, sensitive data exposure

**Pass Criteria**: 0 Critical, 0 High findings before production go-live

---

## Agency Agents Playbooks

### PB-A01: inventory-forecaster — Demand Forecast Agent

**Source**: `agency-agents-main/supply-chain/inventory-forecaster/`

**Schedule**: Daily 08:00 UTC  
**Trigger**: Also triggered by `inventory.stock.low` for immediate reorder calculation

**Process**:
1. Fetch 90-day sales history from AureusERP
2. Fetch current stock levels from InvenTree
3. Calculate demand forecast using moving average
4. Identify parts likely to go below reorder point in next 30 days
5. Generate proactive PO recommendations
6. Post report to Homarr dashboard widget
7. Send Zulip digest: "#inventory Daily Forecast: 3 parts need ordering"

---

### PB-A02: erp-admin — ERP Automation Agent

**Source**: `agency-agents-main/business/erp-admin/`

**Automated Tasks**:
1. **Monthly close**: Trigger AureusERP period close on 1st of each month
2. **Invoice aging**: Daily scan for overdue invoices → trigger invoice-tracker agent
3. **PO approval queue**: Alert finance team when POs > $500 need approval
4. **Bank reconciliation**: Weekly trigger for bank feed import
5. **Employee timesheet close**: Weekly reminder to employees via Zulip

---

### PB-A03: incident-responder — Production Incident Agent

**Source**: `agency-agents-main/devops/incident-responder/`

**Auto-remediation Playbooks**:
| Alert | Auto-Action | Escalate If |
|-------|-------------|-------------|
| Service health check fail | Restart container (1x) | Still unhealthy after restart |
| DB pool exhausted | Increase pool_size by 10 (temp) | Query still timing out |
| DLQ depth > 50 | Pause event ingestion, alert admin | DLQ > 200 |
| Disk > 85% | Archive old logs | Disk > 95% |
| High CPU > 80% 5min | Profile + alert | CPU > 95% 10min |

---

### PB-A04: deploy-guardian — Deployment Safety Agent

**Source**: `awesome-openclaw-agents-main/devops/deploy-guardian/`

**Pre-Deploy Checklist** (blocks deploy if any fail):
```
  [ ] All tests passing (unit + integration + contract)
  [ ] Security scan: 0 critical CVEs
  [ ] Migration tested on staging
  [ ] Rollback plan documented
  [ ] Deployment window is approved (no blackout period)
  [ ] Backup taken in last 1 hour
  [ ] Health checks passing on current version
```

**Post-Deploy Verification**:
```
  [ ] Health endpoint returns 200 within 60s
  [ ] Smoke tests passing
  [ ] No error spike in SigNoz (5 min observation)
  [ ] DLQ depth unchanged
  [ ] Zulip notification sent to #deployments
```

---

## Skill Sources: How to Use

### E:\elit dev Skills\

```
tests/code_refactor/          → Use patterns for PHP refactoring (YetiForce, AureusERP)
tests/plan_sequential/        → Use for planning multi-step tasks in correct order
superpowers-main/tests/       → Use TDD patterns for Gateway development
```

### E:\Devine Brain\

```
advanced skills/microservices-demo/  → Terraform + K8s patterns (Phase 1 infra)
advanced skills/zustand/             → State management for any React UI customization
advanced skills/bulletproof-react/   → React patterns for Homarr widget development
advanced skills/query/               → Data fetching patterns for Twenty CRM customization
management system/ui/templates/      → Monorepo structure reference
```

---

*Owner: Lead Architect + All Agent Operators*  
*Review: Update playbooks when agent behavior needs adjustment or new agents added*
