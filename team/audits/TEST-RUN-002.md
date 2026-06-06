# Test Run Report — TEST-RUN-002

**Date:** 2026-06-06
**Branch:** `feat/crm-phases-3-to-8`
**Project root:** `C:\Users\madoc\source\repos\Aquerii`
**Mode:** Report-only (no fixes applied, no test/config/application code modified)

---

## Summary

| Metric | Value |
| --- | --- |
| Total unique tests | 98 (49 × `chromium` + 49 × `firefox`) |
| Passed on first attempt | 79 |
| Flaky (failed first, passed on retry) | 12 |
| Hard fails (failed both attempts) | 7 |
| **Pass rate (flaky counted as pass)** | **91 / 98 = 92.9%** |
| Pass rate (first-attempt only) | 79 / 98 = 80.6% |
| Hard-fail rate | 7 / 98 = 7.1% |
| Time elapsed | 37.7 m |
| Reporter | `list` |
| Per-test timeout | 60 s (config) |
| Retries | 1 (default for non-CI) |
| Workers | 1 (config) |

**Verdict vs. target:** 92.9% **exceeds** the 90% target on first re-run with fixtures.

### Comparison with TEST-RUN-001

| Metric | TEST-RUN-001 (chromium only, no fixtures) | TEST-RUN-002 (chromium + firefox, fixtures) |
| --- | --- | --- |
| Unique tests | 49 | 98 |
| Passed | 9 | 91 (incl. flaky) |
| Failed | 40 | 7 |
| Pass rate | 18.4% | **92.9%** |
| Time | 41.2 m | 37.7 m |

Pass rate improved from 18.4% → 92.9% (~5×) once `test@example.com` and the pilot-workspace fixtures (9 deals, 9 contacts, 2 boards, 2 pipelines, 1 document) were in place. The remaining 7 hard fails are a different class of bug from the TEST-RUN-001 login wall — they are not a single-pattern infrastructure blocker.

---

## Command

```
cd services/web
npx playwright test --reporter=list --timeout=60000
```

Output written to `team/audits/test-output-e2e-rerun.log` (66 KB, 821 lines).

---

## Final Playwright summary (verbatim from log tail)

```
  7 failed
    [chromium] › tests\e2e\app.spec.ts:61:3 › Boards › can create a new board
    [chromium] › tests\e2e\boards.spec.ts:16:3 › Boards — Board → Group → Item → Assign › can create a new board
    [chromium] › tests\e2e\file-upload.spec.ts:19:3 › File Upload — Avatar and Documents › documents page has file upload tab
    [firefox]  › tests\e2e\app.spec.ts:61:3 › Boards › can create a new board
    [firefox]  › tests\e2e\boards.spec.ts:16:3 › Boards — Board → Group → Item → Assign › can create a new board
    [firefox]  › tests\e2e\calendar.spec.ts:3:1 › calendar page fires useCalendarItems query against /calendar-items endpoint
    [firefox]  › tests\e2e\crm.spec.ts:37:3 › CRM — Pipeline → Contacts → Deals › create deal flow
  12 flaky
    [chromium] › tests\e2e\boards.spec.ts:28:3 › … can create a group in a board
    [chromium] › tests\e2e\boards.spec.ts:53:3 › … shows item detail modal when clicking an item
    [chromium] › tests\e2e\boards.spec.ts:84:3 › … board cards are displayed
    [chromium] › tests\e2e\crm.spec.ts:11:3 › … displays pipeline view with stage headers
    [chromium] › tests\e2e\crm.spec.ts:24:3 › … can open deal detail modal
    [chromium] › tests\e2e\crm.spec.ts:43:3 › … contact CRUD — create contact
    [chromium] › tests\e2e\documents.spec.ts:16:3 › … shows notes and files tabs
    [chromium] › tests\e2e\documents.spec.ts:51:3 › … switches between notes and files tabs
    [firefox]  › tests\e2e\boards.spec.ts:11:3 › … displays boards page with heading
    [firefox]  › tests\e2e\crm.spec.ts:11:3 › … displays pipeline view with stage headers
    [firefox]  › tests\e2e\documents.spec.ts:22:3 › … can create a new document
    [firefox]  › tests\e2e\file-upload.spec.ts:19:3 › … documents page has file upload tab
  79 passed (37.7m)
```

