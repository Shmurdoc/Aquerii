# Test Run Report — TEST-RUN-001

**Date:** 2026-06-06
**Branch:** `feat/crm-phases-3-to-8`
**Project root:** `C:\Users\madoc\source\repos\Aquerii`
**Mode:** Report-only (no fixes applied, no source/test/config modified)

---

## 1. PHP Backend — Pest / PHPUnit

**Command attempted:**
```
docker exec aquerii-api-1 php artisan test --parallel
```
Then:
```
docker exec aquerii-api-1 php artisan test
```
Then (per-process):
```
docker exec aquerii-api-1 ./vendor/bin/pest tests/Unit/Rules/PasswordStrengthTest.php
```

| Metric | Value |
| --- | --- |
| Pass count | 0 |
| Fail count | 0 |
| Skip count | 0 |
| Run count | 0 |
| Time elapsed | n/a (never reached test execution) |
| Status | **BLOCKED — tests could not run** |

### Root cause (two layered infrastructure blockers)

**(a) Container OOM (signal 9, exit 137) on every test invocation.**
`docker-compose.yml` pins the `api` service to `memory: 512M` (line 108). `php artisan test --parallel` was OOM-killed immediately. Bumping the live cgroup via `docker update --memory 4g --memory-swap 4g` was overridden by the compose-defined hard limit; subsequent single-process and `--filter` runs were still OOM-killed or timed out silently.

**(b) Stale PostgreSQL trigger blocks `migrate:fresh` on the test database.**
Even when invoked directly with `php artisan migrate:fresh --database=pgsql --force`, the test DB refuses to migrate:
```
SQLSTATE[42710]: Duplicate object: 7
ERROR: trigger "trg_realtime_events_sequence" for relation "realtime_events" already exists
at database/migrations/2026_06_04_000002_create_realtime_events_sequence_trigger.php:10
```
The test database `aquerii_test` retains a Postgres trigger and its backing function from a prior run. `migrate:fresh` drops tables but does not drop the orphaned trigger/function, so the next migration re-creating the trigger collides.

`tests/TestCase.php` applies `RefreshDatabase` to every Pest test (both `Feature` and `Unit` directories via `tests/Pest.php`), so every test bootstraps with `migrate:fresh` and hangs/OOMs on the same trigger collision. The blocker is environment-only — no application code reached.

### Failures
None (0 tests executed). Reporting the infrastructure blockers in place of failures.

### 1-line reason guess
Test infrastructure (container 512M cap + stale `trg_realtime_events_sequence` trigger in `aquerii_test`) prevents PHP test execution — not a regression in the test code or product code.

---

## 2. TypeScript / React Unit Tests — Vitest

**Command attempted (in order):**
```
npm run test:run   # missing script
npx vitest run
```

`npm run test:run` is not defined in `services/web/package.json` (available scripts: `test`, `test:e2e`, `build`, `typecheck`, `lint`, `dev`, `preview`, `audit:local`). Fell back to `npx vitest run`, which is the script the missing alias maps to.

| Metric | Value |
| --- | --- |
| Test files passed | 19 |
| Test files failed | 1 |
| **Tests passed** | **111** |
| **Tests failed** | **4** |
| Tests skipped | 0 |
| **Total tests** | **115** |
| Pass rate | 96.5% |
| Time elapsed | 272.91s (4m 33s) |

### Failures — all in `tests/unit/helpers/formatCurrency.test.ts`

| # | Test name | First lines of failure | 1-line guess |
| --- | --- | --- | --- |
| 1 | `formatCurrency > returns $0.00 for NaN input` | `AssertionError: expected 'R0.00' to be '$0.00'`<br>`5|  expect(formatCurrency(NaN)).toBe('$0.00')` | `formatCurrency` uses host locale (ZAR) — test expects hard-coded USD `$0.00`; environment is en-ZA so `Intl.NumberFormat` emits `R0.00`/`R 0,00` |
| 2 | `formatCurrency > formats positive numbers correctly` | `AssertionError: expected 'R 0,00' to be '$0.00'`<br>`11| expect(formatCurrency(0)).toBe('$0.00')` | Same locale mismatch — comma decimal separator and Rand currency symbol from ZAR locale |
| 3 | `formatCurrency > formats negative numbers correctly` | `AssertionError: expected '-R 1,00' to be '-$1.00'`<br>`18| expect(formatCurrency(-1)).toBe('-$1.00')` | Same locale mismatch — negative-formatting style differs (ZAR `‑R 1,00` vs USD `-$1.00`) |
| 4 | `formatCurrency > handles string input` | `AssertionError: expected 'R 42,00' to be '$42.00'`<br>`24| expect(formatCurrency('42')).toBe('$42.00')` | Same locale mismatch — same helper, same ZAR output |

