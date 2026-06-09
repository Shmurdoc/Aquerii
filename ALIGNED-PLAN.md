# AQUERII — ALIGNED SYSTEM PLAN

## Reality Check: Correcting the Rebuilt Plan's Assumptions

The "Aquerii Rebuilt Plan" was written based on the docs-only workspace (`E:\Mine System`). The actual codebase at `C:\Users\madoc\source\repos\Aquerii` is **significantly more complete** than the plan assumes. This document aligns the strategic vision with reality.

---

## MAJOR CORRECTIONS

### Correction 1: PTW Module — EXISTS (not 1/10)

The rebuilt plan claims PTW is "1/10, does not exist." **False.** The PTW module is a full implementation:

| Feature | Status |
|---------|--------|
| `Permit` model with 9-status state machine (draft→requested→approved→issued→active→suspended/closed/rejected/expired) | ✅ Complete |
| `PermitHazard` model — linked hazards with control measures | ✅ Complete |
| `PermitIsolation` model — LOTO points with energy types, lock/tag tracking | ✅ Complete |
| Permit types: hot_work, confined_space, work_at_height, electrical_isolation, blasting, lifting, excavation | ✅ Complete |
| Risk levels: low, medium, high, extreme | ✅ Complete |
| Location details with mining-specific fields (section, level, shaft) | ✅ Complete |
| Lifecycle timestamps for every state transition | ✅ Complete |
| Migration: `2026_06_03_000100_create_ptw_tables.php` | ✅ Comprehensive |

**Verdict**: 8/10. Core lifecycle exists. Missing: webhook notifications on state changes, frontend components for permit wizard/approval queue, DMR register export.

### Correction 2: HSSE Module — EXISTS (not 0/10)

| Feature | Status |
|---------|--------|
| `Incident` model with MHSA classification (A/B/C), COIDA reporting | ✅ Complete |
| `Hazard` model — risk assessment with likelihood/severity, control measures | ✅ Complete |
| `CorrectiveAction` — polymorphic, linked to incidents/hazards/inspections/audits | ✅ Complete |
| Incident types: fatality, LTI, MTC, first aid, near miss, dangerous occurrence, environmental, property_damage | ✅ Complete |
| Location details with mining fields (section, shaft, level) | ✅ Complete |
| Migration: `2026_06_02_000004_create_hsse_tables.php` | ✅ Comprehensive |

**Verdict**: 7/10. Incident record is complete. Missing: DMRE Section 23 export PDF, LTIFR auto-calculation, COIDA form pre-population.

### Correction 3: Competency/Certification Module — EXISTS (not "needs to be built")

| Feature | Status |
|---------|--------|
| `CompetencyType` — defines what certifications exist per trade | ✅ Complete |
| `CompetencyRecord` — worker-to-certification link with expiry, verification | ✅ Complete |
| `CofRecord` — medical fitness (Certificate of Fitness) tracking | ✅ Complete |
| `CompetencyRequirement` — polymorphic requirements for equipment/roles/permit types | ✅ Complete |
| `TrainingRecord` — training history with provider, score, expiry | ✅ Complete |
| Migration: `2026_06_03_000011-000015` | ✅ 5 migrations |

**Verdict**: 9/10. Very comprehensive. Missing: automated expiry notifications (SMS/WhatsApp), compliance score dashboard.

### Correction 4: Inventory/Stock — EXISTS (not 0/10)

| Feature | Status |
|---------|--------|
| `ProductController` — CRUD | ✅ Complete |
| `StockController` — show stock, adjust, movements | ✅ Complete |
| Routes: `apiResource('products', ...)`, `products/{id}/stock/adjust`, `products/{id}/stock/movements` | ✅ Complete |

**Verdict**: 6/10. Core inventory exists. Missing: warehouses, batch/lot tracking, stock transfers, reorder points.

### Correction 5: HR Module — EXISTS (not 0/10)

