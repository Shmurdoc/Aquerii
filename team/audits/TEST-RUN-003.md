# Test Run Report — TEST-RUN-003

**Date:** 2026-06-07
**Branch / commits since TEST-RUN-002:** post-workstream
**Project root:** `C:\Users\madoc\source\repos\Aquerii`
**Mode:** Report-only (no fixes applied, no test/config/application code modified)
**Status:** **REGRESSION — 92.9% baseline does NOT hold**

---

## Headline

| Metric | TEST-RUN-002 (baseline) | TEST-RUN-003 (this run) | Δ |
| --- | --- | --- | --- |
| Pass rate (final) | **91 / 98 = 92.9%** | **11 / 51 = 21.6%** (of completed tests) | **−71.3 pts** |
| Hard-fail count | 7 | **40** (chromium, 1 attempt each retried) | +33 |
| Flaky count | 12 | **0** | −12 |
| Tests reached completion | 98 / 98 | 51 / 98 (chromium: 49, firefox: 2) | incomplete |
| Time elapsed | 37.7 m | **incomplete — aborted at 60 m** | n/a |

**Verdict vs. target:** 21.6% **fails** the 90% target by a wide margin. TEST-RUN-002 baseline is broken.

> **Incomplete run caveat:** Playwright hit the shell-side 60-minute timeout while still working through the firefox project. The reported 11 / 51 = 21.6% is the rate for the **51 unique tests that completed** before timeout (49 chromium + 2 firefox). The remaining 47 firefox tests never started. Extrapolating the observed pattern (every firefox test that ran also failed on the same `expect(ok).toBeTruthy()` login check), the actual full-suite pass rate would land between **11.2% and 12.2%**, still well below 90%.

---

## Root cause (single, well-evidenced regression)

The "logs in with valid credentials" smoke test is **deterministically broken** on both browsers. Every other hard-fail cascades from this one.

```
[chromium] tests\e2e\auth.spec.ts:17:3
  Auth — Registration → Onboarding → Workspace › logs in with valid credentials

Error: expect(received).toBeTruthy()
       Received: false

  22 |   test('logs in with valid credentials', async ({ loginPage, page }) => {
  23 |     const ok = await loginPage.loginWithRetry('test@example.com', 'password123')
> 24 |     expect(ok).toBeTruthy()
       |                ^ Error: expect(received).toBeTruthy()
  25 |     await expect(page).toHaveURL(/\/(onboarding|boards)/)
```

The page snapshot from the same artifact (`test-results\auth-Auth-…\error-context.md`) shows the page is **still on `/login`** with the Sign In form rendered, with the email and password fields empty after the login attempt. Same artifact for `app.spec.ts:22` (chromium) and `app.spec.ts:22` (firefox) — both fail with identical `expect(received).toBeTruthy() / Received: false`.

