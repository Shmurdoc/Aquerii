# Mine System Plans — Index

**Status**: PRODUCTION-GRADE PLAN COMPLETE  
**Version**: 3.0  
**Last Updated**: 2026-05-04  
**Total Files**: ~50 planning documents

---

## Navigation

```
E:\Mine System\plans\
├── README.md                    # This file — master navigation index
├── PLAN_REVIEW.md               # CCB meeting log, decision register, phase approvals
│
├── ── ARCHITECTURE ──
├── MASTER_ARCHITECTURE.md       # ★ AUTHORITATIVE system blueprint (start here)
├── SERVICE_CATALOG.md           # Per-service deep-dive (tech stack, APIs, events)
├── NETWORK_MAP.md               # Docker networks, port allocation (25 ports)
├── VERSIONS.md                  # Exact version pins (no :latest tags)
├── STANDARDS.md                 # Naming conventions (containers, DBs, env vars, routes)
│
├── ── GOVERNANCE ──
├── PHASE0_GOVERNANCE.md         # CCB, decision authority, escalation, CI gates
├── RISK_REGISTER.md             # 15+ risks with severity matrix and mitigations
├── KPIS.md                      # SLO targets with Prometheus metric names
├── USER_PERSONAS.md             # 5 personas with UAT scenarios
├── TRAINING_PLAN.md             # Per-persona training materials checklist
│
├── ── SECURITY ──
├── SECURITY_BASELINE.md         # RBAC model, secrets policy, TLS, container policy
├── API_CONTRACTS.md             # 17 event schemas, request/response envelopes, HMAC
│
├── ── ENGINEERING ──
├── AGENT_MAPPING.md             # ★ All task-to-agent assignments (T0.1–T4.15)
├── AGENT_PLAYBOOKS.md           # 15 agent playbooks (R01–R08, G01–G07, A01–A04)
├── CI_CD_PIPELINE.md            # 7-stage CI, CD with manual prod gate, scripts
├── ENVIRONMENTS.md              # local/staging/production specs, data anonymization
├── SCHEMA_EVOLUTION.md          # Migrations, expand-contract, event versioning
├── ERROR_HANDLING.md            # Retry, circuit breakers, idempotency middleware code
├── TESTING_STRATEGY.md          # 7 test levels, coverage targets, CI mapping
├── ROLLBACK_PLAN.md             # RPO/RTO, rollback procedures per service
│
├── ── OPERATIONS ──
├── MONITORING_RUNBOOKS.md       # OTel instrumentation, 12 metrics, 4 dashboards,
│                                #   8 alert rules, 5 incident runbooks
├── INFRA_AS_CODE.md             # Docker Compose templates (all services),
│                                #   Gateway Dockerfile, start scripts
│
├── ── PHASE TASK FILES ──
├── PHASE0_TASKS.md              # Governance & Planning (T0.1–T0.15)
├── PHASE1_TASKS.md              # Core Infrastructure (T1.1–T1.10)
├── PHASE2_TASKS.md              # Business Systems (T2.1a–T2.6c, 22 tasks)
├── PHASE3_TASKS.md              # Integration Layer (T3.1–T3.21)
├── PHASE4_TASKS.md              # UX, Hardening & Go-Live (T4.1–T4.15)
│
└── ── SUBDIRECTORIES ──
    ├── 1-core-infra/
    │   └── PHASE1_PLAN.md
    ├── 2-business-systems/
    │   └── PHASE2_PLAN.md
    ├── 3-integration/
    │   └── PHASE3_PLAN.md
    ├── 4-ux/
    │   └── PHASE4_PLAN.md
    ├── team/
    │   ├── RESPONSIBILITIES.md
    │   └── ARCHITECTURE.md
    └── training/              # Created in T4.8
        ├── warehouse-operator-guide.md
        ├── finance-manager-guide.md
        ├── sales-manager-guide.md
        ├── system-admin-guide.md
        └── executive-guide.md
```

---

## Phase Timeline

| Phase | Weeks | Team | Key Deliverables |
|-------|-------|------|-----------------|
| 0: Governance | 1-2 | Lead + Architect | All planning docs, risk register, CCB established |
| 1: Infrastructure | 3-5 | Alpha | PostgreSQL ×6, Redis, MinIO, Vault, Caddy, SigNoz, Homarr |
| 2: Business Systems | 6-9 | Beta | InvenTree, AureusERP, Twenty CRM, Paperless-ngx, YetiForce |
| 3: Integration | 10-12 | Gamma | FastAPI Gateway, event bus, 5 service proxies, 3 sync flows |
| 4: UX & Go-Live | 13-16 | Delta | Homarr widgets, Zulip, HuixiangDou, pentest, UAT, go-live |

---

## Critical Reading Order (New Team Members)

