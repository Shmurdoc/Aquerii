# Aquerii — Polish Execution Plan

> **Baseline:** TSC clean · 15 tests passing · Backend Pint: 130 files need auto-formatting  
> **Date:** 2026-05-24

---

## Execution Order (Highest Impact First)

### Phase 1 — Auto-fix All Backend Code Style (2 min)
- Run `vendor/bin/pint` to auto-format all 130 files
- Zero risk — Pint only changes whitespace/import ordering

### Phase 2 — Quick Backend Fixes  

| Item | What | File(s) | Est. |
|------|------|---------|------|
| G33 | Horizon auth allowlist — restrict queue dashboard to configurable emails | `config/horizon.php` + `app/Core/Providers/HorizonServiceProvider.php` | 15 min |
| M-1 | Fix TZ-unaware `date` columns — change `invoices.due_date` and `crm_deals.expected_close_date` to `timestampTz` | New migration | 15 min |
| G30 | Move hardcoded AI credit costs to config | `config/ai.php` + AI controllers | 45 min |
| G32 | Fix Stripe shallow-cast — use `json_decode(json_encode(...), true)` for deep conversion | Billing controllers | 30 min |

### Phase 3 — Frontend Quality  

| Item | What | File(s) | Est. |
|------|------|---------|------|
| G35 | Virtual scrolling for board table view | `TableView.tsx` — wrap rows in `<Virtualizer>` | 2h |
| G05b | Auth flow tests (login/logout, route guards) | `tests/unit/hooks/useAuth.test.ts` + `tests/unit/components/ProtectedRoute.test.tsx` | 1h |
| G05c | CRM store tests (deals, contacts, pipelines) | `tests/unit/hooks/useDeals.test.ts` | 1h |

---

## Verification
- After each phase: `npx tsc --noEmit` + `npx vitest run`
- Backend: `vendor/bin/pint --test` (or docker compose exec)
