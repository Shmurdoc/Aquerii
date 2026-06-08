# PEST-RUN-002 — Blocked: `migrate:fresh` Not Idempotent (2nd Run Fails)

**Date:** 2026-06-07
**Status:** ❌ **BLOCKED** — test suite did not run
**Auditor:** opencode (build agent)
**Target:** `services/api` Pest suite
**Prior run:** [PEST-RUN-001](./PEST-RUN-001.md) (also blocked at `migrate:fresh`)

---

## TL;DR

The Pest suite was **not executed**. Step 1 of the run protocol
(`migrate:fresh` idempotency check — run twice) failed on the **second**
run. Per the run protocol, on `migrate:fresh` error the run is stopped
and reported — the leader dispatches a fix.

**Progress vs PEST-RUN-001:** the first `migrate:fresh` **now succeeds**
(all ~150 migrations run clean). The two announced fixes did move the
needle: the `migrations` table is no longer lost immediately after
creation, and a full fresh migration is now possible. **But** the second
`migrate:fresh` fails partway through, so the suite cannot yet be
treated as idempotent.

The error occurs at `2026_05_27_000063_create_crm_quotes_table` —
mid-suite, not at the tracker level. The `migrations` table vanishes
during the second fresh run.

---

## Step 1 — `migrate:fresh` idempotency check (BLOCKED on run 2)

### Run 1 — ✅ PASS

**Command:**
```powershell
docker exec aquerii-api-1 php artisan migrate:fresh --force
```

**Log:** `$env:TEMP\migrate-fresh-1-20260607-062305.log`

**Result:** ✅ All migrations applied. Dropped tables, created
`migrations` tracker, then ran the full sequence ending at
`2026_06_07_000010_add_workspace_unique_index_and_fk_to_roles_table`
without error.

### Run 2 — ❌ FAIL (idempotency broken)

**Command:**
```powershell
docker exec aquerii-api-1 php artisan migrate:fresh --force
```

**Log:** `$env:TEMP\migrate-fresh-2-20260607-062358.log`

**Result:** ❌ `Illuminate\Database\QueryException` at
`2026_05_27_000063_create_crm_quotes_table`.

### Observed behavior (Run 2)

1. `Dropping all tables ................................................ 1s DONE`
2. `Preparing database.`
3. `Creating migration table ...................................... 62.86ms DONE`
4. Ran migrations cleanly through `2026_05_27_000062_create_crm_products_table`
5. ❌ At `2026_05_27_000063_create_crm_quotes_table` the migrator
   tried to log the migration and the `migrations` table was gone.

### Error

```
SQLSTATE[42P01]: Undefined table: 7 ERROR:  relation "migrations" does not exist
LINE 1: insert into "migrations" ("migration", "batch") values ($1, ...
                    ^
(Connection: pgsql, SQL: insert into "migrations" ("migration", "batch")
values (2026_05_27_000063_create_crm_quotes_table, 1))
```

Thrown from
`vendor/laravel/framework/src/Illuminate/Database/Migrations/DatabaseMigrationRepository.php:122`
inside `Migrator::runUp`.

### Analysis

The failure is the **same Postgres error** (`42P01` — "undefined table")
that blocked PEST-RUN-001, but it now surfaces at a different point:

| Run | `migrations` table vanishes |
| --- | --- |
| PEST-RUN-001 | Immediately after `Creating migration table` (tracker never usable) |
| PEST-RUN-002 | After `2026_05_27_000062` runs, before `2026_05_27_000063` is logged |

That delta confirms the two announced fixes moved the symptom
downstream — the early tracker drop is gone — but a **different** drop
of the same table is happening deeper in the suite. The
`config/database.php` `search_path` fix and the `E2ESeeder` gating
change are not the only defects left.

Most likely root cause: one of the migrations in the
`2026_05_27_00006x` cluster (or earlier, deferred) is issuing a
`DROP SCHEMA … CASCADE`, `DROP TABLE migrations`, or
`search_path` mutation that wipes the tracker after the migrations
table is created but before the run completes. Because the same
sequence on Run 1 succeeded, the drop is most likely **conditional**
(e.g. gated on an env var or on a schema-existence check that flips
between runs).

