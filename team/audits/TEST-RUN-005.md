# TEST-RUN-005 — Chromium-only regression on rebuilt container

**Date:** 2026-06-07
**Container state:** `aquerii-api-1` rebuilt with bind-mount + `APP_ENV=local`
**Browser scope:** Chromium only (firefox tail killed in TEST-RUN-004 — saved ~60 min)
**Worker count:** 1
**Per-test timeout:** 90 s
**Login smoke test fix:** BoardsPage.ts @ f43c8ba (already committed before this run)
**Log:** `C:\Users\madoc\AppData\Local\Temp\playwright-20260607-115050.log`

---

## Result: **REGRESSION — DO NOT SHIP**

| Metric | TEST-RUN-004 (chromium) | **TEST-RUN-005 (chromium)** | Delta |
|---|---|---|---|
| Total tests | 49 | 49 | — |
| Passed (first try + retry combined) | 47 | **8** | **-39** |
| Hard-fail count | 2 | **41** | **+39** |
| Pass rate | 47 / 49 = **95.9 %** | **8 / 49 = 16.3 %** | **-79.6 pts** |
| Runtime | ~28.6 m (full multi-browser) | 57.3 m (chromium only) | n/a |
| Log `Tests:` summary | `8 passed (57.3m)` (with `41 failed` on preceding line) | n/a | n/a |

**Verdict vs. target:** 16.3 % is **far below** the 95.9 % TEST-RUN-004 baseline. The
TEST-RUN-004 recovery is **broken** on the new container. Both of TEST-RUN-004's
known chromium hard-fails (the two `can create a new board` tests) are still
failing, and 39 **additional** tests are now hard-failing that were green in
TEST-RUN-004 — almost all of them on the post-login `waitForURL(/\/(onboarding|boards)/)`
assertion. **The f43c8ba BoardsPage.ts fix did not land the suite in a green
state**, and the new container appears to have regressed auth itself.

---

## Step-by-step execution log

| Step | Command | Result |
|---|---|---|
| 1 | `Stop-Process` on port 3000 owner | n/a (port already free) |
| 2 | `curl -k https://localhost/api/health` | `{"status":"ok","service":"api"}` ✓ |
| 2 | `docker ps \| Select-String aquerii-api-1` | `aquerii-api-1: Up 2 hours (healthy)` ✓ |
| 3 | `php artisan migrate:fresh --force` | All 2026_06_07 migrations DONE ✓ |
| 3 | `php artisan e2e:setup` | `E2E test data ready (test@example.com / password123)` ✓ |
| 4 | Start `npm run dev` on port 3000 | Already up after 15 s wait ✓ |
| 4 | `curl http://localhost:3000` | Vite-served HTML with `/src/main.tsx` mount ✓ |
| 5 | `npx playwright test --project=chromium --reporter=list --timeout=90000` | 57.3 m, 8 / 49 pass |
| 6 | `.last-run.json` | 41 failedTests entries, `status: "failed"` ✓ |

---

## Root-cause signal (one bug, 39 of 41 failures)

The dominant failure is the post-login `page.waitForURL(/\/(onboarding|boards)/, { timeout: 15000 })`
inside `beforeEach` hooks. From the error context of the smoke test
`app.spec.ts:22` (`Authentication › logs in with valid credentials`):

```
Error: expect(received).toBeTruthy()
Received: false
```

…with the page snapshot still showing the Sign-in form, **email = `test@example.com`,
password = `password123`, button text = "Signing in…" (disabled)**. The form was
submitted but the login API call never resolved with a successful navigation, so
`loginWithRetry()` returned `false` and every downstream `beforeEach` blocked
on the URL match for 15 s before timing out.

This is **not** the TEST-RUN-003 seeder regression (that one was resolved by the
explicit `E2ESeeder` call inside `e2e:setup` — the command above reported the
seed success line). It is a **runtime** auth regression introduced by the
container rebuild + `APP_ENV=local`:

- `migrate:fresh` ran clean.
- `e2e:setup` reported test data ready.
- The **API** health endpoint returns `200 ok`.
- But the **dev-server-to-API** login round-trip never completes (Sign-in button
  stays in the disabled "Signing in…" state).

Likely candidates (in order of probability given the new `APP_ENV=local`):

1. CORS / trusted-proxy / session-domain mismatch — `APP_ENV=local` reads the
   local `.env` and the cookie or CORS allowlist for `https://localhost:3000`
   is no longer correct (TEST-RUN-004 ran with `APP_ENV=production` inside the
   container).
2. The `e2e:setup` user was created against the new `APP_ENV=local` config but
   Sanctum / Passport stateful domain is now wrong, so `/api/login` returns
   a 4xx that the SPA swallows silently.
