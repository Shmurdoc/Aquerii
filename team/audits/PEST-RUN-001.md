# PEST-RUN-001 — Blocked: `migrate:fresh` Error

**Date:** 2026-06-06
**Status:** ❌ **BLOCKED** — test suite did not run
**Auditor:** opencode (build agent)
**Target:** `services/api` Pest suite (unblocked by commit `9592b42`)

---

## TL;DR

The Pest suite was **not executed**. Step 2 of the run protocol
(`php artisan migrate:fresh --force`) failed before the test runner
could be invoked. Per the run instructions, on `migrate:fresh` error
the run is stopped and reported — the leader dispatches a fix.

The trigger migration idempotency fix at `9592b42` is **present and
correct** (Step 1 passed). The error in Step 2 is a **different
defect** — not related to the trigger fix.

---

## Step 1 — Trigger migration fix verification

**Command:**
```powershell
git log --oneline -1 -- services/api/database/migrations/2026_06_04_000002_create_realtime_events_sequence_trigger.php
```

**Result:**
```
9592b42 fix(realtime): make trg_realtime_events_sequence migration idempotent (DROP IF EXISTS before CREATE)
```

✅ **PASS** — exact commit message as expected.

---

## Step 2 — `migrate:fresh` (BLOCKED)

**Command:**
```powershell
docker exec aquerii-api-1 php artisan migrate:fresh --force
```

**Result:** ❌ **FAILED** — `Illuminate\Database\QueryException`

### Observed behavior

The command progressed through these stages:

1. `Dropping all tables ................................................ 8s DONE`
2. `Preparing database.`
3. `Creating migration table ..................................... 142.50ms DONE`
4. ❌ Query on `migrations` table failed with `42P01` ("undefined table")

### Error

```
SQLSTATE[42P01]: Undefined table: 7 ERROR:  relation "migrations" does not exist
LINE 1: select max("batch") as aggregate from "migrations"
```

(Connection: `pgsql`, SQL: `select max("batch") as aggregate from "migrations"`)

### Analysis

The `migrations` table was **just created** in the same command
(per the preceding `Creating migration table ... DONE` line), yet
the very next query — a `SELECT max("batch")` against that same
table — reports it as not existing.

Likely causes (in order of probability):

1. **Connection / search_path drift** — the migration table was
   created in a different schema (or by a different connection /
   search_path) than the one used to query it. Postgres is
   strict about `search_path` and statement-level schema isolation.
2. **Transaction visibility** — if the create ran inside a
   transaction that was later rolled back, the table would be gone
   by the time the next statement ran. But Laravel's migrate
   doesn't normally wrap a single `create migration table` in a
   savepoint.
3. **Postgres role/permissions** — the role running the query may
   lack ownership/visibility of the just-created table. Unlikely
   since the same role created it one line earlier.
4. **Connection-pool/replica** — if the app's `pgsql` config
   resolves to a read replica or different DB on subsequent
   statements, the write wouldn't be visible.

**Note:** This error has **no relationship** to the trigger
migration fix at `9592b42`. The failure occurs at the migration
**tracker** level, before any application migration (including the
realtime trigger migration) is loaded.

---

## Step 3 — Pest suite

**Status:** **NOT RUN** (blocked by Step 2 failure).

Per the run protocol, the test suite was not invoked. No
`pest-run-*.log` file exists in `$env:TEMP` for this run.

---

## Step 4 — Pass/fail/skip

| Metric          | Count |
| --------------- | ----- |
| Total tests     | n/a   |
| Passed          | n/a   |
| Failed          | n/a   |
| Skipped         | n/a   |
| Runtime         | n/a   |

---

## Step 5 — Failing tests

None — the suite did not execute.

---

## Step 6 — Recommendation for the leader

Do not retry the Pest run until the `migrate:fresh` failure is
resolved. Suggested diagnostic steps for the dispatched fix:

1. Run `docker exec aquerii-postgres-1 psql -U <user> -d <db> -c "\dn"`
   to inspect the search_path and confirm which schema the
   `migrations` table landed in.
2. Run `docker exec aquerii-postgres-1 psql -U <user> -d <db> -c "\d migrations"`
   to confirm the table actually exists post-create.
3. Check `services/api/config/database.php` for the `pgsql` connection —
   verify `search_path`, `database`, `schema`, and any
   `sticky`/`read-write` split. Look for a `read` / `sticky`
   config that might route the second query to a different
   connection.
4. Check whether `migrate:fresh` succeeded in any prior run on
   this branch — `git log --oneline -- services/api/config/database.php`
   and `git log --oneline -- docker-compose*.yml` to see what
   changed recently.

Once `migrate:fresh --force` runs clean twice in a row, re-run the
Pest suite per the original protocol and update this report.

---

## Artifacts

- This report: `team/audits/PEST-RUN-001.md`
- No Pest log produced for this run.