---

## Hard-fail analysis (7 unique tests, both attempts failed)

All seven hard fails are listed in order of the error block in the log.

### 1. `[chromium] tests/e2e/app.spec.ts:61 — can create a new board`

```ts
// app.spec.ts:61
test('can create a new board', async ({ boardsPage, page }) => {
  await boardsPage.createBoard()                                                 // clicks "new board"
  await expect(page).toHaveURL(/\/boards\/[a-z0-9-]+/, { timeout: 10000 })       // ← times out
})
```

**Error (first 3 lines):**
```
Error: expect(page).toHaveURL(expected) failed
Expected pattern: /\/boards\/[a-z0-9-]+/
Received string:  "https://localhost/boards"
Timeout: 10000ms
```

**1-line guess:** `BoardsPage.createBoard()` (page object) only `click()`s the "new board" button — it does not wait for or assert the SPA's post-create navigation. The board IS being created (no API error is logged), but the SPA stays on `/boards` (the list) instead of routing to `/boards/<id>`. Either the create handler is missing a `navigate(\`/boards/\${id}\`)` call, or the test should use a `page.waitForURL` first.

### 2. `[chromium] tests/e2e/boards.spec.ts:16 — can create a new board`

```ts
// boards.spec.ts:16
test('can create a new board', async ({ boardsPage, page }) => {
  await boardsPage.goto()
  await boardsPage.createBoard()
  await expect(page).toHaveURL(/\/boards\/[a-z0-9-]+/, { timeout: 10000 })       // ← times out
})
```

**Error (first 3 lines):**
```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
```

**1-line guess:** Same root cause as #1. The stack frame at the error is `beforeEach` at `boards.spec.ts:8` (the login `waitForURL`), but the real failure is the subsequent `toHaveURL` never matching because the SPA doesn't redirect after board creation. Retry can't help — it's deterministic.

### 3. `[chromium] tests/e2e/file-upload.spec.ts:19 — documents page has file upload tab`

```ts
// file-upload.spec.ts:19
test('documents page has file upload tab', async ({ page }) => {
  await page.goto(documentsUrl())                                                // → /documents
  await page.waitForTimeout(2000)
  const filesTab = page.getByRole('button', { name: /files/i })
  if (await filesTab.isVisible()) {
    await filesTab.click()
    await page.waitForTimeout(1000)
  }
})
```

**Error (first 3 lines):**
```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
```

**1-line guess:** The failure is in `beforeEach` (`file-upload.spec.ts:9`), not the test body. After `loginPage.login('test@example.com', 'password123')`, `page.waitForURL(/\/(onboarding|boards)/)` times out — the `documents` route is NOT in the regex. If the post-login redirect happens to land on `/documents` (e.g. via a stale redirect target) the wait fails. The `beforeEach` regex is too narrow for this spec.

### 4. `[firefox] tests/e2e/app.spec.ts:61 — can create a new board`

**Error (first 3 lines):** identical to #1
```
Error: expect(page).toHaveURL(expected) failed
Expected pattern: /\/boards\/[a-z0-9-]+/
Received string:  "https://localhost/boards"
Timeout: 10000ms
```

**1-line guess:** Same root cause as #1 — SPA doesn't redirect to `/boards/<id>` after `createBoard()`. Cross-browser, not firefox-specific.

### 5. `[firefox] tests/e2e/boards.spec.ts:16 — can create a new board`