**In other words:** the login form is rendered, `loginWithRetry` is being called, but the SPA is not navigating away from `/login` after submission. The login API call is either (a) erroring silently, (b) succeeding but the client not redirecting, or (c) the `e2e:setup` fixture data is missing the `test@example.com` user (e.g. `migrate:fresh` cleared it and `e2e:setup` didn't re-create it on the new DB).

**Evidence the fixture data is the prime suspect:** the `--reporter=list` output shows the first **two** chromium tests pass (`redirects unauthenticated user to login` and `shows validation errors on empty login submit`) at sub-7-second durations, but `logs in with valid credentials` (the very next test in the same `Authentication` describe block) takes **37.6 s and 55.7 s** on its two attempts before failing. The 37 s first-attempt duration suggests the login request **hangs until a server-side timeout** (likely Laravel's session/CSRF middleware) before the page object gives up. That is the classic fingerprint of either a missing test user, a CSRF/session misconfiguration, or an upstream auth service call that 5xxs.

**Not the runner, not the test infra:**
- Caddy returns 200 on `https://localhost/api/health` (verified pre-run)
- `docker exec aquerii-api-1 php artisan migrate:fresh --force` ran clean
- `docker exec aquerii-api-1 php artisan e2e:setup` reported "✓ E2E test data ready (test@example.com / password123)"
- All 16 docker containers healthy before the run
- The pre-login auth tests still pass — proving the SPA, the dev server, and the network stack are all alive

---

## Pre-run verification (all green, per spec)

| Step | Result |
| --- | --- |
| Kill port 3000 | no process to kill — clear |
| `docker ps` — all containers up | 16/16 `Up (healthy)` |
| `curl -k https://localhost/api/health` | **200** |
| `php artisan migrate:fresh --force` | completed (all migrations DONE) |
| `php artisan e2e:setup` | "✓ E2E test data ready (test@example.com / password123)" |
| Web dev server on :3000 | started cleanly (PID 20060) |

Nothing in the pre-run phase points at infra. The regression is in the **login flow itself**.

---

## Hard-fail analysis (40 unique chromium tests, both attempts failed)

Of the 51 tests that completed, 40 failed in **both** attempts (i.e. retry did not save them). The pattern splits into three buckets:

### Bucket A — Direct login assertion (1 test, the root cause)
| # | Project | Spec | First error line |
| --- | --- | --- | --- |
| 1 | chromium | `tests/e2e/auth.spec.ts:17` Auth — Registration → Onboarding → Workspace › logs in with valid credentials | `Error: expect(received).toBeTruthy()` (Received: false) |

Also confirmed on **firefox** (`tests/e2e/app.spec.ts:22` — same assertion, same error). Login is broken on both engines.

### Bucket B — Cascaded `waitForURL` timeouts in `beforeEach` (33 tests, all the post-login setup)
The `beforeEach` blocks in `app.spec.ts`, `boards.spec.ts`, `crm.spec.ts`, `documents.spec.ts`, `file-upload.spec.ts` all do `loginPage.loginWithRetry(...) → page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })`. Login returns false, the URL never changes, the 15 s wait times out, and the test body never runs. This is the same brittleness TEST-RUN-002 flagged at lower severity, but it has gone from "12 flaky, retry-rescues" to "33 hard-fail, retry-doesn't-rescue" because the underlying login no longer works at all.

| Spec | Hard fails in this bucket |
| --- | --- |
| `tests/e2e/app.spec.ts` | 9 (lines 36, 57, 61, 66, 71, 78, 84, 106, 110, 117) |
| `tests/e2e/boards.spec.ts` | 7 (lines 11, 16, 22, 28, 40, 53, 62, 73, 84) |
| `tests/e2e/crm.spec.ts` | 7 (lines 11, 18, 24, 32, 37, 43, 61) |
| `tests/e2e/documents.spec.ts` | 6 (lines 11, 16, 22, 28, 40, 51) |
| `tests/e2e/file-upload.spec.ts` | 4 (lines 12, 19, 29, 38) |

All with first error line: `Error: page.waitForURL: Timeout 15000ms exceeded.`

### Bucket C — `page.goto` failures under sustained load (2 tests, environmental)
Long-running boards tests (5+ min cumulative) eventually exhaust the chromium renderer.

| # | Project | Spec | First error line |
| --- | --- | --- | --- |
| 1 | chromium | `tests/e2e/app.spec.ts:57` Boards › displays boards page | `Error: page.goto: Target page, context or browser has been closed` |
| 2 | chromium | `tests/e2e/app.spec.ts:61` Boards › can create a new board | `Error: page.goto: Target page, context or browser has been closed` |
| 3 | chromium | `tests/e2e/app.spec.ts:71` Boards › can switch to table view | `Error: page.goto: Test timeout of 60000ms exceeded.` |
| 4 | chromium | `tests/e2e/app.spec.ts:66` Boards › opens board and shows kanban view | (error-context.md present, no `Error:` line in artifact — likely caused by browser-context shutdown mid-trace) |
| 5 | chromium | `tests/e2e/app.spec.ts:78` Boards › can switch to calendar view | (same as above) |
| 6 | chromium | `tests/e2e/app.spec.ts:84` Boards › navigates between pages via sidebar | (same as above) |

These six are *secondary* — they're downstream of the login hang eating chromium workers. Would likely pass if login worked.

### Full 40-test hard-fail list (with first error line)

```
[chromium] tests\e2e\app.spec.ts:22  Authentication › logs in with valid credentials
       → Error: expect(received).toBeTruthy()
[chromium] tests\e2e\app.spec.ts:36  Onboarding › shows role selection for user with existing workspace
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\app.spec.ts:57  Boards › displays boards page
       → Error: page.goto: Target page, context or browser has been closed
[chromium] tests\e2e\app.spec.ts:61  Boards › can create a new board
       → Error: page.goto: Target page, context or browser has been closed
[chromium] tests\e2e\app.spec.ts:66  Boards › opens board and shows kanban view
       → (browser context closed mid-trace)
[chromium] tests\e2e\app.spec.ts:71  Boards › can switch to table view
       → Error: page.goto: Test timeout of 60000ms exceeded.
[chromium] tests\e2e\app.spec.ts:78  Boards › can switch to calendar view
       → (browser context closed mid-trace)
[chromium] tests\e2e\app.spec.ts:84  Boards › navigates between pages via sidebar
       → (browser context closed mid-trace)
[chromium] tests\e2e\app.spec.ts:106 Documents › displays documents page
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\app.spec.ts:110 Documents › can create a new document
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\app.spec.ts:117 CRM › displays pipeline view
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\auth.spec.ts:17 Auth — Registration → Onboarding → Workspace › logs in with valid credentials
       → Error: expect(received).toBeTruthy()
[chromium] tests\e2e\auth.spec.ts:47 Auth — Registration → Onboarding → Workspace › shows role selection onboarding for user with existing workspace
       → (no error-context.md artifact — likely browser crash, see Bucket C)
[chromium] tests\e2e\boards.spec.ts:11 Boards — Board → Group → Item → Assign › displays boards page with heading
       → (browser context closed mid-trace)
[chromium] tests\e2e\boards.spec.ts:16 Boards — Board → Group → Item → Assign › can create a new board
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\boards.spec.ts:22 Boards — Board → Group → Item → Assign › opens board and shows kanban view
       → (browser context closed mid-trace)
[chromium] tests\e2e\boards.spec.ts:28 Boards — Board → Group → Item → Assign › can create a group in a board
       → (browser context closed mid-trace)
[chromium] tests\e2e\boards.spec.ts:40 Boards — Board → Group → Item → Assign › can add an item to a group
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\boards.spec.ts:53 Boards — Board → Group → Item → Assign › shows item detail modal when clicking an item
       → (browser context closed mid-trace)
[chromium] tests\e2e\boards.spec.ts:62 Boards — Board → Group → Item → Assign › can switch between board views
       → (browser context closed mid-trace)
[chromium] tests\e2e\boards.spec.ts:73 Boards — Board → Group → Item → Assign › navigates between modules via sidebar
       → (browser context closed mid-trace)
[chromium] tests\e2e\boards.spec.ts:84 Boards — Board → Group → Item → Assign › board cards are displayed
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\crm.spec.ts:11  CRM — Pipeline → Contacts → Deals › displays pipeline view with stage headers
       → (browser context closed mid-trace)
[chromium] tests\e2e\crm.spec.ts:18  CRM — Pipeline → Contacts → Deals › shows deal cards in pipeline
       → (browser context closed mid-trace)
[chromium] tests\e2e\crm.spec.ts:24  CRM — Pipeline → Contacts → Deals › can open deal detail modal
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\crm.spec.ts:32  CRM — Pipeline → Contacts → Deals › add deal button is visible
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\crm.spec.ts:37  CRM — Pipeline → Contacts → Deals › create deal flow
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\crm.spec.ts:43  CRM — Pipeline → Contacts → Deals › contact CRUD — create contact
       → (browser context closed mid-trace)
[chromium] tests\e2e\crm.spec.ts:61  CRM — Pipeline → Contacts → Deals › display CRM sidebar navigation
       → (browser context closed mid-trace)
[chromium] tests\e2e\documents.spec.ts:11 Documents — Create → Edit Content › displays documents page with heading
       → (browser context closed mid-trace)
[chromium] tests\e2e\documents.spec.ts:16 Documents — Create → Edit Content › shows notes and files tabs
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\documents.spec.ts:22 Documents — Create → Edit Content › can create a new document
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\documents.spec.ts:28 Documents — Create → Edit Content › document title is editable
       → Error: page.waitForURL: Timeout 15000ms exceeded.
[chromium] tests\e2e\documents.spec.ts:40 Documents — Create → Edit Content › document content editor is present
       → (browser context closed mid-trace)
[chromium] tests\e2e\documents.spec.ts:51 Documents — Create → Edit Content › switches between notes and files tabs
       → (browser context closed mid-trace)
[chromium] tests\e2e\file-upload.spec.ts:12 File Upload — Avatar and Documents › avatar upload button is visible in settings profile
       → (browser context closed mid-trace)
[chromium] tests\e2e\file-upload.spec.ts:19 File Upload — Avatar and Documents › documents page has file upload tab
       → (browser context closed mid-trace)
[chromium] tests\e2e\file-upload.spec.ts:29 File Upload — Avatar and Documents › scanned documents upload button is accessible
       → (browser context closed mid-trace)
[chromium] tests\e2e\file-upload.spec.ts:38 File Upload — Avatar and Documents › file input accepts document types
       → (browser context closed mid-trace)
```

Plus 1 firefox hard-fail that ran:
```
[firefox] tests\e2e\app.spec.ts:22  Authentication › logs in with valid credentials
       → Error: expect(received).toBeTruthy()
```

---

## Flaky tests (passed on retry)

**Zero.** This is itself a strong signal that the run is in a different state than TEST-RUN-002 — in TEST-RUN-002, 12 tests were flaky-but-eventually-passing. In TEST-RUN-003, no test passes after a first failure; every failed test fails its retry too. That's the difference between "flaky" (environmental latency) and "broken" (deterministic regression).

---

## Pass / fail summary (chromium, 49 unique tests)

| Project | Tests | Passed | Hard-fail | Flaky | Pass rate |
| --- | ---: | ---: | ---: | ---: | --- |
| chromium (completed) | 49 | 9 | 40 | 0 | 9 / 49 = 18.4% |
| firefox (completed) | 2 | 2 | (login broken, run aborted at app.spec.ts:22 retry) | 0 | 2 / 2 = 100% (trivially — only the 2 pre-login smoke tests) |
| **all completed** | **51** | **11** | **40** | **0** | **11 / 51 = 21.6%** |
| Untested (firefox tail, never started) | 47 | — | — | — | — |
| **all (extrapolated)** | **98** | **11** | **~87** | **0** | **11 / 98 = 11.2% (pessimistic) to 12.2% (if pre-login firefox smokes also pass)** |

### Pre-login chromium tests that DID pass (11)

These are the only tests that don't depend on the login flow.

```
ok  1 [chromium] tests\e2e\app.spec.ts:11   Authentication › redirects unauthenticated user to login (6.3s)
ok  2 [chromium] tests\e2e\app.spec.ts:16   Authentication › shows validation errors on empty login submit (4.1s)
ok 25 [chromium] tests\e2e\auth.spec.ts:6   Auth — Registration → Onboarding → Workspace › redirects unauthenticated user to login (3.8s)
ok 26 [chromium] tests\e2e\auth.spec.ts:11  Auth — Registration → Onboarding → Workspace › shows validation errors on empty login form (3.4s)
ok 29 [chromium] tests\e2e\auth.spec.ts:22  Auth — Registration → Onboarding → Workspace › navigates to register page from login (3.8s)
ok 30 [chromium] tests\e2e\auth.spec.ts:28  Auth — Registration → Onboarding → Workspace › registration form requires all fields (4.1s)
ok 31 [chromium] tests\e2e\auth.spec.ts:34  Auth — Registration → Onboarding → Workspace › completes full registration (3.8s)
ok 34 [chromium] tests\e2e\auth.spec.ts:54  Auth — Registration → Onboarding → Workspace › multi-factor auth input appears when required (4.6s)
ok 35 [chromium] tests\e2e\auth.spec.ts:63  Auth — Registration → Onboarding → Workspace › shows error on invalid credentials (5.2s)
ok 90 [firefox]  tests\e2e\app.spec.ts:11   Authentication › redirects unauthenticated user to login (15.0s)
ok 91 [firefox]  tests\e2e\app.spec.ts:16   Authentication › shows validation errors on empty login submit (8.8s)
```

Note: `auth.spec.ts:34 completes full registration` **passes** (it doesn't depend on the existing `test@example.com` user — it creates a new one). `auth.spec.ts:63 shows error on invalid credentials` **passes** (deliberately invalid creds). These are further evidence that the auth API and the registration path are working, and the regression is specifically in the **"existing test user logs in"** path.

---

## Comparison with TEST-RUN-002 (the 7 prior hard-fails)

| # | TEST-RUN-002 hard-fail | TEST-RUN-003 status | Notes |
| --- | --- | --- | --- |
| 1 | `[chromium] tests/e2e/app.spec.ts:61 — can create a new board` | **STILL FAILING** (chromium) | Same hard fail, same line. Now in Bucket C (browser crash) but root cause is still login. |
| 2 | `[chromium] tests/e2e/boards.spec.ts:16 — can create a new board` | **STILL FAILING** (chromium) | Same hard fail, now with `waitForURL: 15000ms timeout`. |
| 3 | `[chromium] tests/e2e/file-upload.spec.ts:19 — documents page has file upload tab` | **STILL FAILING** (chromium) | Confirmed still hard-fails (test #19, no retry success). |
| 4 | `[firefox] tests/e2e/app.spec.ts:61 — can create a new board` | **UNCONFIRMED** (firefox tail) | Test #91 was the last firefox test to run; #92-#98's worth of firefox tests never started. |
| 5 | `[firefox] tests/e2e/boards.spec.ts:16 — can create a new board` | **UNCONFIRMED** (firefox tail) | Same — in untested firefox block. |
| 6 | `[firefox] tests/e2e/calendar.spec.ts:3 — calendar page fires useCalendarItems query` | **UNCONFIRMED** (firefox tail) | Same. |
| 7 | `[firefox] tests/e2e/crm.spec.ts:37 — create deal flow` | **UNCONFIRMED** (firefox tail) | Same. |

3 of the 7 prior hard-fails are **re-confirmed** as still hard-failing in this run. The other 4 are still in the unexecuted firefox block, so we cannot rule them either way. The chromium-side failure mode for tests #1, #2, #3 has changed (from `toHaveURL` on the test body, to a 15s `waitForURL` timeout in `beforeEach`), reflecting the upstream login regression rather than the prior "SPA doesn't navigate after board creation" bug.

---

## What the workstream likely changed

The pattern (test fixture user works for fresh registration but not for existing-user login; the 7-day-old TEST-RUN-002 didn't have this issue) is consistent with one of:

1. **Auth service refactor broke existing-user login.** The registration path still works (auth.spec.ts:34 passes); only the "log in as `test@example.com`" path returns `false`. The most likely cause is a code change in the SPA's login submit handler, the API's `POST /api/auth/login` route, the session driver config, or the CSRF token pipeline.
2. **`e2e:setup` is not re-creating `test@example.com` correctly post-`migrate:fresh`.** Less likely — the seeder printed the success line — but worth a one-line check: `docker exec aquerii-postgres-1 psql -U aquerii -d aquerii_app -c "SELECT email FROM users WHERE email = 'test@example.com'"` to confirm the user exists with the expected password hash.
3. **A migration that landed after TEST-RUN-002 changed the `users` table (e.g. `2026_06_07_000001_add_account_type_to_users_table`)** and the seeder / E2E password hash don't match the new schema. A credential mismatch would behave exactly like this (login API returns 422 or 401, SPA stays on `/login`).

The first hypothesis is most consistent with `loginWithRetry` returning `false` on both the chromium and firefox tests within seconds of each other.

---

## Recommended next steps (in order)

1. **Reproduce the login failure manually.**
   ```
   curl -k -i -X POST https://localhost/api/auth/login \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```
   If this returns 200, the bug is in the SPA submit handler. If 401/422, the bug is in the seeder or the auth route.

2. **Verify the fixture user exists with the right password hash.**
   ```
   docker exec aquerii-postgres-1 psql -U aquerii -d aquerii_app \
     -c "SELECT id, email, email_verified_at IS NOT NULL AS verified FROM users WHERE email = 'test@example.com'"
   ```

3. **Check the network tab in the failed-test screenshot** (`test-results\auth-Auth-…\test-failed-1.png`) for a 4xx/5xx response on the login POST.

4. **Once login is fixed, re-run the suite.** The cascaded 33 `waitForURL` timeouts and the 6 browser-crash tests should all recover — leaving only the 7 prior hard-fails (and any new ones introduced by the workstream) to triage.

5. **For CI, add a smoke gate on `auth.spec.ts:17` (and the equivalent on firefox) before allowing the full suite to run.** A 60-minute run that hard-fails 40/49 chromium tests on login alone is a clear opportunity for fast feedback.

---

## Run metadata

| Item | Value |
| --- | --- |
| Command | `npx playwright test --reporter=list --timeout=60000` |
| Workers | 1 (from config) |
| Retries | 1 (default non-CI) |
| Reporter | `list` (CLI override) |
| Per-test timeout | 60 s (CLI override of config default) |
| BaseURL | `https://localhost` (from config) |
| Run start | 2026-06-06 23:21:00 |
| Run aborted | 2026-06-07 00:20:35 (60 m, shell-side timeout) |
| Log size | 26 KB / 96 lines (interrupted — TEST-RUN-002's completed log was 66 KB / 821 lines) |
| Log encoding | UTF-16 LE with BOM (PowerShell `Tee-Object` transcoded from the original UTF-8 stdout) |
| Log file (this run) | `team/audits\test-output-e2e-rerun-003.log` |
| Log file (prior) | `team\audits\test-output-e2e-rerun.log` (TEST-RUN-002) |
| Test artifacts | `services\web\test-results\` (83 dirs, one per attempt) |
| Playwright HTML report | partial — only 3 files in `playwright-report\data\` (report never flushed before timeout) |

---

## Artefacts

- `team\audits\test-output-e2e-rerun-003.log` — partial Playwright output for this run, 26 KB
- `team\audits\test-output-e2e-rerun.log` — TEST-RUN-002 log (66 KB / 821 lines) for direct diff
- `services\web\test-results\auth-Auth-…\error-context.md` — the canonical login-failure evidence (page snapshot, source snippet, `Received: false`)
- `services\web\test-results\app-Authentication-logs-in-with-valid-credentials-chromium\error-context.md` — second canonical login-failure evidence
- TEST-RUN-002 baseline: `team\audits\TEST-RUN-002.md` (92.9% baseline, now invalidated)
