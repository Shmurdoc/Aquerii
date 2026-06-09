# Test Audit Report

**Audited by**: member-04 (QA / Integration Agent)
**Date**: 2026-06-04
**Status**: Complete

---

## 1. Total Tests Found

| Layer | Files | Test Methods | Status |
|-------|-------|-------------|--------|
| PHP API (Feature) | 32 | 290 | Pest/Unit |
| PHP API (Unit) | 3 | included above | Pest/Unit |
| Web Frontend (unit) | 19 | 54 | Vitest |
| Realtime WS | 1 | 3 | Vitest |
| Python AI | 1 | unknown | pytest (CI) |
| K6 Load (performance) | 4 | n/a | k6 |
| Playwright E2E | 1 spec + 7 page objects | **ALL SKIPPED** | Playwright |
| **Total** | **61** | **~347** | |

*Note: PHP test count derived from `function|it(|test(` grep — actual count may include test helpers.*

---

## 2. Per-Module Coverage

### PHP API — Feature Tests (32 files, ~250 tests)

| Module | Files | Key Tests |
|--------|-------|-----------|
| Auth | 3 | Login, Register, AuthHardening |
| Boards | 1 | Board CRUD |
| Items | 1 | Item CRUD |
| CRM | 1 | CrmCore |
| Workspace | 1 | Invite |
| Chat | 1 | ChatFeature |
| AI | 2 | AiController, AICredit |
| HSSE | 6 | Incident, Hazard, Reporting, Audit, CorrectiveAction, Dashboard |
| HR | 2 | HR, Shift |
| Accounting | 1 | Accounting |
| Equipment | 1 | Equipment |
| Competency | 1 | Competency |
| Delegation | 1 | Delegation |
| JobCards | 1 | JobCard |
| PTW | 3 | Permit, DmrRegister, Workflow |
| Security | 3 | SCIM, Readiness, RealWorld |
| Templates | 1 | Template |
| Health | 1 | Health |

### PHP API — Unit Tests (3 files, ~40 tests)

| Module | File | Tests |
|--------|------|-------|
| Security | IdempotencyTest | idempotency checks |
| Scenario | ScenarioSimulationTest | simulation |
| Rules | PasswordStrengthTest | password rules |

### Web Frontend — Unit Tests (19 files, ~54 tests)

| Module | Files | Coverage |
|--------|-------|----------|
| Auth unit | 4 | apiInterceptor, authStore, LoginPage, routeGuards |
| CRM unit | 2 | contacts, deals |
| Helpers | 2 | formatDate, formatCurrency |
| Hooks | 1 | useSalesOrders |
| UI components | 7 | Button, Card, Input, Modal, Toggle, Badge, DataTable |
| AI components | 3 | ChatInput, ChatThread, SuggestedPrompts |

### Web Frontend — E2E (1 spec + 7 page objects, ALL SKIPPED)

| Page Object | Purpose |
|-------------|---------|
| LoginPage | Sign-in form + MFA |
| BoardsPage | Board list + create |
| BoardPage | Kanban/Table/Calendar views |
| CRMPage | Pipeline view |
| DocumentsPage | Note/file tabs |
| DocumentPage | Title + editor |
| NavigationPage | Sidebar nav |

### Realtime (1 file, 3 tests)

Placeholder tests at `services/realtime/src/index.test.ts`.

---

## 3. Test Gaps

### Critical Gaps

1. **No E2E critical path tests running** — all 10 Playwright specs are `test.describe.skip()` due to unauthenticated-redirect guard missing in SPA and E2ESeeder not wiring in production mode.
2. **No registration → onboarding → workspace creation E2E test**.
3. **No board group creation / item assignment E2E test**.
4. **No CRM contact CRUD / deal creation E2E test**.
5. **No document content editing E2E test**.

### High Gaps

6. **No integration tests for OAuth flow** (login via Google/GitHub).
7. **No WebSocket/presence connection tests**.
8. **No AI prompt integration tests** (end-to-end).
9. **No offline queue / mutation replay tests**.
10. **No rate-limiting enforcement test**.

### Medium Gaps

11. **No performance regression thresholds in CI** (k6 tests use `continue-on-error: true`).
12. **No notification preferences persistence test**.
13. **No file upload test**.
14. **No multi-workspace switching test**.
15. **No drag-and-drop deal stage change test**.

### Low Gaps

16. **No keyboard shortcut / CommandPalette E2E test**.
17. **No responsive / mobile viewport test**.
18. **No whiteboard view E2E test**.
19. **No settings/profile update E2E test**.
20. **No mermaid diagram rendering test**.

---

## 4. Test Infrastructure Status

| Component | Status | Details |
|-----------|--------|---------|
| PHPUnit/Pest | Ready | 32 Feature + 3 Unit files, requires PostgreSQL+Redis |
| Vitest (web) | Ready | 19 test files, jsdom environment |
| Vitest (realtime) | Ready | 1 test file |
| pytest (AI) | Ready | Runs in CI only |
| Playwright | Installed (v1.59.1) | Config at `services/web/playwright.config.ts`, browsers not installed locally |
| k6 | Scripts ready | smoke, load, stress tests in `services/tests/load/` |
| CI E2E job | Present | Stage 6 in `.github/workflows/ci.yml` — runs but **0 tests execute** (all skipped) |

---

## 5. Recommendations

1. **Unskip E2E tests** — Requires SPA unauthenticated-redirect guard + E2ESeeder wiring in production mode.
2. **Install Playwright browsers locally** — `npx playwright install chromium` for local dev.
3. **Add vitest config file** — currently embedded in `vite.config.ts`.
4. **Add integration tests** for OAuth, WebSocket, and AI flows.
5. **Add k6 pass/fail thresholds** — currently `continue-on-error: true` masks regressions.