HR routes imported from `routes/modules/hr.php`. Actual models:
- `AttendanceLog` — clock in/out tracking
- `ShiftAssignment` — worker-shift linking
- `ShiftHandover` — shift change notes
- `LeaveRequest` — leave management
- `EmployeeGroup` — org chart hierarchy

**Verdict**: 5/10. Basic HR exists. Missing: timesheet approval workflows, overtime calculation, Payroll integration.

### Correction 6: CRM — More Complete Than Described

The rebuilt plan says CRM is a generic "deals/pipelines/won/lost" system. The actual CRM module is mature:

| Feature | Status |
|---------|--------|
| Deals (CRUD, move between stages, won/lost) | ✅ Complete |
| Pipelines + Stages (custom pipelines, reorder) | ✅ Complete |
| Contacts (duplicate detection, merge, relationships, consent/POPIA) | ✅ Complete |
| Companies | ✅ Complete |
| Quotes (send, accept, reject, duplicate) | ✅ Complete |
| Products (linked to deals/quotes) | ✅ Complete |
| Leads (assign, convert to deal) | ✅ Complete |
| Sequences (email sequences, enroll/unenroll, progress tracking) | ✅ Complete |
| Call Logs | ✅ Complete |
| Deal Activities | ✅ Complete |
| Deal Approval Workflow (rules-based approval chain) | ✅ Complete |
| Deal Automation Rules | ✅ Complete |
| Forecast (by rep, by pipeline) | ✅ Complete |
| Quotas (with attainment tracking) | ✅ Complete |
| Reports (pipeline velocity, revenue, win/loss, activities, lead sources) | ✅ Complete |
| Analytics (funnel, cohort, churn risk, CLV) | ✅ Complete |
| Calendar Sync (Google/Outlook) | ✅ Complete |
| Contact Import (CSV upload with status tracking) | ✅ Complete |
| Telephony integration | ✅ Complete |

**Verdict**: The CRM is a full-featured sales CRM, not a stub. Repositioning to "Contracts/People Registry" would require renaming models, routes, and frontend components. The data model is close enough that the repositioning is feasible but would be a **significant refactoring** (not "6-10 hours" as the plan suggests — more like 3-5 days for backend plus 5-7 days for frontend).

### Correction 7: ERP Module — EXISTS

The actual ERP module includes:
- Invoicing (with PDF generation, payment recording, status workflows, approval workflow)
- Sales Orders (convert to invoice)
- Purchase Orders (PDF generation)
- Goods Receipts (PDF)
- Credit Notes (PDF)
- Financial Approvals
- Goals/OKRs
- Meeting Outcomes
- Scenarios (digital twin / what-if simulation)
- Sentiment / burnout detection

**Verdict**: 6/10. Invoice-focused ERP exists. Missing: full accounting (chart of accounts, general ledger, P&L), procurement, full purchasing.

### Correction 8: Queue/Horizon — Already Configured

The rebuilt plan asks if queue is `sync`. **No.** Default is **`redis`**, Horizon is fully configured with:
- 5 named queues: `default`, `ai`, `notifications`, `automations`, `indexing`
- Production supervisor config with `minProcesses=2, maxProcesses=20`
- Dedicated supervisors for notifications, automations, and AI
- Local dev supervisor with 3 processes

This is production-ready queue infrastructure.

### Correction 9: Scheduled Tasks — Already Have 10 Commands

The rebuilt plan says reminders "may not fire without queue worker." The queue worker is configured. 10 scheduled commands exist:
- Hourly: due reminders, deal aging
- Every 5 min: email sync, deal escalations
- Daily: Sanctum prune, stale contacts, billing dunning, workspace usage recalc, trial purge
- Monthly: AI credits reset

---

## WHAT THE REBUILT PLAN GETS RIGHT

These criticisms are valid and must be addressed:

