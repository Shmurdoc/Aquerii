# FlowOS — Phase Execution Plan

**Version**: 1.0  
**Total Duration**: 32 weeks (8 months)  
**Team**: 1 Tech Lead, 2 Backend (PHP/Laravel), 1 Backend (Python/AI), 2 Frontend (React/TS), 1 Mobile (React Native), 1 DevOps, 1 QA Lead  
**Sprint Length**: 2 weeks  
**Release Strategy**: Phase 1–3 = internal/beta only. Phase 4 = closed beta (invited workspaces). Phase 5 = public launch.

---

## Phase Overview

| Phase | Weeks | Focus | Exit Gate |
|-------|-------|-------|-----------|
| 0 | 1–2 | Foundation & Infrastructure | All services boot, CI green, DB migrated |
| 1 | 3–8 | Core Platform (Boards + Auth + Realtime) | Boards fully functional, real-time sync working |
| 2 | 9–16 | Documents + CRM + Billing | All 3 products live, Stripe+PayFast processing |
| 3 | 17–22 | AI + Automation + Dev Plan | AI features live, automations fire, GitHub sync |
| 4 | 23–28 | Mobile + Polish + Load Test | Mobile apps in beta, SLOs verified, 0 P0 bugs |
| 5 | 29–32 | Security + Launch Readiness | Red team passed, public launch |

---

## Phase 0 — Foundation (Weeks 1–2)

**Goal**: Infrastructure running, CI pipeline green, empty app boots end-to-end.

### Tasks

| ID | Task | Owner | Output |
|----|------|-------|--------|
| P0.1 | Initialize monorepo structure | Tech Lead | `/services/`, `/apps/`, `/infra/`, `/tests/` directories |
| P0.2 | Docker Compose for all services | DevOps | All 9 services start with `docker compose up` |
| P0.3 | PostgreSQL setup: schemas, RLS, roles | Backend Lead | `superadmin` role, `app` role, RLS enabled |
| P0.4 | Redis setup: queues, pub/sub channels | DevOps | Horizon connects, pub/sub verified |
| P0.5 | Meilisearch setup + health check | DevOps | `/health` returns `available` |
| P0.6 | ClickHouse setup + events schema | DevOps | Events table created, insert verified |
| P0.7 | GitHub Actions CI pipeline skeleton | DevOps | All jobs defined, run on every PR |
| P0.8 | Laravel app scaffold (no features) | Backend Lead | `php artisan route:list` shows health endpoint |
| P0.9 | Node.js realtime service scaffold | Frontend Lead | Socket.IO server accepts connections |
| P0.10 | Python AI service scaffold | AI Backend | FastAPI `/health` returns 200 |
| P0.11 | React web app scaffold (Vite + TS) | Frontend | App boots, `/` renders |
| P0.12 | React Native scaffold (Expo) | Mobile | App boots on iOS simulator + Android emulator |
| P0.13 | Filament Super Admin scaffold | Backend Lead | Super Admin login page renders |
| P0.14 | Vault secrets integration | DevOps | All services read secrets from Vault, no `.env` in prod |
| P0.15 | Observability stack (Prometheus + Grafana) | DevOps | Metrics visible in Grafana |

**Exit Gate**: `docker compose up` → all services healthy → CI pipeline green on empty PR.

---

## Phase 1 — Core Platform (Weeks 3–8)

**Goal**: Boards product fully functional. Users can create workspaces, boards, items, invite members, see real-time updates.

### Sprint 1 (Weeks 3–4): Auth + Workspace + RBAC

| ID | Task | Owner |
|----|------|-------|
| P1.1 | Registration + email verification | Backend |
| P1.2 | Login (email/password + Google OAuth + GitHub OAuth) | Backend |
| P1.3 | JWT issuance + refresh token rotation | Backend |
| P1.4 | MFA (TOTP setup + verify) | Backend |
| P1.5 | Workspace creation + onboarding flow | Backend |
| P1.6 | Invite members (email link, role selection) | Backend |
| P1.7 | RBAC middleware + permission gates on all routes | Backend |
| P1.8 | RLS session variable set on every request | Backend |
| P1.9 | Auth UI: login, register, forgot password screens | Frontend |
| P1.10 | Workspace setup UI + member invite UI | Frontend |

**Sprint 1 Exit**: User can register, verify email, log in, create workspace, invite member, member accepts.

---

### Sprint 2 (Weeks 5–6): Boards Core

