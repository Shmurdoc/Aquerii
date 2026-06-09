# Phase 0: Governance Framework & Decision Authority

**Phase**: Weeks 0-1  
**Owner**: Lead Developer & Architect  
**Focus**: Decision-making framework, authority matrix, steering governance

---

## 1. Decision Authority Matrix

| Decision Type | Authority | Approval SLA | Escalation |
|--------------|-----------|--------------|------------|
| Version bumps (minor) | Team Lead | Same-day | Architect |
| Version bumps (major) | Architect | 2 hours | Lead |
| Security patches | Lead + gstack security-auditor | ASAP (< 1hr) | CISO (if exists) |
| API breaking changes | gstack api-contract specialist | 24 hours | Steering Committee |
| Rollback decision | Architect + Ops Lead | 30 minutes | Lead |
| Risk acceptance | Architect | 2 hours | Lead |
| Phase go/no-go | Lead + Architect | 4 hours | Steering Committee |
| Resource allocation | Lead | 24 hours | Budget holder |

---

## 2. Change Control Board (CCB)

**Composition**:
- Lead Developer (Chair)
- Architect (Tech)
- gstack security-auditor (Security)
- RUFLO performance-analyzer (Performance)
- Team Alpha Lead (Infrastructure)
- Team Beta Lead (Business Systems)

**Meeting**: Weekly Mondays 10:00 AM  
**Decision Threshold**: Unanimous for Phase gates, Majority for other changes  
**Recording**: Document in `plans/PLAN_REVIEW.md`

**CCB Approval Checklist**:
- [ ] Risk register updated
- [ ] Testing plan exists
- [ ] Rollback plan documented
- [ ] Security review completed
- [ ] Performance impact assessed

---

## 3. Steering Committee Charter

**Executive Sponsor**: Project Lead  
**Members**:
- Lead Developer (Chair)
- Architect (Technical)
- Business stakeholder (Requirements)
- IT Operations (Infrastructure support)

**Cadence**: Bi-weekly (every other Monday 2:00 PM)  
**Duration**: 30 minutes  
**Agenda**:
- Phase progress (RAG status)
- Risk escalations
- Resource conflicts
- Executive updates

**Escalation Path**:
1. Team identifies issue
2. CCB discusses (within 24 hours)
3. If unresolved, escalate to Steering Committee
4. If unresolved, escalate to Business Leadership

---

## 4. Repository & Code Organization Strategy

### Decision 4.1: Monorepo vs. Multi-repo
**Decision**: Monorepo for phases 0-3, potential split in Phase 4 if complexity warrants.

**Rationale**:
- Shared planning and governance easier
- Shared dependencies (PostgreSQL, gateway)
- Simpler version alignment
- **Caveat**: Each service maintains own `.env`, docker-compose, config

### Decision 4.2: Directory Structure
```
E:\Mine System\
├── plans/              # All governance and planning (THIS FOLDER)
├── services/           # Code (phases 3-4 only)
│   ├── gateway/       # FastAPI Gateway
│   ├── integrations/  # Sync logic, webhooks
│   ├── ui/            # Homarr, Excalidraw embeds
│   └── scripts/       # Setup, migration scripts
├── configs/           # Service configs (templates, not secrets)
├── docker/            # docker-compose files (per service)
├── backups/           # Database backups
└── logs/              # Service logs
```

---

## 5. CI/CD Pipeline Gates

Gates enforced automatically in CI — no human can bypass them (see CI_CD_PIPELINE.md for full pipeline definition).

| Stage | Gate | Tool | Owner | Block Condition |
|-------|------|------|-------|----------------|
| 1. Lint | Code style + SAST | semgrep, bandit, ruff | R02 security-auditor | ANY critical finding → pipeline fails |
| 2. Security Scan | Dependency + image CVE | Trivy, safety, pip-audit | G01 security | Critical CVE → fails; High CVE → warning |
| 3. Unit Tests | Coverage threshold | pytest + coverage.py | R04 test-writer | Coverage < 80% on Gateway code → fails |
| 4. Contract Tests | API schema validation | Pact / schemathesis | G02 api-contract | Any contract violation → fails |
| 5. Build | Image build + push | Docker Buildx | A08 deploy-guardian | Build failure → fails |
| 6. Integration Tests | Full service stack | pytest + docker-compose | R04 test-writer | Any test failure → fails |
| 7. Load Test (staging) | SLO verification | Locust | R03 performance | P99 > 500ms at 1x load → fails |

**Emergency Fast-Path** (P0 hotfix only):
- Requires: Lead Developer + Security Lead dual approval in PLAN_REVIEW.md
- Skips: Load test (stage 7) only
- Never skips: Lint, Security Scan, Unit Tests, Contract Tests, Build
- Post-deploy: Full test suite must pass within 2 hours; if not → auto-rollback triggered

**Approval SLAs** (for manual gates):
| Decision | SLA | Who Decides | Escalation After SLA |
|----------|-----|-------------|---------------------|
| Phase go/no-go | 4 hours | Lead + Architect + CCB | Steering Committee |
| Rollback decision | 30 minutes | Lead or on-call (either) | Auto-rollback triggers |
| Security patch (Critical CVE) | 48 hours | Lead + G01 | Block all deploys until resolved |
| Security patch (High CVE) | 7 days | G01 | CCB escalation |
| API breaking change | 24 hours | G02 api-contract | CCB blocks merge |
| Risk acceptance (score ≥ 15) | 2 hours | Architect | Lead + Steering Committee |
| Emergency fast-path approval | 15 minutes | Lead + Security Lead | If unavailable: no fast-path |