**Note:** This error is **not yet fully resolved** by the fixes
applied since PEST-RUN-001. The first run now works; the second
still does not.

---

## Step 2 — Pest suite

**Status:** **NOT RUN** (blocked by Step 1 idempotency failure).

Per the run protocol, the test suite was not invoked. The pre-condition
of a clean, reproducible `migrate:fresh` is not met, so any Pest run
would be against a database left in a partial state by the failed
second `migrate:fresh`.

---

## Step 3 — Pass/fail/skip

| Metric          | Count |
| --------------- | ----- |
| Total tests     | n/a   |
| Passed          | n/a   |
| Failed          | n/a   |
| Skipped         | n/a   |
| Runtime         | n/a   |

---

## Step 4 — Failing tests

None — the suite did not execute.

---

## Step 5 — Comparison vs PEST-RUN-001

| | PEST-RUN-001 | PEST-RUN-002 |
| --- | --- | --- |
| `migrate:fresh` run 1 | ❌ fail (tracker unusable) | ✅ pass (all migrations) |
| `migrate:fresh` run 2 | (never reached) | ❌ fail at `2026_05_27_000063` |
| Pest suite | not run | not run |
| Error code | `42P01` (migrations) | `42P01` (migrations) — same code, later point |
| Surface | immediately after `Creating migration table` | after `2026_05_27_000062`, before `…000063` |
| Fixes applied since | (none) | `DatabaseSeeder` runs `E2ESeeder` in dev/staging/CI; `config/database.php` superadmin uses `search_path` |

**Verdict:** **partial improvement.** The two announced fixes
unblocked the first run but did not achieve full idempotency. A third
defect is still live. A targeted fix is required before the Pest
suite can be trusted as a green signal.

---

## Step 6 — Recommendation for the leader

Do not retry the Pest run until the second `migrate:fresh` succeeds.
Suggested diagnostic steps for the dispatched fix:

1. **Isolate the drop.** Run
   `docker exec aquerii-api-1 php artisan migrate:fresh --force --pretend`
   then diff the migration SQL at `2026_05_27_000062` and
   `2026_05_27_000063` to see whether either is issuing
   `DROP SCHEMA`, `DROP TABLE migrations`, or `SET search_path TO …`.
2. **Check `2026_05_27_000062_create_crm_products_table` and
   `2026_05_27_000063_create_crm_quotes_table` bodies.** Both are the
   candidates — one of them is almost certainly mutating the
   connection's `search_path` or dropping the tracker as a side
   effect of `CREATE SCHEMA` / `DROP SCHEMA` logic.
3. **Verify Postgres role + `search_path` per migration.** Run
   `docker exec aquerii-postgres-1 psql -U <user> -d <db> -c "\dn"`
   before and after the failing run to see which schema the
   `migrations` table lands in, and confirm it matches the
   connection's `search_path` (per the `config/database.php` fix).
4. **Look for cross-connection writes.** If the app uses Laravel's
   `read`/`write` split (sticky connections), confirm both
   `migrate:fresh` and the failing migration resolve to the same
   primary connection.
5. **Grep for `migrations` in migration files:**
   `grep -RIn "migrations" services/api/database/migrations/`
   to catch any stray `DROP TABLE migrations` or
   `TRUNCATE migrations`.

Once `migrate:fresh --force` runs clean **twice in a row** (idempotent),
re-run the Pest suite per the original protocol and update this report.

---

## Artifacts

- This report: `team/audits/PEST-RUN-002.md`
- Run 1 log: `C:\Users\madoc\AppData\Local\Temp\migrate-fresh-1-20260607-062305.log`
- Run 2 log: `C:\Users\madoc\AppData\Local\Temp\migrate-fresh-2-20260607-062358.log`
- No Pest log produced for this run.
- Prior report: [PEST-RUN-001.md](./PEST-RUN-001.md)
