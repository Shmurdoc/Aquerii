# AGENT MAPPING — Complete Task-to-Agent Matrix (Elite Level)

**Version**: 2.0  
**Status**: AUTHORITATIVE  
**Owner**: Lead Architect  
**Cross-reference**: See AGENT_PLAYBOOKS.md for full playbook per agent

---

## Agent Registry

### RUFLO Agents
| ID | Agent | Playbook | Specialization |
|----|-------|---------|----------------|
| R01 | architect.md | PB-R01 | System architecture, ADRs, topology |
| R02 | security-auditor.md | PB-R02 | Security audits, RBAC, vulnerability scanning |
| R03 | performance-analyzer.md | PB-R03 | SLO measurement, load testing, optimization |
| R04 | test-writer.md | PB-R04 | Unit, integration, contract, load tests |
| R05 | code-reviewer.md | PB-R05 | Code review with elite checklist |
| R06 | debugger.md | PB-R06 | Incident response, root cause analysis |
| R07 | refactoring-expert.md | PB-R07 | Code quality, legacy PHP modernization |
| R08 | docs-writer.md | PB-R08 | Technical documentation, runbooks, API docs |

### gstack-main Specialists
| ID | Specialist | Playbook | Specialization |
|----|-----------|---------|----------------|
| G01 | security.md | PB-G01 | Phase gate security sign-off |
| G02 | api-contract.md | PB-G02 | API design standards, consumer contracts |
| G03 | testing.md | PB-G03 | Testing strategy ownership matrix |
| G04 | data-migration.md | PB-G04 | DB migrations, zero-downtime patterns |
| G05 | performance.md | PB-G05 | DB indexing, query optimization |
| G06 | maintainability.md | PB-G06 | Code structure standards |
| G07 | red-team.md | PB-G07 | Penetration testing (Phase 4 gate only) |

### Agency Agents (agency-agents-main)
| ID | Agent | Source Path | Domain |
|----|-------|------------|--------|
| A01 | inventory-forecaster | supply-chain/ | Demand forecasting |
| A02 | vendor-evaluator | supply-chain/ | Supplier scoring |
| A03 | invoice-tracker | finance/ | Invoice chase automation |
| A04 | financial-forecaster | finance/ | Cash flow reports |
| A05 | fraud-detector | finance/ | Payment anomaly |
| A06 | erp-admin | business/ | ERP automation |
| A07 | incident-responder | devops/ | Auto-remediation |
| A08 | deploy-guardian | devops/ | Deployment safety |
| A09 | infra-monitor | devops/ | Infrastructure health |
| A10 | api-tester | testing/ | Automated API testing |
| A11 | etl-pipeline | data/ | Data sync orchestration |
| A12 | anomaly-detector | data/ | Data quality |

### openclaw Agents (awesome-openclaw-agents-main)
| ID | Agent | Source Path | Domain |
|----|-------|------------|--------|
| O01 | inventory-tracker | agents/supply-chain/ | Real-time stock tracking |
| O02 | accounts-payable | agents/finance/ | AP automation |
| O03 | security-hardener | agents/security/ | Security baseline enforcement |
| O04 | deploy-guardian | agents/devops/ | Deploy safety (complements A08) |
| O05 | excalidraw-architecture | skills/ | Architecture diagram generation |

---

## Phase 0: Governance & Planning (Weeks 1-2)