| ID | Task | Owner |
|----|------|-------|
| P1.11 | Board CRUD (create, rename, archive, delete) | Backend |
| P1.12 | Group CRUD + item CRUD | Backend |
| P1.13 | 30 column types implementation | Backend |
| P1.14 | `column_values JSONB` read/write logic | Backend |
| P1.15 | Item drag-and-drop reorder (position field) | Backend |
| P1.16 | Item assignment (person column, multi-assign) | Backend |
| P1.17 | Item dependencies (blocking/blocked-by) | Backend |
| P1.18 | File attachment upload + S3/R2 storage + metering | Backend |
| P1.19 | Table View (full column editing, sorting, filtering) | Frontend |
| P1.20 | Kanban View (drag between groups) | Frontend |

**Sprint 2 Exit**: Full board CRUD with all column types in Table and Kanban views.

---

### Sprint 3 (Weeks 7–8): Realtime + Activity + Notifications

| ID | Task | Owner |
|----|------|-------|
| P1.21 | Socket.IO room management (workspace/board/item rooms) | Realtime |
| P1.22 | Laravel → Redis pub/sub → Node.js broadcast | Backend + Realtime |
| P1.23 | Optimistic update + server reconciliation in Pinia store | Frontend |
| P1.24 | Activity log (all item events recorded) | Backend |
| P1.25 | Comments (threaded, @mentions, emoji reactions) | Backend + Frontend |
| P1.26 | In-app notifications (bell icon, unread count) | Backend + Frontend |
| P1.27 | Email notifications (mention, assignment, due date) | Backend |
| P1.28 | Timeline View (date-range bars, dependencies arrows) | Frontend |
| P1.29 | Calendar View (items by due date, month/week) | Frontend |
| P1.30 | Search (Meilisearch index: items, boards; per-workspace) | Backend + Frontend |

**Phase 1 Exit Gate**:
- [ ] All Table/Kanban/Timeline/Calendar views functional
- [ ] 2 browser windows — edit item in one → update visible in other < 100ms
- [ ] All integration tests for auth + boards + realtime green
- [ ] E2E critical paths for auth + boards pass
- [ ] No P0 or P1 bugs open

---

## Phase 2 — Documents + CRM + Billing (Weeks 9–16)

### Sprint 4 (Weeks 9–10): Documents

| ID | Task | Owner |
|----|------|-------|
| P2.1 | Document CRUD + folder hierarchy | Backend |
| P2.2 | Y.js CRDT collaborative editing backend (WebSocket channel) | Realtime |
| P2.3 | BlockNote editor integration (React) | Frontend |
| P2.4 | Document embed in items (linked doc panel) | Frontend |
| P2.5 | PDF upload → pdfplumber text extraction pipeline | AI Backend |
| P2.6 | Flowchart generation from document text | AI Backend |
| P2.7 | Document search (Meilisearch full-text index) | Backend |
| P2.8 | Document permissions (view/edit per member) | Backend |

---

### Sprint 5 (Weeks 11–12): CRM

| ID | Task | Owner |
|----|------|-------|
| P2.9 | CRM contacts CRUD + company CRUD | Backend |
| P2.10 | Deal pipeline (stages, drag-to-move) | Backend + Frontend |
| P2.11 | Deal → item link (CRM deal ↔ board item) | Backend |
| P2.12 | Activity timeline on deals (calls, emails, notes) | Backend + Frontend |
| P2.13 | Email log (manual entry + Gmail/Outlook sync stub) | Backend |
| P2.14 | CRM views: pipeline Kanban, table, list | Frontend |
| P2.15 | Contact/company search + filters | Frontend |

---

### Sprint 6 (Weeks 13–14): Billing — Stripe

| ID | Task | Owner |
|----|------|-------|
| P2.16 | Stripe products + prices setup (all 5 plans × monthly/annual) | Backend |
| P2.17 | Checkout flow: plan selection → Stripe Checkout → webhook activation | Backend |
| P2.18 | Stripe webhook handler (all events: invoice, subscription, payment) | Backend |
| P2.19 | Seat count sync (add/remove member → update Stripe quantity) | Backend |
| P2.20 | Storage quota enforcement (write-time check + 90% warning) | Backend |
| P2.21 | Automation run quota enforcement + Redis counter | Backend |
| P2.22 | Upgrade/downgrade flow (proration, immediate vs. end-of-period) | Backend |
| P2.23 | Billing UI: plan page, usage meters, invoice history | Frontend |

---

### Sprint 7 (Weeks 15–16): Billing — PayFast + Plan Enforcement