**Common guess:** the helper delegates to `Intl.NumberFormat` using the runtime/host default locale (en-ZA on the test machine), but the test suite was authored for en-US. Either the helper needs an explicit `en-US`/`USD` locale arg, or the tests need a locale-aware assertion.

---

## 3. Playwright E2E

**Command attempted (chromium-only, full suite):**
```
npx playwright test --project=chromium --reporter=list
```

Note: default config runs two projects (`chromium` and `firefox`) with `retries: 1`. To keep the run tractable, this report is chromium-only with the framework's built-in 1 retry. With firefox included the run would ~2× the failures and wall time.

| Metric | Value |
| --- | --- |
| Tests passed | 9 |
| Tests failed | 40 |
| Tests skipped | 0 |
| Total tests | 49 |
| Pass rate | 18.4% |
| Time elapsed | 41.2m |

### Failure pattern — single dominant cause

All 40 failures share the same stack: `loginPage.login('test@example.com', 'password123')` succeeds in submitting the form, but `page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })` times out — the page never leaves `/login`. Logged navigation: `navigated to "https://localhost/login"`.

Representative failure (occurs 40× across `app.spec.ts`, `auth.spec.ts`, `boards.spec.ts`, `calendar.spec.ts`, `crm.spec.ts`, `documents.spec.ts`, `file-upload.spec.ts`):

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "https://localhost/login"
============================================================

  6 |   test.beforeEach(async ({ page, loginPage }) => {
  7 |     await loginPage.login('test@example.com', 'password123')
> 8 |     await page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })
    |                ^
  9 |   })
```

### Failure list (40 tests)

`app.spec.ts` (10): logs in with valid credentials, shows role selection for user with existing workspace, displays boards page, can create a new board, opens board and shows kanban view, can switch to table view, can switch to calendar view, navigates between pages via sidebar, displays documents page, can create a new document, displays pipeline view.

`auth.spec.ts` (3): logs in with valid credentials, shows role selection onboarding for user with existing workspace, completes full registration.

`boards.spec.ts` (10): displays boards page with heading, can create a new board, opens board and shows kanban view, can create a group in a board, can add an item to a group, shows item detail modal when clicking an item, can switch between board views, navigates between modules via sidebar, board cards are displayed.

`calendar.spec.ts` (1): calendar page fires useCalendarItems query against /calendar-items endpoint.

`crm.spec.ts` (7): displays pipeline view with stage headers, shows deal cards in pipeline, can open deal detail modal, add deal button is visible, create deal flow, contact CRUD — create contact, display CRM sidebar navigation.

`documents.spec.ts` (5): displays documents page with heading, shows notes and files tabs, can create a new document, document title is editable, document content editor is present, switches between notes and files tabs.

`file-upload.spec.ts` (4): avatar upload button is visible in settings profile, documents page has file upload tab, scanned documents upload button is accessible, file input accepts document types.

### 1-line guess (all 40)
Login (`test@example.com` / `password123`) is rejected by the running API (or no API is reachable at `https://localhost/api/...`) so the form does not redirect, and every authenticated test fails at the `beforeEach` login step.

The 9 tests that pass are exactly the unauthenticated ones: `redirects unauthenticated user to login`, `shows validation errors on empty login submit`, `navigates to register page from login`, `registration form requires all fields`, `multi-factor auth input appears when required`, `shows error on invalid credentials` (×2 due to retry), `completes full registration` (passes on retry), and the registration `beforeEach` group. This pattern (every authed flow dies at the same login wall) strongly suggests a seed/test-user problem rather than 40 independent regressions.

---

## 4. Route Audit

**Command:**
```
node team/scripts/audit-endpoints.mjs
```

| Metric | Value |
| --- | --- |
| Total routes | 600 |
| Used routes (have frontend consumer) | 600 |
| Unused routes | 0 |
| Exit code | 0 |
| Status | **PASS** |

```
=== Unused Routes by Source File ===

✓ All routes have frontend UI consumers.
```

---

## 5. Build Check

### 5a. Web — `npm run build`