### 1. CRM Repositioning
The CRM is a mature sales system but the product message must shift from "CRM for mining" to "Workforce and compliance operations platform." The CRM features serve a secondary purpose (client relationship management with PMC/Foskor). The primary product is: **Worker compliance, permit-to-work, safety incident management, and certification tracking.**

### 2. Site Access / Gate Log — DOES NOT EXIST
The rebuilt plan identifies this correctly. There is no `SiteAccessLog` model. The `AttendanceLog` is HR clock-in/clock-out, not site gate entry/exit with compliance verification. **This is a critical gap** for the mining use case.

### 3. Dedicated Worker Model
`WorkspaceMember` is a pivot table between `User` and `Workspace`. It acts as the worker record but lacks:
- `badge_id` (physical access badge)
- `site_id` (primary mine site assignment)
- `employment_type` (permanent, fixed_term, labour_broker, subcontractor)
- Emergency contacts (currently a text field)
- Blood type, medical info
- `overall_compliance_status` (computed field)

### 4. Compliance Engine
The competency module tracks certifications but there's no **rules-based compliance engine** that computes `worker.overall_compliance_status` from multiple inputs. This is the rebuilt plan's core insight — the system needs a deterministic compliance score that:
- Checks medical fitness status
- Checks site induction validity
- Checks role-required certifications
- Checks contractor company status
- Automatically flags non-compliant workers

### 5. Automated Expiry Notifications
The schedule has `crm:alert-stale-contacts` but no dedicated certificate expiry notification pipeline with:
- 90-day warning → email to HSSE officer
- 30-day warning → email + SMS
- 7-day warning → email + SMS + in-app banner
- Day 0 → auto-flip to NON_COMPLIANT

### 6. Native Mobile App
The rebuilt plan is correct that IndexedDB in a PWA on cheap Android phones is unreliable. The existing system may use a PWA approach. Need to assess current mobile strategy and plan for React Native/Flutter.

### 7. Infrastructure Production Readiness
docker-compose in production is not acceptable. The plan correctly identifies that the system needs:
- Managed Postgres (CloudSQL/RDS)
- Managed Redis (Upstash/ElastiCache)
- Cloud object storage instead of Minio
- Container orchestration (Cloud Run or K8s)

### 8. Pricing Model
The rebuilt plan's pricing (R799-R4,500/month) is correct for the SA mining contractor market. The current pricing (free/starter/growth/business via Stripe) needs to be aligned to this.

### 9. Security: Service Auth
The rebuilt plan correctly criticizes `X-Internal-Secret` headers. The current `services.ai.secret` and `services.realtime.secret` configs use static secrets. Need short-lived JWTs for service-to-service auth.

### 10. Test Checklist
The 36-point test checklist in the rebuilt plan is comprehensive and should be used as the QA gate for production readiness.

---

## CORRECTED SYSTEM HEALTH SCORE

| Dimension | Rebuilt Plan Score | Corrected Score | Notes |
|-----------|-------------------|-----------------|-------|
| PTW | 1/10 | **8/10** | Full lifecycle exists |
| HSSE | 3/10 | **7/10** | Incidents, hazards, corrective actions exist |
| Certifications | "needs to be built" | **9/10** | Competency module is comprehensive |
| Inventory/Stock | 3/10 | **6/10** | Products + stock movements exist |
| ERP/Accounting | 4/10 | **6/10** | Invoicing, sales orders, financial approvals exist |
| Queue | "may be sync" | **8/10** | Redis + Horizon fully configured |
| CRM | "generic CRM" | **9/10** | Full-featured with analytics, approvals, automation |
| Site Access Log | "must build" | **0/10** | Does NOT exist — critical gap |
| Compliance Engine | "must build" | **3/10** | Competency records exist but no rules engine |
| Expiry Notifications | "must build" | **4/10** | Schedule exists but no tiered notification pipeline |
| Mobile Strategy | PWA risk | **4/10** | Current approach needs assessment |
| Infrastructure | "docker-compose" | **5/10** | Docker-based, needs managed services |
| Pricing Model | missing | **4/10** | Stripe integrated but not ZAR-priced for mining |