| Task ID | Task Name | Primary Agent | Support Agent | Skill Source | Output |
|---------|-----------|--------------|--------------|-------------|--------|
| T0.1 | Naming conventions + standards | R01 architect | G02 api-contract | RUFLO + gstack | STANDARDS.md (final) |
| T0.2 | Security baseline | R02 security-auditor | G01 security | RUFLO + gstack | SECURITY_BASELINE.md (final) |
| T0.3 | Version pinning | R01 architect | - | RUFLO | VERSIONS.md (final) |
| T0.4 | Network map + port allocation | R01 architect | - | RUFLO | NETWORK_MAP.md (final) |
| T0.5 | API contracts + event catalog | G02 api-contract | R08 docs-writer | gstack + RUFLO | API_CONTRACTS.md (final) |
| T0.6 | Risk register | R02 security-auditor | G01 security | RUFLO + gstack | RISK_REGISTER.md (final) |
| T0.7 | KPIs + SLO definitions | R03 performance | G05 performance | RUFLO + gstack | KPIS.md (final) |
| T0.8 | Rollback plan | R06 debugger | - | RUFLO | ROLLBACK_PLAN.md (final) |
| T0.9 | Testing strategy | R04 test-writer | G03 testing | RUFLO + gstack | TESTING_STRATEGY.md (final) |
| T0.10 | User personas | R08 docs-writer | - | RUFLO | USER_PERSONAS.md (final) |
| T0.11 | Training plan | R08 docs-writer | - | RUFLO | TRAINING_PLAN.md (Phase 4) |
| T0.12 | Master architecture | R01 architect | G02 api-contract | RUFLO + gstack | MASTER_ARCHITECTURE.md |
| T0.13 | Service catalog | R01 architect | R08 docs-writer | RUFLO | SERVICE_CATALOG.md |
| T0.14 | Agent playbooks | R01 architect | - | RUFLO | AGENT_PLAYBOOKS.md |
| T0.15 | CI/CD pipeline design | A08 deploy-guardian | R02 security | agency + RUFLO | CI_CD_PIPELINE.md |

---

## Phase 1: Core Infrastructure (Weeks 3-5)

| Task ID | Task Name | Primary Agent | Support Agent | Skill Source | Acceptance Criteria |
|---------|-----------|--------------|--------------|-------------|---------------------|
| T1.1 | Docker Compose core (postgres, redis, minio, vault) | A09 infra-monitor | R02 security-auditor | agency + RUFLO | All containers healthy; pg_isready passes all DBs |
| T1.2 | Caddy reverse proxy + TLS | R02 security-auditor | G01 security | RUFLO + gstack | HTTPS on all services; HTTP auto-redirect; valid cert |
| T1.3 | Homarr dashboard + basic tiles | R08 docs-writer | O05 excalidraw | RUFLO + openclaw | Dashboard loads; all service tiles present |
| T1.4 | SigNoz observability stack | R03 performance | A09 infra-monitor | RUFLO + agency | Traces visible; metrics collecting; dashboards created |
| T1.5 | HashiCorp Vault initialization | R02 security-auditor | G01 security | RUFLO + gstack | Vault unsealed; all secrets stored; access policies set |
| T1.6 | RBAC model implementation | R02 security-auditor | G01 security | RUFLO + gstack | All 6 roles defined; JWT claims validated; tests passing |
| T1.7 | Docker network topology | R01 architect | A09 infra-monitor | RUFLO + agency | All 4 networks created; services on correct networks |
| T1.8 | Backup infrastructure + MinIO | A09 infra-monitor | R06 debugger | agency + RUFLO | Daily backup running; restore tested successfully |
| T1.9 | ENVIRONMENTS.md staging setup | A08 deploy-guardian | R02 security | agency + RUFLO | Staging server configured; data refresh script working |
| T1.10 | Phase 1 security gate | G01 security | R02 security-auditor | gstack + RUFLO | All G01 Phase 1 checklist items pass |

---

## Phase 2: Business Systems (Weeks 6-9)

### InvenTree (Weeks 6-7)

| Task ID | Task Name | Primary Agent | Support Agent | Acceptance Criteria |
|---------|-----------|--------------|--------------|---------------------|
| T2.1a | InvenTree deploy + migrations | R04 test-writer | G04 data-migration | Web UI accessible; admin login works; migrations applied |
| T2.1b | InvenTree part catalog + categories | A01 inventory-forecaster | R07 refactoring | Parts imported; categories set; units configured |
| T2.1c | InvenTree QR code system | R01 architect | R08 docs-writer | QR generated per part; scan updates stock; labels printable |
| T2.1d | InvenTree BOM versioning | R04 test-writer | G04 data-migration | BOM create/approve/version works; explosion calculates correctly |
| T2.1e | InvenTree lifecycle states | R01 architect | R04 test-writer | Active/Deprecated/Retired transitions work; events emitted |
| T2.1f | InvenTree supplier management | A02 vendor-evaluator | R04 test-writer | Suppliers linked to parts; preferred supplier set; lead times configured |
| T2.1g | InvenTree Gateway plugin | R01 architect | R05 code-reviewer | Plugin installed; all events forwarded to Gateway /events/ingest |
| T2.1h | InvenTree stocktake workflow | A01 inventory-forecaster | R04 test-writer | Stocktake initiates; discrepancies logged; reconciliation works |