3. The bind-mount changed the API's `APP_URL` and the SPA's `VITE_API_URL`
   is still pointing at a host the API no longer listens on.

The 2 known hard-fails from TEST-RUN-004 (the `can create a new board` tests)
are also captured in the new failure list (entries 4 and 16), so the f43c8ba
BoardsPage.ts fix is **not the source of the regression** — it's masked by it.
Once login is fixed, the same 2 boards tests are likely to still fail and will
need a follow-up engineering look.

---

## Hard-failing tests (41 unique, chromium only)

Breakdown by spec file:

| Spec file | Hard fails | Examples |
|---|---|---|
| `tests/e2e/app.spec.ts` | **11** | `Authentication › logs in with valid credentials`, all 7 `Boards` tests, both `Documents` tests, `CRM › displays pipeline view` |
| `tests/e2e/auth.spec.ts` | **3** | `logs in with valid credentials`, `completes full registration`, `shows role selection onboarding for user with existing workspace` |
| `tests/e2e/boards.spec.ts` | **9** | All boards tests in the file |
| `tests/e2e/calendar.spec.ts` | **1** | `calendar page fires useCalendarItems query against /calendar-items endpoint` |
| `tests/e2e/crm.spec.ts` | **7** | All 7 CRM tests |
| `tests/e2e/documents.spec.ts` | **6** | All 6 documents tests |
| `tests/e2e/file-upload.spec.ts` | **4** | All 4 file-upload tests |
| **Total** | **41 / 49** | |

Full enumeration (every `N) [chromium] › …` line from the log):