| ID | Task | Owner |
|----|------|-------|
| P2.24 | PayFast subscription setup (ZAR pricing) | Backend |
| P2.25 | PayFast ITN webhook handler | Backend |
| P2.26 | ZA-specific billing UI (PayFast payment method, ZAR display) | Frontend |
| P2.27 | Downgrade grace period (30-day read-only enforcement) | Backend |
| P2.28 | Trial expiry flow (14-day → free plan) | Backend |
| P2.29 | Add-ons: storage / AI credits / automation / guest seats | Backend |
| P2.30 | Super Admin billing panel (revenue dashboard, manual actions) | Super Admin |

**Phase 2 Exit Gate**:
- [ ] Documents: 2 users editing same doc simultaneously — no conflicts
- [ ] CRM: full deal lifecycle end-to-end
- [ ] Stripe: test payment, webhook, plan activation verified
- [ ] PayFast: ITN simulation tested
- [ ] Storage block at 100% quota — verified 402 response
- [ ] All billing integration tests green
- [ ] No P0 or P1 bugs open

---

## Phase 3 — AI + Automation + Dev Plan (Weeks 17–22)

### Sprint 8 (Weeks 17–18): AI Features

| ID | Task | Owner |
|----|------|-------|
| P3.1 | AI credit metering middleware | AI Backend |
| P3.2 | Task description + subtask generation (Gemini Flash) | AI Backend |
| P3.3 | Document writing assistant (`/ai` command in BlockNote) | AI Backend + Frontend |
| P3.4 | Board summary generation (Gemini Pro) | AI Backend |
| P3.5 | Sprint retrospective generation | AI Backend |
| P3.6 | CRM lead scoring (Claude) | AI Backend |
| P3.7 | CRM email draft generation (Claude) | AI Backend |
| P3.8 | RAG pipeline: ChromaDB per-workspace, indexing job | AI Backend |
| P3.9 | Knowledge base Q&A UI | Frontend |
| P3.10 | AI credit usage display in workspace settings | Frontend |

---

### Sprint 9 (Weeks 19–20): Automation Engine

| ID | Task | Owner |
|----|------|-------|
| P3.11 | Automation trigger evaluation engine (event-driven) | Backend |
| P3.12 | All 22 triggers implemented | Backend |
| P3.13 | All 25 actions implemented | Backend |
| P3.14 | Automation builder UI (visual trigger + condition + action) | Frontend |
| P3.15 | AI automation generation from text description (Claude) | AI Backend + Frontend |
| P3.16 | Automation run log (history, status, error details) | Backend + Frontend |
| P3.17 | Automation quota enforcement | Backend |
| P3.18 | 300+ template library (seeded data) | Backend |

---

### Sprint 10 (Weeks 21–22): Dev Plan + Workload View

| ID | Task | Owner |
|----|------|-------|
| P3.19 | GitHub integration (OAuth, repo link, commit/PR sync) | Backend |
| P3.20 | Sprint management (sprint board, velocity tracking) | Backend + Frontend |
| P3.21 | Workload View (member capacity heatmap) | Frontend |
| P3.22 | Canvas View (Excalidraw embed + board link) | Frontend |
| P3.23 | Time tracking (start/stop timer, manual entry, reports) | Backend + Frontend |
| P3.24 | Dev Plan UI polish (GitHub sync panel, sprint board) | Frontend |

**Phase 3 Exit Gate**:
- [ ] AI: all 7 AI features demo-ready
- [ ] Automation: end-to-end trigger → action fires correctly for 10 common scenarios
- [ ] GitHub: commit linked to item, PR status updates item
- [ ] All 6 views functional (Table, Kanban, Timeline, Calendar, Workload, Canvas)
- [ ] No P0 or P1 bugs open

---

## Phase 4 — Mobile + Polish + Load Test (Weeks 23–28)

### Sprint 11–12 (Weeks 23–26): React Native Mobile

| ID | Task | Owner |
|----|------|-------|
| P4.1 | Auth screens (login, register, MFA) | Mobile |
| P4.2 | Workspace switcher + navigation | Mobile |
| P4.3 | Board list + item list (mobile Table view) | Mobile |
| P4.4 | Item detail: view + edit all field types | Mobile |
| P4.5 | Create item + assign + set due date | Mobile |
| P4.6 | Comments + activity feed | Mobile |
| P4.7 | Notifications + push notification setup (Expo) | Mobile |
| P4.8 | Offline mode: read items + create items (AsyncStorage queue) | Mobile |
| P4.9 | Offline sync on reconnect | Mobile |
| P4.10 | CRM: contact list + deal view (mobile) | Mobile |

---

### Sprint 13 (Weeks 27–28): Performance + Load Test + Polish