---

## 6. Phase Go/No-Go Criteria

### Phase 1 Go/No-Go Gate (End of Week 4)
```
✅ Infrastructure Running:
  - Caddy serving HTTPS without errors
  - Homarr responsive
  - PostgreSQL accepting connections from all services
  - SigNoz collecting metrics (latency < 5s)

✅ Documentation Complete:
  - STANDARDS.md implemented
  - NETWORK_MAP.md verified
  - SECURITY_BASELINE.md applied
  - Runbook for Phase 2 ready

✅ No Critical Risks Open:
  - All R01-R07 (critical/high) have mitigation in place
  - Security audit passed
  - No blocking issues > P1

Decision: Lead + Architect + Steering Committee
```

### Phase 2 Go/No-Go Gate (End of Week 7)
```
✅ Business Apps Running:
  - ERPNext web UI reachable, invoicing tested
  - Twenty CRM web UI reachable, customer data loaded
  - InvenTree web UI reachable, stock visible
  - Paperless-ngx accepting document uploads

✅ Data Integrity Verified:
  - Seed data loaded correctly
  - Migrations successful (if applicable)
  - No data loss observed

✅ Staging Environment Stable:
  - 48 hours without critical errors
  - Performance benchmarks met
  - Backup/restore tested

Decision: Lead + Architect + Team Beta Lead + Steering Committee
```

### Phase 3 Go/No-Go Gate (End of Week 9)
```
✅ Integration Layer Functional:
  - Gateway health endpoint returning 200
  - Authentication working (login flow)
  - Webhooks delivering events (< 5s latency)
  - Sync logic: low stock → PO created automatically
  - AI agents executing at least one automation task

✅ Error Handling Robust:
  - Webhooks retrying on failure (exponential backoff)
  - No infinite event loops observed
  - Sync conflicts resolved per policy
  - Manual override available

✅ Monitoring Complete:
  - SigNoz dashboard showing all services
  - Alerts configured
  - Runbook for Phase 4 ready

Decision: Lead + Architect + Team Gamma Lead + Steering Committee
```

### Phase 4 Go/No-Go Gate (End of Week 12)
```
✅ User Experience Complete:
  - Homarr dashboard with all tiles (InvenTree, ERPNext, Twenty, Paperless)
  - Zulip integration working (alerts reaching users)
  - HuixiangDou responding to queries
  - Excalidraw and Flowchart AI accessible

✅ Training Delivered:
  - All user personas trained
  - Documentation complete
  - Runbook for production support ready

✅ Go-Live Readiness:
  - All acceptance criteria met
  - Risk register clean (no P0 issues)
  - Rollback plan tested
  - Business sign-off

Decision: Lead + Steering Committee + Business Sponsor
```

---

## 7. Weekly Plan Review Meeting

**Cadence**: Every Monday 9:00 AM  
**Duration**: 1 hour  
**Attendees**: All team leads, RUFLO architect, gstack security-auditor

**Agenda**:
1. Progress vs. plan (first 10 min)
2. Blockers & risks (15 min)
3. Cross-team dependencies (10 min)
4. Next week planning (15 min)
5. Update PLAN_REVIEW.md (10 min)

**PLAN_REVIEW.md Format**:
```markdown
## Week X Review

**Date**: 2026-05-03 (Mon)

### Phase X Status
- Task T1.1: 75% complete, unblocked
- Task T1.2: Blocked on T1.1, ETA +2 days

### Risks Raised
- R12 (port conflict): Mitigated by NETWORK_MAP.md verification

### Decisions Made
- Approved version bump to postgres:15.4

### Upcoming Week Focus
- Complete T1.3
- Start T1.4
```

---

## 8. Escalation Protocol

```
Issue Detected
    ↓
[P0: Critical System Down]
  ├─ Immediate page: Lead + Architect + On-call
  ├─ Response SLA: 15 minutes
  └─ Escalate to CTO immediately

[P1: Feature Blocked]
  ├─ Email CCB within 1 hour
  ├─ Response SLA: 4 hours
  └─ CCB decides escalation to Steering Committee

[P2: Minor Issue]
  ├─ Log in PLAN_REVIEW.md
  ├─ Response SLA: 24 hours
  └─ Team resolves or escalates

[P3: Non-blocking]
  ├─ Track in backlog
  └─ Review in next CCB
```

---

## 9. Quality Gates Per Phase

| Phase | Entry Gate | Exit Gate |
|-------|-----------|----------|
| 0 | ✅ Plan approved by Lead | Governance docs finalized |
| 1 | ✅ Infrastructure ready (Docker, networks) | Phase 1 Go/No-Go passed |
| 2 | ✅ Phase 1 complete + business apps available | Phase 2 Go/No-Go passed |
| 3 | ✅ Phase 2 stable (48h, no critical errors) | Phase 3 Go/No-Go passed |
| 4 | ✅ Phase 3 stable + training ready | Phase 4 Go/No-Go passed + go-live approval |

---

## 10. Metrics & KPI Review

**Review Cadence**: Weekly in PLAN_REVIEW.md  
**Owned By**: Architect + RUFLO performance-analyzer

**Metrics to Track**:
- Phase completion % vs. plan
- Risk register status (# open, severity distribution)
- Defect rate by phase
- Team capacity utilization
- Dependency blocking ratio

---

*Owner: Lead Developer & Architect*  
*Next Review: 2026-05-10 (Week 1 Monday)*