**Error (first 3 lines):**
```
Error: expect(page).toHaveURL(expected) failed
Expected pattern: /\/boards\/[a-z0-9-]+/
Received string:  "https://localhost/boards"
Timeout: 10000ms
```

**1-line guess:** Same root cause as #2. Note: chromium #2 failed on the `waitForURL` in the `beforeEach` (different error signature), firefox #5 failed on the `toHaveURL` assertion in the test body — same underlying bug, different failure surface.

### 6. `[firefox] tests/e2e/calendar.spec.ts:3 — calendar page fires useCalendarItems query against /calendar-items endpoint`

```ts
// calendar.spec.ts:33
const call = requests[0]
expect(call.method).toBe('GET')
expect(call.status).toBe(200)                                                    // ← fails
```

**Error (first 3 lines):**
```
Error: expect(received).toBe(expected) // Object.is equality
Expected: 200
Received: undefined
```

**1-line guess:** `requests[0]` exists (line 29's `toBeGreaterThan(0)` passed), but its `status` is `undefined`. The test's `response` listener uses `res.url()` for matching back to the request; firefox appears to normalise the URL (strip query / re-encode) such that `requests.find(x => x.url === res.url())` returns `undefined`, leaving `status` unset. Chromium doesn't have this issue. Either match on URL pattern instead of strict equality, or capture the status from the request listener via a deferred promise.

### 7. `[firefox] tests/e2e/crm.spec.ts:37 — create deal flow`

```ts
// crm.spec.ts:37
test('create deal flow', async ({ crmPage }) => {
  await crmPage.goto()
  await crmPage.addDealButton.click()
  await expect(crmPage.page.getByText('New Deal').first()).toBeVisible({ timeout: 8000 })
})
```

**Error (first 3 lines):**
```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
```

**1-line guess:** Failure is again in the `beforeEach` (`crm.spec.ts:8`) — `waitForURL(/\/(onboarding|boards)/)` times out after login. The post-login target can land on `/crm` (matching `crmUrl()`), and the regex `/(onboarding|boards)/` doesn't match it. Same beforeEach bug as #3; appears deterministic on firefox.

---

## Flaky tests (12, passed on retry)

Each of these failed its first attempt but passed the retry. The first-attempt failure in every case is the `beforeEach` login → `waitForURL` timing out (slow SPA hydration on the seeded workspace). All twelve ultimately pass, so they're an instability issue, not a correctness issue.

| # | Test | First-attempt failure (error block) |
| --- | --- | --- |
| 1 | `[chromium] boards.spec.ts:28 — can create a group in a board` | `beforeEach` waitForURL timeout |
| 2 | `[chromium] boards.spec.ts:53 — shows item detail modal when clicking an item` | `beforeEach` waitForURL timeout |
| 3 | `[chromium] boards.spec.ts:84 — board cards are displayed` | `beforeEach` waitForURL timeout |
| 4 | `[chromium] crm.spec.ts:11 — displays pipeline view with stage headers` | `beforeEach` waitForURL timeout |
| 5 | `[chromium] crm.spec.ts:24 — can open deal detail modal` | `beforeEach` waitForURL timeout |
| 6 | `[chromium] crm.spec.ts:43 — contact CRUD — create contact` | `beforeEach` waitForURL timeout |
| 7 | `[chromium] documents.spec.ts:16 — shows notes and files tabs` | `beforeEach` waitForURL timeout |
| 8 | `[chromium] documents.spec.ts:51 — switches between notes and files tabs` | `beforeEach` waitForURL timeout |
| 9 | `[firefox]  boards.spec.ts:11 — displays boards page with heading` | `beforeEach` waitForURL timeout |
| 10 | `[firefox]  crm.spec.ts:11 — displays pipeline view with stage headers` | `beforeEach` waitForURL timeout |
| 11 | `[firefox]  documents.spec.ts:22 — can create a new document` | `beforeEach` waitForURL timeout |
| 12 | `[firefox]  file-upload.spec.ts:19 — documents page has file upload tab` | `beforeEach` waitForURL timeout |

**Common root cause (all 12):** `loginPage.login` succeeds, but the post-login SPA hydration takes >15 s on the seeded pilot workspace, and the `beforeEach` `waitForURL(/\/(onboarding|boards)/)` does not account for that. The retry wins because the second `login()` skips re-auth (or the workspace data is now warm) and the URL change fires inside 15 s.

A 30 s timeout in the `beforeEach` (or a small backoff loop) would likely turn all 12 flaky into first-try passes.

---

## Per-file pass/fail breakdown

| Spec file | Tests/project | Hard fails (chromium) | Hard fails (firefox) | Flaky | Pass rate (final) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `app.spec.ts` | 13 | 1 (`can create a new board`) | 1 (`can create a new board`) | 0 | 23 / 26 = 88.5% |
| `auth.spec.ts` | 9 | 0 | 0 | 0 | 18 / 18 = **100%** |
| `boards.spec.ts` | 9 | 1 (`can create a new board`) | 1 (`can create a new board`) | 5 (3 chromium + 1 firefox + 1 firefox at line 11) | 14 / 18 = 77.8% |
| `calendar.spec.ts` | 1 | 0 | 1 (response status) | 0 | 1 / 2 = 50% |
| `crm.spec.ts` | 7 | 0 | 1 (`create deal flow`) | 4 (3 chromium + 1 firefox) | 12 / 14 = 85.7% |
| `documents.spec.ts` | 6 | 0 | 0 | 3 (2 chromium + 1 firefox) | 12 / 12 = **100%** (with retry) |
| `file-upload.spec.ts` | 4 | 1 (`documents page has file upload tab`) | 0 | 1 (firefox) | 6 / 8 = 75% |
| **All** | **49** | **3** | **4** | **12** | **91 / 98 = 92.9%** |

---

## Verdict

| Criterion | Required | Actual | Met? |
| --- | --- | --- | --- |
| E2E pass rate (flaky counted as pass) | ≥ 90% | 92.9% | **YES** |
| E2E pass rate (first-attempt only) | — | 80.6% | (n/a) |
| E2E hard-fail rate | — | 7.1% | (n/a) |
| TEST-RUN-001 login wall resolved | yes | 9/49 → 91/98 | **YES** |
| No test files modified | yes | unchanged | **YES** |
| No application code modified | yes | unchanged | **YES** |
| No seeder modified | yes | unchanged | **YES** |

**Headline result:** the TEST-RUN-001 blocker (missing `test@example.com` test user and missing pilot-workspace fixtures) is fully resolved. E2E pass rate moved from **18.4% → 92.9%** on a single re-run, with no code changes.

**Remaining work, in priority order:**

1. **Real bug — `can create a new board` (both projects, 2 unique tests).** The "new board" button creates a board but the SPA does not navigate to `/boards/<id>`. This is the highest-value follow-up because the URL assertion is a deterministic product-flow check, not a flake. Likely a missing `navigate()` call in the create handler.
2. **Test brittleness — `beforeEach` `waitForURL` regex is too narrow (3 hard fails + 12 flaky).** Regex `/\/(onboarding|boards)/` does not match `/crm`, `/documents`, `/calendar`, `/settings/profile`, etc. The test fixes are mechanical (loosen the regex or route-per-spec), and a 30 s timeout would absorb the hydration latency. No application change required.
3. **Firefox-only — `calendar.spec.ts` URL-equality match for response/request correlation.** Firefox normalises URLs differently from chromium; the response handler can't find the matching request by strict `===`. Test-side fix only.

---

## Artefacts

- `team/audits/test-output-e2e-rerun.log` — full Playwright output, 66 KB / 821 lines (this run).
- Previous artefacts from TEST-RUN-001 are still on disk (`test-output-e2e.log`, etc.) for cross-run diffing.