### AureusERP (Weeks 6-7)

| Task ID | Task Name | Primary Agent | Support Agent | Acceptance Criteria |
|---------|-----------|--------------|--------------|---------------------|
| T2.2a | AureusERP deploy + migrations | G04 data-migration | R04 test-writer | Web UI accessible; all plugins enabled; migrations complete |
| T2.2b | Chart of accounts setup | A06 erp-admin | R08 docs-writer | COA configured for business; opening balances entered |
| T2.2c | Products catalog (mirrors InvenTree) | A06 erp-admin | G04 data-migration | Products imported; linked to InvenTree part IDs |
| T2.2d | Vendor/supplier setup | A02 vendor-evaluator | A06 erp-admin | Vendors entered; payment terms set; bank accounts linked |
| T2.2e | Invoice templates | R08 docs-writer | A06 erp-admin | Invoice PDF template customized; auto-numbering configured |
| T2.2f | AureusERP API token + Gateway config | R02 security-auditor | G01 security | Token stored in Vault; Gateway can create POs and invoices |

### Twenty CRM (Week 7)

| Task ID | Task Name | Primary Agent | Support Agent | Acceptance Criteria |
|---------|-----------|--------------|--------------|---------------------|
| T2.3a | Twenty CRM deploy + migrations | G04 data-migration | R04 test-writer | Web UI accessible; login works; GraphQL API responding |
| T2.3b | Custom pipeline stages | R08 docs-writer | A11 etl-pipeline | Sales pipeline: Lead → Qualified → Proposal → Won/Lost |
| T2.3c | Contact + company import | A11 etl-pipeline | G04 data-migration | Contacts imported; companies linked; no duplicates |
| T2.3d | Twenty webhook configuration | R01 architect | R04 test-writer | Webhooks fire on contact/deal create/update; Gateway receives |
| T2.3e | Twenty GraphQL token + Gateway config | R02 security-auditor | G01 security | Token in Vault; Gateway can query and update Twenty |

### Paperless-ngx (Week 7)

| Task ID | Task Name | Primary Agent | Support Agent | Acceptance Criteria |
|---------|-----------|--------------|--------------|---------------------|
| T2.4a | Paperless-ngx deploy | A09 infra-monitor | R04 test-writer | UI accessible; document upload works; OCR running |
| T2.4b | Document types + auto-classification rules | R08 docs-writer | A06 erp-admin | Invoices, POs, contracts auto-tagged; correspondents auto-assigned |
| T2.4c | Paperless webhook + Gateway config | R01 architect | R04 test-writer | Webhook fires on OCR complete; Gateway receives and routes to HuixiangDou |

### YetiForceCRM (Week 8)

| Task ID | Task Name | Primary Agent | Support Agent | Acceptance Criteria |
|---------|-----------|--------------|--------------|---------------------|
| T2.5a | YetiForce deploy + initial config | G04 data-migration | R07 refactoring | Web UI accessible; modules enabled; admin configured |
| T2.5b | YetiForce modules: Helpdesk, Assets, Contracts | R07 refactoring | R08 docs-writer | All 3 modules functional; test tickets created |
| T2.5c | YetiForce API key + Gateway config | R02 security-auditor | G01 security | API key in Vault; Gateway can create contacts and read tickets |
| T2.5d | Contact sync: Twenty ↔ YetiForce | A11 etl-pipeline | R04 test-writer | New contact in Twenty syncs to YetiForce within 30s |

### Data Migration (Week 9)

| Task ID | Task Name | Primary Agent | Support Agent | Acceptance Criteria |
|---------|-----------|--------------|--------------|---------------------|
| T2.6a | Seed data: all services | G04 data-migration | A11 etl-pipeline | All seed scripts run without error; test data visible in UI |
| T2.6b | Phase 2 data integrity tests | R04 test-writer | G04 data-migration | No orphaned records; foreign key lookups work across services |
| T2.6c | Phase 2 security gate | G01 security | R02 security-auditor | All G01 Phase 2 checklist items pass |