1. `tests/e2e/app.spec.ts:22 › Authentication › logs in with valid credentials`
2. `tests/e2e/app.spec.ts:36 › Onboarding › shows role selection for user with existing workspace`
3. `tests/e2e/app.spec.ts:57 › Boards › displays boards page`
4. `tests/e2e/app.spec.ts:61 › Boards › can create a new board`  *(TEST-RUN-004 hard-fail #1, still broken)*
5. `tests/e2e/app.spec.ts:66 › Boards › opens board and shows kanban view`
6. `tests/e2e/app.spec.ts:71 › Boards › can switch to table view`
7. `tests/e2e/app.spec.ts:78 › Boards › can switch to calendar view`
8. `tests/e2e/app.spec.ts:84 › Boards › navigates between pages via sidebar`
9. `tests/e2e/app.spec.ts:106 › Documents › displays documents page`
10. `tests/e2e/app.spec.ts:110 › Documents › can create a new document`
11. `tests/e2e/app.spec.ts:117 › CRM › displays pipeline view`
12. `tests/e2e/auth.spec.ts:17 › logs in with valid credentials`
13. `tests/e2e/auth.spec.ts:34 › completes full registration`
14. `tests/e2e/auth.spec.ts:47 › shows role selection onboarding for user with existing workspace`
15. `tests/e2e/boards.spec.ts:11 › displays boards page with heading`
16. `tests/e2e/boards.spec.ts:16 › can create a new board`  *(TEST-RUN-004 hard-fail #2, still broken)*
17. `tests/e2e/boards.spec.ts:22 › opens board and shows kanban view`
18. `tests/e2e/boards.spec.ts:28 › can create a group in a board`
19. `tests/e2e/boards.spec.ts:40 › can add an item to a group`
20. `tests/e2e/boards.spec.ts:53 › shows item detail modal when clicking an item`
21. `tests/e2e/boards.spec.ts:62 › can switch between board views`
22. `tests/e2e/boards.spec.ts:73 › navigates between modules via sidebar`
23. `tests/e2e/boards.spec.ts:84 › board cards are displayed`
24. `tests/e2e/calendar.spec.ts:3 › calendar page fires useCalendarItems query against /calendar-items endpoint`
25. `tests/e2e/crm.spec.ts:11 › displays pipeline view with stage headers`
26. `tests/e2e/crm.spec.ts:18 › shows deal cards in pipeline`
27. `tests/e2e/crm.spec.ts:24 › can open deal detail modal`
28. `tests/e2e/crm.spec.ts:32 › add deal button is visible`
29. `tests/e2e/crm.spec.ts:37 › create deal flow`
30. `tests/e2e/crm.spec.ts:43 › contact CRUD — create contact`
31. `tests/e2e/crm.spec.ts:61 › display CRM sidebar navigation`
32. `tests/e2e/documents.spec.ts:11 › displays documents page with heading`
33. `tests/e2e/documents.spec.ts:16 › shows notes and files tabs`
34. `tests/e2e/documents.spec.ts:22 › can create a new document`
35. `tests/e2e/documents.spec.ts:28 › document title is editable`
36. `tests/e2e/documents.spec.ts:40 › document content editor is present`
37. `tests/e2e/documents.spec.ts:51 › switches between notes and files tabs`
38. `tests/e2e/file-upload.spec.ts:12 › avatar upload button is visible in settings profile`
39. `tests/e2e/file-upload.spec.ts:19 › documents page has file upload tab`
40. `tests/e2e/file-upload.spec.ts:29 › scanned documents upload button is accessible`
41. `tests/e2e/file-upload.spec.ts:38 › file input accepts document types`

---

## Tests that DID pass (8 of 49)

| # | Test | Time | Notes |
|---|---|---|---|
| 1 | `app.spec.ts:11 › Authentication › redirects unauthenticated user to login` | 6.3 s | Pre-login guard — does not hit auth |
| 2 | `app.spec.ts:16 › Authentication › shows validation errors on empty login submit` | 3.6 s | Client-side validation only |
| 25 | `auth.spec.ts:6 › redirects unauthenticated user to login` | 3.0 s | Pre-login guard |
| 26 | `auth.spec.ts:11 › shows validation errors on empty login form` | 3.1 s | Client-side validation only |
| 29 | `auth.spec.ts:22 › navigates to register page from login` | 4.3 s | Client routing |
| 30 | `auth.spec.ts:28 › registration form requires all fields` | 3.4 s | Client-side validation only |
| 35 | `auth.spec.ts:54 › multi-factor auth input appears when required` | 23.8 s | Hits a different codepath |
| 36 | `auth.spec.ts:63 › shows error on invalid credentials` | 39.2 s | Negative-path: expects auth to FAIL and displays the error — passes by accident-of-design |

**All 8 passes are tests that do not require a successful round-trip login.**
This is the cleanest possible evidence that **the auth round-trip, not the
BoardsPage fix, is what regressed**.

---

## What was the same as TEST-RUN-004

- Same 49 unique chromium tests.
- Same 2 hard-fails carried forward: `app.spec.ts:61` and `boards.spec.ts:16` (`can create a new board`).
- Same total runtime per-test on a retry (~18-20 s for boards, ~52-57 s for the larger CRM/Documents/file-upload specs).

## What is new vs. TEST-RUN-004

- 39 new hard-fails (every post-login `beforeEach`).
- TEST-RUN-004's flaky-but-eventually-passing tests (`Boards › can create a new board` was flaky 5/5 times → passed on retry) are now hard-fail (login never succeeds, so the test never gets to the part that used to flake).
- The 5 flaky tests reported in TEST-RUN-004 (which all `passed on retry` per that report's section 5) are NOT making it past the `beforeEach` `waitForURL` on this run — none of them have a retry-pass.

---

## Recommended next steps (for the eng workstream, not this run)

1. **Revert or audit the `APP_ENV=local` change.** TEST-RUN-004 ran with `APP_ENV=production` in the container and was green. If the local env can't reach the API, ship the test fix in a follow-up that restores `APP_ENV=production` (or properly configures `SANCTUM_STATEFUL_DOMAINS` / `VITE_API_URL` for the new env).
2. **Capture the actual login response** on this container — add a `page.on('request', …)` / `page.on('response', …)` listener to `LoginPage.loginWithRetry` and re-run a single spec to see whether `/api/login` is returning 200, 4xx, or never resolving.
3. **Then re-run the full chromium suite** with the dev-server back in a green state. The f43c8ba BoardsPage fix is most likely fine; it just needs auth back to confirm the 2 carried-over `can create a new board` tests now pass.
4. **Do not merge f43c8ba to main** until at least the 2 carried-over hard-fails are flipped to pass — the current state is "fix is in, suite is still red."

---

## Reproduce

```powershell
# from C:\Users\madoc\source\repos\Aquerii\services\web
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

curl.exe -k -s -o $null -w "%{http_code}" https://localhost/api/health
docker ps --format "{{.Names}}: {{.Status}}" | Select-String "aquerii-api-1"

docker exec aquerii-api-1 php artisan migrate:fresh --force
docker exec aquerii-api-1 php artisan e2e:setup

# dev server (if not already up on :3000)
Start-Process powershell -ArgumentList "npm run dev" -WindowStyle Hidden
Start-Sleep -Seconds 30

npx playwright test --project=chromium --reporter=list --timeout=90000 `
  2>&1 | Tee-Object -FilePath "$env:TEMP\playwright-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
```

Expected `Tests:` summary line: `8 passed (57.3m)` (preceded by `41 failed`).

---

**Sign-off:** qa-lead, 2026-06-07. Suite is **NOT green**. Recommend blocking the ship until the auth regression is root-caused and the 2 carried-over `can create a new board` hard-fails are flipped.