---

## REAL BUILD ORDER

The rebuilt plan's suggested build order (Sprints 1-12 over 24 weeks) is based on an incorrect assumption that nothing exists. **Most of what they suggest building in Sprints 1-7 already exists.** The correct build order is:

### Sprint 1 (Week 1): CI/CD Green + Pest 100%
**Critical path. Blocking everything.**
- Workstream 0: Push branch, fix CI failures
- Workstream 1: Pest 46→0
- **Target**: Green CI on PR #1, Pest 368/368

### Sprint 2 (Week 2): Compliance Engine + Expiry Notifications
**Highest value add. The core product differentiator.**
1. Build compliance rules engine (based on existing Competency module)
   - Compute `worker.overall_compliance_status` from: medical fitness, site induction, role-required certs, employment status, contractor status
   - Trigger compliance recalculation on every competency record change
   - Add `compliance_status` to `workspace_members` or a dedicated `Worker` model
2. Build tiered expiry notification pipeline (90/30/7/0 day schedule)
   - Queue-based notifications via existing Horizon infrastructure
   - SMS via Vonage/Twilio
   - Email via existing Postmark/SES config
3. Add compliance dashboard endpoint: `GET /workspaces/{id}/compliance`

### Sprint 3 (Week 3): Site Access Log + Gate Kiosk
**Critical gap. Needed for the gate scan demo.**
1. Build `SiteAccessLog` model + migration:
   - worker_id, site_id/workspace_id, direction (entry/exit), timestamp
   - method (qr_scan, id_scan, manual_override)
   - compliance_snapshot (JSON — capture compliance state at time of scan)
   - override_reason, override_by_user_id
2. Build gate scan endpoint:
   - `POST /workspaces/{id}/gate/scan` — accepts badge/ID scan, returns green/red
   - Under 500ms p99 response time
3. Build kiosk UI (read-only, API-key authenticated)

### Sprint 4 (Week 4): CRM Repositioning + Worker Model
**Differentiation: Reposition CRM from "sales tool" to "contract lifecycle + people registry"**
1. Decide: Rename models (crm_deals→contracts, crm_contacts→people) or add view/computed layer?
   - **Recommendation**: Add computed views and API versioning. Don't rename DB tables — too risky for existing data. Add `contracts` as a new entity that wraps `CrmDeal` with contract-specific fields.
2. Add dedicated `Worker` model (or extend WorkspaceMember) with:
   - badge_id, employment_type, site_assignment, emergency_contacts
   - overall_compliance_status (computed)
   - SA ID number validation (Luhn algorithm)
3. Add contractor-specific fields to `CrmCompany`:
   - registration_number (CIPC), cidb_grade, vat_number
   - contract_start_date, contract_end_date
   - safety_rating, compliance_score

### Sprint 5 (Week 5): PTW Frontend + DMR Exports
**Mining-specific value: Complete the PTW user experience.**
1. Build frontend for permit wizard (create permit with hazard/control mapping)
2. Build approval queue for HSSE leads
3. Build DMR Section 23 export PDF (matching official DMRE form)
4. Build permit register export (PDF + Excel)
5. Build COIDA form pre-population (W.Cl.1 + W.Cl.2)

### Sprint 6 (Week 6): Security Hardening + Infrastructure
**Production readiness.**
1. Replace `X-Internal-Secret` with short-lived JWTs (5-min TTL)
2. Add .env secret scanning (git-secrets pre-commit hook)
3. Add ClamAV scan for uploaded certificates
4. Set up managed Postgres + Redis (evaluate: GCP Cloud SQL + Memorystore vs Supabase)
5. Set up cloud object storage (replace Minio for production)
6. Configure production Cloud Run deployment (GCP Africa South 1)