---

## Phase 3: Integration Layer (Weeks 10-12)

| Task ID | Task Name | Primary Agent | Support Agent | Acceptance Criteria |
|---------|-----------|--------------|--------------|---------------------|
| T3.1 | FastAPI Gateway scaffold | R01 architect | G02 api-contract | Project structure created; /health returns 200; OpenAPI spec valid |
| T3.2 | Auth middleware (JWT RS256) | R02 security-auditor | G01 security | JWT validation works; expired tokens rejected; RBAC claims enforced |
| T3.3 | Rate limiting + CORS + security headers | R02 security-auditor | G02 api-contract | Rate limits enforced under load test; CORS blocks unauthorized origins |
| T3.4 | Idempotency middleware | R04 test-writer | G02 api-contract | Duplicate POST with same key returns cached result; test passes |
| T3.5 | Event ingestion endpoint | R01 architect | R04 test-writer | POST /events/ingest validates schema; stores in gateway_db; publishes to Redis |
| T3.6 | Event bus (Redis pub/sub + workers) | R01 architect | R06 debugger | Events delivered to subscribers; failed events go to DLQ |
| T3.7 | DLQ management API | R06 debugger | R04 test-writer | DLQ CRUD API works; replay and ignore endpoints functional |
| T3.8 | Circuit breakers (per service) | R06 debugger | R03 performance | Breakers trip at 5 failures; half-open recovery works; metrics emitted |
| T3.9 | Inventory API proxy + business logic | R01 architect | G02 api-contract | GET/POST /api/v1/inventory/* works; transforms to/from InvenTree format |
| T3.10 | ERP API proxy + business logic | R01 architect | G02 api-contract | POST /api/v1/erp/pos/* and invoices/* work; idempotency enforced |
| T3.11 | CRM API proxy + business logic | R01 architect | G02 api-contract | GET/POST /api/v1/crm/* works; GraphQL queries to Twenty |
| T3.12 | Stock sync logic (InvenTree ↔ AureusERP) | R04 test-writer | G03 testing | stock.low → auto-PO flow works end-to-end; idempotent |
| T3.13 | Deal-to-invoice flow | A11 etl-pipeline | R04 test-writer | deal.won → invoice created in AureusERP within 10s |
| T3.14 | Document OCR → AI index flow | A11 etl-pipeline | R04 test-writer | document.ocr.complete → HuixiangDou indexed; queryable |
| T3.15 | Contact sync (Twenty ↔ YetiForce) | A11 etl-pipeline | R04 test-writer | Bidirectional sync; loop prevention verified |
| T3.16 | AI automation agents wired | A07 incident-responder | A01 inventory-forecaster | Auto-PO, invoice-chase, demand-forecast agents all running |
| T3.17 | OpenTelemetry instrumentation | R03 performance | A09 infra-monitor | All Gateway endpoints traced in SigNoz; custom metrics visible |
| T3.18 | Contract tests (all external APIs) | R04 test-writer | G02 api-contract | All contract tests pass in CI pipeline |
| T3.19 | Integration test suite | R04 test-writer | G03 testing | Full integration test suite passes; CI green |
| T3.20 | Load test + performance benchmark | R03 performance | G05 performance | All SLO targets met at 2x expected load |
| T3.21 | Phase 3 security gate | G01 security | R02 security-auditor | All G01 Phase 3 checklist items pass |

---

## Phase 4: UX & Hardening (Weeks 13-16)

| Task ID | Task Name | Primary Agent | Support Agent | Acceptance Criteria |
|---------|-----------|--------------|--------------|---------------------|
| T4.1 | Homarr dashboard: all tiles + widgets | O05 excalidraw | R08 docs-writer | All 10 service tiles; 4 live widgets; auto-refresh |
| T4.2 | Zulip ChatOps integration | R08 docs-writer | A07 incident-responder | All alert channels configured; test alert delivered |
| T4.3 | HuixiangDou knowledge base population | A11 etl-pipeline | R08 docs-writer | InvenTree catalog + Paperless docs indexed; AI answering queries |
| T4.4 | Excalidraw collaborative boards | O05 excalidraw | R08 docs-writer | Accessible; architecture board created; team access |
| T4.5 | Flowchart AI integration + patent pipeline | R01 architect | R04 test-writer | Upload patent PDF → get flowchart output pipeline working |
| T4.6 | Mobile PWA (Homarr + InvenTree) | R05 code-reviewer | R04 test-writer | PWA installable on mobile; QR scan works on device |
| T4.7 | SigNoz final dashboards + alerts | R03 performance | A09 infra-monitor | All 4 dashboards configured; all alert rules active; Zulip connected |
| T4.8 | User training materials | R08 docs-writer | - | Per-role guides written; video scripts complete |
| T4.9 | Staging UAT: business stakeholders | A06 erp-admin | R08 docs-writer | All 5 user personas complete acceptance test scenarios |
| T4.10 | Penetration test | G07 red-team | R02 security-auditor | 0 Critical, 0 High findings |
| T4.11 | Chaos engineering tests | R06 debugger | R04 test-writer | Service kill, network timeout, disk full: all gracefully handled |
| T4.12 | Final load test (production spec) | R03 performance | G05 performance | All SLOs met at production expected peak |
| T4.13 | Rollback plan final test | R06 debugger | A08 deploy-guardian | Full rollback executed and verified < 30 min |
| T4.14 | Documentation complete | R08 docs-writer | G02 api-contract | All runbooks, API docs, user guides finalized |
| T4.15 | Phase 4 security gate + go-live approval | G01 security | G07 red-team | All Phase 4 gates pass; Lead + Steering Committee sign off |

---

## Agent Workload Summary

| Agent | Phase 0 Tasks | Phase 1 Tasks | Phase 2 Tasks | Phase 3 Tasks | Phase 4 Tasks | Total |
|-------|--------------|--------------|--------------|--------------|--------------|-------|
| R01 architect | T0.1,T0.3,T0.4,T0.12,T0.13,T0.14 | T1.7 | T2.1c,T2.1e,T2.1g,T2.3d,T2.4c,T2.5d | T3.1,T3.5,T3.6,T3.9,T3.10,T3.11,T3.15,T4.5 | T4.5 | 21 |
| R02 security-auditor | T0.2,T0.6 | T1.2,T1.5,T1.6 | T2.2f,T2.3e,T2.4c,T2.5c | T3.2,T3.3,T3.21 | T4.10,T4.13 | 14 |
| R03 performance | T0.7 | T1.4 | - | T3.17,T3.20 | T4.7,T4.12 | 6 |
| R04 test-writer | T0.9 | - | T2.1b,T2.1d,T2.1f,T2.1h,T2.2a,T2.3a,T2.3d,T2.4a | T3.4,T3.5,T3.7,T3.12,T3.13,T3.14,T3.18,T3.19 | T4.6,T4.11 | 19 |
| R05 code-reviewer | - | - | - | - | T4.6,T4.14 | 2 |
| R06 debugger | T0.8 | T1.8,T1.9 | - | T3.6,T3.7,T3.8 | T4.11,T4.13 | 8 |
| R07 refactoring | - | - | T2.5a,T2.5b | - | - | 2 |
| R08 docs-writer | T0.5,T0.10,T0.11,T0.13 | T1.3 | T2.1b,T2.1c,T2.2e,T2.4b,T2.5b | - | T4.1,T4.2,T4.3,T4.4,T4.8,T4.14 | 15 |
| G01 security | T0.2 | T1.2,T1.5,T1.6,T1.10 | T2.2f,T2.3e,T2.5c,T2.6c | T3.2,T3.3,T3.21 | T4.10,T4.15 | 14 |
| G02 api-contract | T0.1,T0.5,T0.12 | - | - | T3.1,T3.9,T3.10,T3.11,T3.18 | T4.14 | 9 |
| G03 testing | T0.9 | - | - | T3.12,T3.19 | - | 3 |
| G04 data-migration | - | - | T2.1a,T2.2a,T2.3a,T2.5a,T2.6a,T2.6b | - | - | 6 |
| G05 performance | T0.7 | - | - | T3.20 | T4.12 | 3 |
| G07 red-team | - | - | - | - | T4.10,T4.15 | 2 |

---

*Owner: Lead Architect*  
*Review: Update when task assignments change or new agents added*
