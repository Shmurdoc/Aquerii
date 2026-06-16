# TEST-RUN-006 — Focused subset re-run after OPcache fix + APP_ENV=production revert

**Date:** 2026-06-07 16:05 PT
**Container state:** `aquerii-api-1` running `APP_ENV=production`, OPcache enabled (`opcache.enable=On`, `opcache.validate_timestamps=Off`, `opcache.revalidate_freq=2`)
**Browser scope:** Chromium only
**Scope:** 6 tests — 4 previously hard-failing + 2 controls
**Result file:** `C:\Users\madoc\AppData\Local\Temp\playwright-focused-20260607-160553.log`

## Headline

| Metric | TEST-RUN-004 (full suite, baseline) | TEST-RUN-005 (full suite, regressed) | TEST-RUN-006 (focused subset) |
| --- | ---: | ---: | ---: |
| Pass rate | **94 / 98 = 95.9 %** | 8 / 49 = 16.3 % | **2 / 6 = 33.3 %** |
| Hard-fail count | 4 | 41 | **4 (of 6 attempted)** |
| API health latency (warm) | n/a recorded | n/a recorded | **800 – 948 ms** |

## Subset breakdown

| # | Test (id) | Type | Result |
| --- | --- | --- | ---: |
| 1 | `app.spec.ts:22` Authentication › logs in with valid credentials | previously hard-failing | **FAIL** (x2 attempts) |
| 2 | `app.spec.ts:61` Boards › can create a new board | previously hard-failing | **FAIL** (x2 attempts) |
| 3 | `auth.spec.ts:17` Auth › logs in with valid credentials | previously hard-failing | **FAIL** (x2 attempts) |
| 4 | `boards.spec.ts:16` Boards › can create a new board | previously hard-failing | **FAIL** (x2 attempts, beforeEach timeout) |
| 5 | `app.spec.ts:11` (control) | should pass | **PASS** |
| 6 | `auth.spec.ts:6` (control) | should pass | **PASS** |

All 4 failures share the same root error — the post-login URL never matches `/\/(onboarding|boards)/`; the browser stays on `https://localhost/login` after `loginPage.login()` resolves. The two controls (which do *not* depend on the post-login redirect target) pass cleanly.

## Verdict

**E2E is NOT recovered.** The OPcache fix did survive the container restart (API health 800–948 ms, well under the 2 000 ms regression threshold), and the `APP_ENV=production` revert restored the env that TEST-RUN-004 ran under, but the focused subset still reproduces TEST-RUN-005's *login-wall* signature in 4 / 4 of the previously-failing tests. The failure mode is no longer the TEST-RUN-004 "board created but SPA doesn't navigate to `/boards/<id>`" bug — it is the TEST-RUN-005 "login succeeds at the API but the SPA never leaves `/login`" bug, which means the recovery hypothesis (OPcache + APP_ENV revert) is **insufficient**. A full Playwright re-run would consume ~30 min of CI to confirm a regression we have already proven in 6.8 min on a 6-test subset.

## Recommendation: do NOT run the full suite yet

Next probe (cheaper than a full re-run): instrument `LoginPage.login()` (or run one spec with `--debug`) to capture the actual `/api/login` request/response, the `Set-Cookie` header, and the SPA's next request after login resolves. Likely candidates remain the ones flagged in TEST-RUN-005 §3 — `SANCTUM_STATEFUL_DOMAINS`, cookie `domain` / `SameSite`, or a `XSRF-TOKEN` second-request mismatch that `APP_ENV=production` does not by itself fix.