| ID | Task | Owner |
|----|------|-------|
| P4.11 | k6 load test: steady state + spike scenarios | DevOps + QA |
| P4.12 | Chaos test: all 7 scenarios (Toxiproxy) | DevOps + QA |
| P4.13 | DB query optimization (EXPLAIN ANALYZE on p95 slow queries) | Backend |
| P4.14 | Frontend bundle optimization (code splitting, lazy loading) | Frontend |
| P4.15 | Accessibility audit (axe-core — 0 critical violations) | QA + Frontend |
| P4.16 | Visual regression baseline (Playwright screenshots) | QA |
| P4.17 | White-label feature implementation (custom domain + branding) | Backend + Frontend |
| P4.18 | Super Admin panel: all sections complete + tested | Backend |
| P4.19 | Full exploratory QA session (2-hour, all features) | QA Lead |
| P4.20 | Closed beta deployment + monitoring | DevOps |

**Phase 4 Exit Gate**:
- [ ] k6 load test: p95 < 500ms, error rate < 1% at 500 concurrent users
- [ ] All chaos scenarios: system recovers within defined SLOs
- [ ] Mobile: iOS + Android beta builds pass App Store / Play Store review
- [ ] Accessibility: 0 critical axe-core violations
- [ ] 0 P0 bugs, < 3 P1 bugs (all triaged with fix date)
- [ ] Closed beta: 10 workspaces invited, feedback collected

---

## Phase 5 — Security + Launch (Weeks 29–32)

### Sprint 14 (Weeks 29–30): Security Hardening

| ID | Task | Owner |
|----|------|-------|
| P5.1 | External penetration test (red team) | External |
| P5.2 | Fix all Critical + High pentest findings | Backend + DevOps |
| P5.3 | Full OWASP Top 10 manual verification | QA + Backend |
| P5.4 | Rate limiting hardening (auth endpoints: 10 req/min) | Backend |
| P5.5 | CSP headers + HSTS + security headers audit | DevOps |
| P5.6 | GDPR/POPIA compliance review: data export, right to erasure | Backend |
| P5.7 | Audit log verification (immutability test) | QA |

---

### Sprint 15 (Weeks 31–32): Launch Readiness

| ID | Task | Owner |
|----|------|-------|
| P5.8 | Marketing site (`flowos.app`) — landing page + pricing page | Frontend |
| P5.9 | Status page (statuspage.io or self-hosted Upptime) | DevOps |
| P5.10 | Help docs / knowledge base (initial articles) | QA Lead |
| P5.11 | Onboarding flow polish (guided setup wizard) | Frontend |
| P5.12 | 300+ template library QA pass | QA |
| P5.13 | Production environment final checklist | DevOps + Tech Lead |
| P5.14 | DNS cutover + CDN setup | DevOps |
| P5.15 | **Public Launch** | All |

**Phase 5 Exit Gate (Launch Gate — all required)**:
- [ ] Red team pentest: 0 Critical, 0 High findings
- [ ] Full CI pipeline green on `main`
- [ ] Load test passed at 500 concurrent + 3000 spike
- [ ] All 100% E2E critical paths passing
- [ ] 0 P0 bugs, 0 P1 bugs
- [ ] GDPR/POPIA compliance sign-off
- [ ] Status page live and monitored
- [ ] Production runbooks written and tested
- [ ] On-call rotation set up (PagerDuty or equivalent)
- [ ] Backup + restore tested (full restore drill performed)

---

## Team Assignments Summary

| Team Member | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|-------------|---------|---------|---------|---------|---------|---------|
| Tech Lead | All infra decisions | Auth + RBAC review | Billing architecture | AI architecture | Load test review | Launch gate sign-off |
| Backend 1 | Laravel scaffold | Boards + RLS | Billing (Stripe) | Automation engine | DB optimization | Security fixes |
| Backend 2 | DB + Redis setup | Auth + realtime bridge | Billing (PayFast) + CRM | GitHub integration | Super Admin | GDPR |
| AI Backend | Python scaffold | — | PDF pipeline | All AI features | — | — |
| Frontend 1 | React scaffold | Table + Kanban views | Document editor | Automation UI | Bundle optimization | Marketing site |
| Frontend 2 | — | Timeline + Calendar | CRM UI + Billing UI | AI UI + Canvas | Accessibility | Onboarding polish |
| Mobile | RN scaffold | — | — | — | Full mobile app | App store submission |
| DevOps | All Docker + CI | Observability | — | — | Load + chaos tests | Production setup |
| QA Lead | Test framework setup | Auth + boards tests | Billing + CRM tests | AI + automation tests | Full exploratory QA | Pentest coordination |

---

*Owner: Tech Lead*  
*Cross-reference: ARCHITECTURE.md, FEATURES.md, QA_STRATEGY.md*
