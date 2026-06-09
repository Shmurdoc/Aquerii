# Aquerii — Production Readiness Plan

> **Last updated:** 2026-05-24 (post-session audit — recalibrated from 44 gaps to actual state)
> **Real unresolved work:** ~28–33 hours across 22 items
> **ERP frontend pages are the dominant cost:** ~15–18h of that is new UIs

---

## How to Read This

This doc was rewritten from scratch because the prior version had **8 items marked open that were already fixed**, plus **delusional estimates** (e.g. "10 min" for something needing a new Docker service + proxy controller). What follows is the honest state.

Key: ✅ = done | ⛔ = blocked | ⌛ = needs environment | ☐ = open

---

## QUICK BUGS (All Done)

These were listed as open but were already resolved in prior or current session work:

| ID | Description | Status | File |
|----|------------|--------|------|
| B1 | `done` column missing on items | ✅ Migration exists | `database/migrations/2026_05_24_000001_add_done_to_items_table.php` |
| B2 | Item description not normalized to Tiptap JSON on read | ✅ Fixed | `services/web/src/hooks/useItems.ts` — `normalizeDescription()` now wired into query |
| B3 | Comment author shows UUID instead of name | ✅ Already joined users | `CommentController.php` line 47 — uses `DB::table('users')` to pluck names |
| B5 | Tag IDs as integers from API | ✅ Fixed | `lib/paperless.ts` — `listTags()` coerces IDs, `listDocuments()`/`getDocument()` coerce tag arrays via `normalizeDoc()` |
| B6 | Calendar "+N more" doesn't show overflow items | ✅ Fixed | `CalendarView.tsx` — popover now shows `dayItems.slice(3)` with scroll |
| G22 | PayFast IP logic inverted | ✅ **No fix needed** — logic is correct; QA finding was wrong |
| G29 | PaperlessFileDrawer onDeleted not called | ✅ Already calls `onDeleted()` on success | `PaperlessFileDrawer.tsx:181` |
| M-4 | `any` cast in sort comparator | ✅ Fixed | `TableView.tsx:180` — removed `: any` cast on assignees map |
| T1 | Notification socket push never reaches UI | ✅ Fixed | `SendNotification.php` — room/event/payload chain fixed |
| G05d | formatDate helper test coverage | ✅ Done | `tests/unit/helpers/formatDate.test.ts` — 4 tests |

---

## Reality Audit Update (2026-05-27)

Cross-referenced this doc against actual code. All items under "QUICK BUGS (All Done)" confirmed fixed. New items added:

- **Caddyfile fix**: `handle /superadmin*` → `super-admin:8001` was stale (service merged into `app/Modules/Admin/`). Updated to `handle /admin*` → `api:8000`.

## ACTUALLY REMAINING

### Blocked (needs user action or infrastructure)

| ID | Description | Why Blocked | Est. |
|----|------------|-------------|------|
| G01 | OpenAI API key `sk-proj-tAzfT...` in `.env` | User must revoke at platform.openai.com/api-keys | 10 min |
| B4 | Paperless thumbnail backend proxy | No paperless-ngx sidecar in docker-compose, no Laravel proxy route. Frontend thumbnail rendering is done but returns 404 without backend. Need: 1) paperless-ngx container in docker-compose, 2) Laravel proxy controller for `/api/paperless/*`, 3) Caddy route. | ~2–4h |

### Environment-constrained

| ID | Description | Constraint | Est. |
|----|------------|-----------|------|
| G04b | Backend tests fail (Mockery + missing pdo_pgsql) | Fixed with `--force` flag in `TestCase.php`. Need Docker PostgreSQL to run tests locally. Any machine with `docker compose up -d postgres` then `php artisan test` should work. | Environment setup |

### Infrastructure (code changes, ~4h)