1. **`MASTER_ARCHITECTURE.md`** — understand the 10-service topology and 5 architecture rules
2. **`STANDARDS.md`** — naming conventions before touching any file or container
3. **`SECURITY_BASELINE.md`** — secrets policy; understand Vault usage
4. **`AGENT_MAPPING.md`** — understand which agent handles each task
5. **`PHASE{N}_TASKS.md`** — your phase's task file

---

## Architecture Quick Reference

**5 Architecture Rules** (never violate):
1. Services NEVER call each other directly — all inter-service calls go through Gateway
2. InvenTree is the single source of truth for all inventory data
3. Every external write must include an `Idempotency-Key` header
4. All secrets via HashiCorp Vault — no `.env` files in production
5. Events are immutable — never edit an event; publish a corrective event instead

**10 Services**:

| Service | Domain | Port | Source |
|---------|--------|------|--------|
| FastAPI Gateway | Integration hub | 8000 | `services/gateway/` |
| InvenTree | Inventory (SoT) | 8080 | `InvenTree-master/` |
| AureusERP | Finance / ERP | 8069 | `aureuserp-master/` |
| Twenty CRM | Sales / CRM | 3000 | `twenty-main/` |
| Paperless-ngx | Documents | 8010 | Docker Hub |
| YetiForce CRM | Helpdesk / Assets | 8090 | `YetiForceCRM-developer/` |
| HuixiangDou | AI Knowledge Base | 7860 | `HuixiangDou-main/` |
| Excalidraw | Collaboration | 3333 | `excalidraw-master/` |
| Flowchart AI | Document Intelligence | 8888 | `flowchart-ai-main/` |
| Homarr | Dashboard | 7575 | Docker Hub |

**4 Docker Networks**:
- `core_network` — PostgreSQL, Redis, MinIO, Vault (never exposed)
- `app_network` — all app services + Gateway
- `monitoring_network` — SigNoz, otel-collector
- `dmz_network` — Caddy only (the sole TLS termination point)

---

## Agent Registry Quick Reference

| ID | Agent | When to Call |
|----|-------|-------------|
| R01 | architect | Architecture decisions, ADRs, topology changes |
| R02 | security-auditor | Security review, Vault config, RBAC changes |
| R03 | performance-analyzer | SLO measurement, load test analysis |
| R04 | test-writer | New test suites, coverage gaps |
| R05 | code-reviewer | PR reviews, elite checklist |
| R06 | debugger | Incident response, DLQ analysis |
| R07 | refactoring-expert | PHP/Laravel modernization (YetiForce, AureusERP) |
| R08 | docs-writer | Runbooks, API docs, user guides |
| G01 | security | Phase gate sign-off |
| G02 | api-contract | API design review, contract tests |
| G03 | testing | Testing strategy ownership |
| G04 | data-migration | Zero-downtime migration planning |
| G05 | performance | DB indexing, query optimization |
| G07 | red-team | Phase 4 penetration testing |
| A07 | incident-responder | Auto-remediation (SigNoz → container restart) |
| A08 | deploy-guardian | Deployment safety gates |
| A09 | infra-monitor | Infrastructure health monitoring |
| A11 | etl-pipeline | Data sync orchestration |

---

## Plan Statistics

| Metric | Count |
|--------|-------|
| Total planning files | ~50 |
| Total tasks | 77 (T0.1–T4.15, including sub-tasks) |
| RUFLO agents | 8 (R01–R08) |
| gstack specialists | 7 (G01–G07) |
| Agency agents | 12 (A01–A12) |
| openclaw agents | 5 (O01–O05) |
| Services | 10 |
| Docker networks | 4 |
| Host ports allocated | 25 |
| Event types in catalog | 17 |
| User personas | 5 |
| Risks identified | 15+ |
| SLOs defined | 10 |

---

## Source Repositories Utilized

| Source Path | Purpose |
|------------|---------|
| `E:\Mine System\InvenTree-master\` | Inventory service + Gateway plugin |
| `E:\Mine System\aureuserp-master\` | ERP service (Laravel/Filament) |
| `E:\Mine System\twenty-main\` | CRM service (NestJS/React) |
| `E:\Mine System\YetiForceCRM-developer\` | Extended CRM/helpdesk (PHP) |
| `E:\Mine System\HuixiangDou-main\` | AI knowledge base |
| `E:\Mine System\excalidraw-master\` | Collaborative diagramming |
| `E:\Mine System\flowchart-ai-main\` | Patent/document flowchart AI |
| `E:\Mine System\pdfplumber-stable\` | PDF table/text extraction |
| `E:\Mine System\agency-agents-main\` | Automation agents (A01–A12) |
| `E:\Mine System\awesome-openclaw-agents-main\` | Additional agents (O01–O05) |
| `E:\RUFLO\ruflo-main\` | R01–R08 agent definitions |
| `E:\elit dev Skills1\gstack-main\` | G01–G07 specialist definitions |

---

*Version 3.0 — Production-grade plan complete*  
*All phase task files rewritten with step-by-step detail, exact acceptance criteria, and agent assignments*