| Metric | Value |
| --- | --- |
| Command | `npm run build` (in `services/web`) |
| Result | **SUCCESS** — `✓ built in 3m 25s`, exit 0 |
| Warnings | Vite reports 4 chunks > 500 kB after minification (`subset-shared.chunk` 1.82 MB, `index` 1.22 MB, `percentages` 1.13 MB, `editor` 1.12 MB). Build succeeds despite warnings. |
| Notes | Largest gzipped chunk is `subset-shared.chunk` at 736.93 kB. Code-splitting / `manualChunks` recommended but not required for build success. |

### 5b. API — `composer install --no-interaction`

| Metric | Value |
| --- | --- |
| Command | `composer install --no-interaction` (in `services/api`) |
| Result | **FAIL** — exit 2 |
| Reason | Local PHP (herd-lite, Windows host) is missing three required extensions: `ext-pcntl` (laravel/horizon v5.47.0), `ext-sodium` (lcobucci/jwt 5.6.0), `ext-intl` (filament/support v3.3.52). The `composer.json` lockfile requires them; the host's `php.ini` does not enable them. |
| Impact on test verdict | None for the in-docker test run (the API container ships its own PHP with the extensions). This blocks local dependency installation only. |

---

## Summary

| Suite | Pass | Fail | Skip | Total | Pass % | Time | Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| PHP backend (Pest) | 0 | 0 | 0 | 0 | n/a | n/a | **BLOCKED** (env) |
| Vitest (unit) | 111 | 4 | 0 | 115 | 96.5% | 4m 33s | partial (1 file failing) |
| Playwright E2E (chromium) | 9 | 40 | 0 | 49 | 18.4% | 41m 11s | **failing** |
| Route audit | — | — | — | 600/600 | 100% | <1s | **PASS** |
| Web build | — | — | — | — | — | 3m 25s | **PASS** |
| API composer install | — | — | — | — | — | <1s | **FAIL** (local env) |

---

## Overall verdict: **NOT-SHIP-READY**

Ship-readiness requires ALL of the following to hold. They do not.

| Criterion | Required | Actual | Met? |
| --- | --- | --- | --- |
| Build passes (web + api) | yes | web ✅, api ❌ (local composer install) | **NO** |
| Route audit 600/600 | yes | 600/600 ✅ | YES |
| E2E ≥ 95% pass | yes | 18.4% (9/49) | **NO** |
| Backend tests ≥ 95% pass | yes | 0% — suite blocked by env, never executed | **NO** |
| Frontend unit tests ≥ 95% pass | yes | 96.5% (111/115) | YES (borderline) |

**Headline blockers, in priority order:**

1. **E2E — 40/49 fail at the login wall.** Every authenticated test times out at `page.waitForURL(/onboarding|boards/)` after submitting the test credentials. Pass rate is 18.4% (target ≥95%). Highest-priority fix: verify the running API accepts `test@example.com` / `password123`, or reseed the test user. (This is a *guess* based on the single-failure-pattern; an investigation is needed before any code change.)
2. **PHP suite is environmentally blocked.** The 512 MB memory cap on the `api` container (set in `docker-compose.yml`) plus a stale `trg_realtime_events_sequence` trigger in the `aquerii_test` Postgres database prevents any PHP test from completing `migrate:fresh`. Either is fixable on its own; both need addressing before the backend suite can be re-run. Frontend unit failures and API composer install are smaller issues.

**Smaller issues (do not by themselves block ship, but should be tracked):**

- Vitest `formatCurrency.test.ts` — 4/115 tests fail because the helper renders in the host locale (ZAR) and the tests assert USD. Decide whether the helper should be locale-pinned to en-US/USD or the tests should be made locale-agnostic.
- Web build emits 4 chunks > 500 kB. Not a build failure, but a perf/bundle-size concern.
- Local API `composer install` fails (missing `ext-pcntl`, `ext-sodium`, `ext-intl` in herd-lite PHP). Doesn't affect docker-based test runs, but blocks local backend development on Windows.

---

## Artefacts (kept in working tree, not committed)

Raw outputs captured during this run are saved in `team/audits/` for reference:

- `test-output-php.log` — PHP/Pest attempt (output captured but process OOM-killed before any test executed)
- `test-output-vitest.log` — Vitest full output
- `test-output-e2e.log` — Playwright full output (chromium project)
- `audit-route.log` — Route audit script output
- `test-output-build-web.log` — `npm run build` output
- `test-output-build-api.log` — `composer install` output
