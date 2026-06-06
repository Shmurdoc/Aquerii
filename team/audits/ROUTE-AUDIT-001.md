# ROUTE-AUDIT-001 — Aquerii

| Field | Value |
| --- | --- |
| Audit ID | `ROUTE-AUDIT-001` |
| Date | 2026-06-06 |
| Branch audited | `feat/crm-phases-3-to-8` |
| HEAD at audit time | `204acff` (on top of `fc508bb feat(web): add Storage tab to SettingsPage`) |
| Project root | `C:\Users\madoc\source\repos\Aquerii` |
| Auditor | automated — `node team/scripts/audit-endpoints.mjs` |
| Severity / verdict | **PASS** — 608 / 608 routes have at least one frontend consumer. **0 unused.** |

---

## TL;DR

- **608 / 608 routes used. 0 unused.** The previously-failing
  `GET /workspaces/{workspace}/storage` route is now flagged `[USED]`.
- The consumer landed in two commits:
  - `7a07db5` — `feat(web): useStorage hook for workspace storage data`
    (`services/web/src/hooks/useSettings.ts`)
  - `fc508bb` — `feat(web): add Storage tab to SettingsPage`
    (mounts `useStorage` in the Settings UI)
- The `useStorage` hook calls `settingsApi.getStorage()`, which resolves to
  `api.get(\`/workspaces/${wid()}/storage\`)`. The audit script's
  `{workspace}` ↔ `${...}` matcher picks that up and marks the Laravel
  route `Route::get('storage', [StorageController::class, 'show'])` in
  `services/api/routes/api.php:199` as used.
- No code changes were required to make this audit pass — purely a
  re-run after the storage frontend landed.

---

## 1. Reproduce

```bash
cd C:\Users\madoc\source\repos\Aquerii
node team/scripts/audit-endpoints.mjs
```

Exit code: `0` (CI gate green — `0` means "all routes have frontend consumers").

### What the script does

- Parses every Laravel route in `services/api/routes/api.php` and
  `services/api/routes/modules/*.php`.
- Recursively scans `services/web/src/**/*.{ts,tsx}` for
  `api.get|post|put|patch|delete(...)` calls.
- Normalises both sides: Laravel `{param}` → `*`, JS template literal
  `${expr}` → `*`, then compares the URL path only (HTTP method is
  intentionally ignored for matching).
- Emits a per-route report; non-matching routes are reported as
  `[UNUSED]` and the script exits `1`.

See `team/scripts/audit-endpoints.mjs:1-22` for the doc header.

---

## 2. Result

```
=== API Endpoint Audit ===

Parsing backend routes...
  Found 608 backend routes

Scanning frontend source files...
  Found 222 frontend source files
  Found 665 frontend API call references

=== Route Usage Report ===

  [USED] GET    /branding                                          /services/api/routes/api.php
  [USED] POST   /auth/register                                     /services/api/routes/api.php
  [USED] POST   /auth/login                                        /services/api/routes/api.php
  …  (604 more lines, all [USED])  …

  [USED] POST   /workspaces/{workspace}/support/knowledge-base/{article}/vote   /services/api/routes/modules/support.php

  ────────────────────────────────────────────────────────────────
  Total routes:     608
  Used routes:      608
  Unused routes:    0

=== Unused Routes by Source File ===

✓ All routes have frontend UI consumers.
```

### Storage route — the regression that just closed

| Field | Value |
| --- | --- |
| Route | `GET /workspaces/{workspace}/storage` |
| Backend definition | `services/api/routes/api.php:199` — `Route::get('storage', [StorageController::class, 'show'])` (inside the workspace prefix group) |
| Direct consumer | `services/web/src/lib/settings.ts:307-308` — `settingsApi.getStorage()` calls `api.get(\`/workspaces/${wid()}/storage\`)` |
| Indirect consumer | `services/web/src/hooks/useSettings.ts:95-99` — `useStorage()` → `settingsApi.getStorage()` |
| Mounted in UI by | `fc508bb` — `feat(web): add Storage tab to SettingsPage` |
| Audit status | `[USED]` |

Full audit log: `team/audits/audit-route.log`.

---

## 3. Diff vs. prior run

| Run | Date | Total | Used | Unused | Notes |
| --- | --- | --- | --- | --- | --- |
| Prior (pre-`fc508bb`) | 2026-06-06 (earlier) | 608 | 607 | **1** — `GET /workspaces/{workspace}/storage` | Backend route shipped before frontend landed |
| **This run (`ROUTE-AUDIT-001`)** | 2026-06-06 | **608** | **608** | **0** | Storage frontend in `fc508bb` closes the gap |

Net change: **+1 used**, **−1 unused**. No new routes were added since the
prior run on this branch — the 608/608 figure is purely the prior 607
plus the storage route finding a consumer.

---

## 4. Verification commands

```bash
# 1. Re-run the audit
node team/scripts/audit-endpoints.mjs 2>&1 | tail -5
# Expected last 5 lines:
#   Total routes:     608
#   Used routes:      608
#   Unused routes:    0
#
#   === Unused Routes by Source File ===
#
#   ✓ All routes have frontend UI consumers.

# 2. Confirm the storage route is now USED
node team/scripts/audit-endpoints.mjs 2>&1 | Select-String storage
# Expected:
#   [USED] GET    /workspaces/{workspace}/storage    /services/api/routes/api.php

# 3. Confirm the frontend consumer exists
Select-String -Path services/web/src/lib/settings.ts    -Pattern "getStorage"
Select-String -Path services/web/src/hooks/useSettings.ts -Pattern "useStorage"
```

---

## 5. Scope & non-goals

- **In scope:** route-vs-consumer cross-reference. Whether each
  consumer actually exercises the route at runtime is covered by
  `team/audits/TEST-RUN-002.md` (E2E pass rate 92.9%).
- **Out of scope:** audit script logic was not modified
  (`team/scripts/audit-endpoints.mjs` is the source of truth). Backend
  and frontend code were not modified — the storage consumer was
  already in place at the audit time, so no fix was needed.
- **CI gate:** the script's exit code is now `0`. Any future PR that
  introduces a backend route without a frontend consumer will trip the
  gate and fail CI with `1`.

---

## 6. Conclusion

**PASS.** The Aquerii backend exposes 608 routes; every one of them
has a matching frontend API call. The previously-orphaned storage
route now has a consumer chain
`SettingsPage → useStorage() → settingsApi.getStorage() → api.get(/workspaces/{id}/storage)`,
and the automated audit reflects that as `[USED]`. No follow-up
actions required.