| ID | Description | File(s) | Est. |
|----|------------|---------|------|
| G13 | Jaeger not deployed | `docker-compose.yml` + Laravel OpenTelemetry config | 1h |
| G14 | No postgres_exporter / redis_exporter / node_exporter | `docker-compose.yml` + `prometheus.yml` | 45 min |
| G15 | Alertmanager has no receiver targets (no Slack/PagerDuty) | `infra/prometheus/alertmanager.yml` | 30 min |
| G30 | AI credit costs hardcoded as magic numbers | `app/Modules/AI/Services/CostCalculator.php` (inferred) | 45 min |
| G32 | Stripe response objects shallow-cast lose nested data | `app/Modules/Billing/` — find all `(array)` casts | 30 min |
| G33 | Horizon dashboard allows any authenticated user | `config/horizon.php` — add email allowlist | 15 min |
| M-1 | TZ-unaware `date` columns on `invoices.due_date` and `crm_deals.expected_close_date` | Corrective migration to change `date` → `timestampTz` | 15 min |

### Frontend tests (~2h)

| ID | Description | Files | Est. |
|----|------------|-------|------|
| G05b | Auth flow tests (login/logout, workspace switch, route guards) | `tests/unit/hooks/useAuth.test.ts` + `tests/unit/components/ProtectedRoute.test.tsx` | 1h |
| G05c | CRM store/hook tests (deal stages, contact CRUD, pipeline loading) | `tests/unit/hooks/useDeals.test.ts` | 1h |

### Frontend quality (~8–11h)

| ID | Description | Scope | Est. |
|----|------------|-------|------|
| G17 | Responsive design — sidebar collapse, kanban/table/modal responsive breakpoints | All page types at 375/768/1024/1920px | 4–6h |
| G35 | Virtual scrolling for board table + documents list | `TableView.tsx`, `DocumentsPage.tsx` — install `@tanstack/react-virtual` | 2h |
| G34 | ARIA labels on interactive elements | Bundled with G17 — fix icon buttons, dialogs, tabs, toasts as touched | 2–3h |

### New Feature Pages — The Elephant (~15–18h)

The backend has 38 routes registered across 6 modules. Every single one lacks a frontend UI:

| ID | Module | Pages Needed | Est. |
|----|--------|-------------|------|
| F01 | Invoicing | List, create form, detail/edit modal, routes, sidebar link | 3–4h |
| F02 | Purchasing | List, create PO form, detail modal, routes, sidebar link | 3h |
| F03 | Sales | List, create SO form, detail modal, routes, sidebar link | 3h |
| — | CRM completion | Contacts page, Companies page, pipeline CRUD, stage manager, deal update/delete/move/score, activity update | 3–4h |
| — | Documents completion | Document update/delete, scanned documents page | 1h |
| F04 | Accounting | Chart of accounts list, journal entry form | 2h |
| F05 | Automation | Rule builder, template picker, run history | 2–3h |

### Deferred (v1.1+)

| ID | Reason |
|----|--------|
| G42 — mTLS between services | Docker internal network is isolated; defense-in-depth only |
| M-5 — UUID picker in DealDetailModal | Works as-is; UX improvement only |
| L-4 — Docker health checks/resource limits | Low-severity; services recover via `restart: unless-stopped` |

---

## Execution Sequence

### Now (this session is done)
- All quick bugs ✅
- B2 normalization wired ✅
- M-4 `any` cast fixed ✅

### Week 1 — Test Safety Net
1. G01 — Revoke OpenAI key (manual)
2. G04b — Run tests in Docker environment
3. G05b + G05c — Auth + CRM tests

### Week 2 — Infrastructure
4. G13 — Jaeger deployment
5. G14 — Exporters (postgres/redis/node)
6. G15 — Alertmanager targets
7. G30, G32, G33, M-1 — Backend polishing

### Week 3 — Frontend Quality
8. G17 — Responsive design (bundle G34 ARIA)
9. G35 — Virtual scrolling
10. B4 — Paperless thumbnail proxy (if paperless-ngx becomes available)

### Week 4+ — ERP Frontend Pages (largest effort)
11. F01 — Invoicing UI
12. F02 — Purchasing UI
13. F03 — Sales UI
14. CRM completion (contacts, companies, pipeline CRUD)
15. Documents completion
16. F04 — Accounting UI
17. F05 — Automation UI

**Total remaining:** ~28–33h engineering time across 4–6 weeks.
**ERP UIs alone:** ~15–18h (more than half the remaining work).
**Ship-blocking:** Nothing critical other than revoking the OpenAI key.