### Sprint 7 (Week 7): Native Mobile MVP
**Field worker experience.**
1. Audit current mobile strategy: Is it PWA? React Native web? What exists in `services/web/`?
2. Build React Native (Expo) app with:
   - Worker view of own compliance status
   - Permit sign-on/sign-off (offline-capable with local SQLite)
   - Incident first report (offline-capable)
   - Sync manager (background sync with conflict resolution)
3. QR code generation for worker badges

### Sprint 8 (Week 8): E2E Coverage + Test Checklist
**Quality gate for production.**
1. Write E2E tests for:
   - PTW lifecycle (create→submit→approve→activate→close)
   - Gate scan (compliant/non-compliant)
   - Certificate upload + expiry notification
   - Compliance dashboard
   - Incident report + DMR export
2. Verify all 36 points from the rebuilt plan's test checklist
3. Target: 98% E2E pass rate, 100% Pest

---

## PRICING MODEL (Adopted from Rebuilt Plan)

The rebuilt plan's ZAR-denominated pricing is correct for the target market. The current Stripe pricing (`starter`, `growth`, `business` plan IDs) should be mapped:

| Current Stripe Plan | Rebuilt Plan | ZAR/month | Target Customer |
|--------------------|--------------|-----------|-----------------|
| `starter` → | Starter | R799 | ≤30 workers, 1 admin, email only |
| `growth` → | Professional | R1,999 | ≤100 workers, 5 users, SMS+gate |
| `business` → | Enterprise | R4,500 | Unlimited, WhatsApp, custom reports |

**Free trial**: 30 days, full Professional features, no credit card. Convert on data dependency.

---

## INFRASTRUCTURE TARGET (Adopted from Rebuilt Plan)

**Phase 1 (0-50 contractors, Month 1-3):**
```
Cloud: GCP Africa South 1 (Johannesburg) — POPIA compliance
API:   Cloud Run (serverless, scales to zero)
DB:    Cloud SQL Postgres 16 (db-g1-small, ~R800/mo)
Cache: Memorystore Redis 1GB (~R600/mo)
Storage: Cloud Storage (replace Minio)
AI:    Cloud Run or Cloud Run Jobs
CI/CD: GitHub Actions → Cloud Build → Cloud Run
Cost:  ~R1,750/month infrastructure
```

**Phase 2 (50-300 contractors, Month 3-12):**
- Scale Cloud SQL to db-n1-standard-2
- Add read replica for analytics
- Add Meilisearch Cloud for full-text search
- Add Sentry for error tracking
- Cost: ~R8,000-15,000/month

---

## DECISIONS REQUIRED

1. **CRM Rename**: Do we rename models/tables/routes (breaking change) or add a computed view layer? I recommend the latter — less risk, faster to ship.

2. **Worker Model**: Extend `WorkspaceMember` or create dedicated `Worker` model? I recommend extending WorkspaceMember with new fields + computed compliance attribute — avoids a migration of 150+ existing members.

3. **Mobile Framework**: What does `services/web/` currently use? Need to assess the frontend stack to determine React Native vs Flutter path.

4. **Site Access Log**: Build now or defer? This is a demo-critical feature for the gate clerk persona. I recommend Sprint 3.

5. **Infrastructure Move**: When do you want to migrate from Docker to managed cloud? Before or after pilot launch?

---

## IMMEDIATE NEXT STEPS (WEEK 1)

1. Push `feat/crm-phases-3-to-8` to trigger CI on PR #1
2. Fix CI failures (E2E job needs frontend, 46 Pest failures)
3. Build compliance rules engine (highest value, 2-3 days)
4. All other workstreams await CI green

This plan aligns the strategic vision of the rebuilt document with the reality of the codebase that already exists. The system is **much further along** than the plan assumed — the critical gaps are Site Access Log, compliance engine, and production infrastructure, not the full PTW/HSSE/Competency suite that already exists.
