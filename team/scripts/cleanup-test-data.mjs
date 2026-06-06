#!/usr/bin/env node

/**
 * Test Data Cleanup Script
 *
 * Finds and (optionally) soft-deletes stale test data from the Aquerii
 * Postgres database. Safe to run repeatedly. Always dry-runs by default.
 *
 * PATTERNS (intentionally narrow — false positives should be impossible):
 *   - Test users:   email matches /^test-\d+@example\.com$/
 *   - Test workspaces: name = 'Test Workspace' AND no activity for >= 30 days
 *                       (or never had activity)
 *
 * NEVER TOUCHES:
 *   - Any user with email matching *@pilot.example.com
 *   - Any user with email matching *@aquerii.co.za (production)
 *   - Any user with email matching *@example.com other than the test pattern
 *   - Any workspace whose name is not exactly 'Test Workspace'
 *
 * USAGE:
 *   node team/scripts/cleanup-test-data.mjs                # dry-run (default)
 *   node team/scripts/cleanup-test-data.mjs --dry-run      # same as default
 *   node team/scripts/cleanup-test-data.mjs --execute      # prompt + delete
 *   node team/scripts/cleanup-test-data.mjs --yes          # skip confirm
 *   node team/scripts/cleanup-test-data.mjs --include-recent   # bypass 30d filter
 *   node team/scripts/cleanup-test-data.mjs --help         # show this help
 *
 * ENVIRONMENT (reads from .env if present, then process.env):
 *   DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
 *
 * All SQL is parameterised — no string concatenation.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEAM_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(TEAM_DIR, "..");
const API_DIR = resolve(REPO_ROOT, "services/api");

// ── CLI parsing ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const HELP_FLAGS = new Set(["--help", "-h"]);
const showHelp = args.some((a) => HELP_FLAGS.has(a));

const HELP = `
cleanup-test-data.mjs — Find and remove stale test data from Postgres

USAGE:
  node team/scripts/cleanup-test-data.mjs [OPTIONS]

OPTIONS:
  --dry-run              List candidates only (default; this is the safe mode)
  --execute              Prompt for confirmation then soft-delete candidates
  --yes, -y              Skip confirmation prompt (use with --execute)
  --include-recent       Bypass the 30-day inactivity filter on Test Workspaces
  --help, -h             Show this help

ENVIRONMENT (falls back to .env files in repo root / services/api):
  DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD

EXAMPLES:
  # Inspect what would be cleaned (safe, read-only):
  node team/scripts/cleanup-test-data.mjs

  # Clean up after confirming the list looks right:
  node team/scripts/cleanup-test-data.mjs --execute

  # Force cleanup without prompt (CI use):
  node team/scripts/cleanup-test-data.mjs --execute --yes

  # Bypass the 30-day rule (e.g. dev environments with fresh test data):
  node team/scripts/cleanup-test-data.mjs --include-recent
`;

if (showHelp) {
  console.log(HELP);
  process.exit(0);
}

const FLAGS = {
  dryRun: args.includes("--dry-run") || !args.includes("--execute"),
  execute: args.includes("--execute"),
  yes: args.includes("--yes") || args.includes("-y"),
  includeRecent: args.includes("--include-recent"),
};

// ── Config ────────────────────────────────────────────────────────────────

const TEST_USER_EMAIL_REGEX = /^test-\d+@example\.com$/;
const TEST_WORKSPACE_NAME = "Test Workspace";
const STALE_DAYS = 30;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

// Email suffixes / patterns that must NEVER be touched
const PROTECTED_EMAIL_SUFFIXES = [
  "@pilot.example.com",
  "@aquerii.co.za",
];

// ── Env loading ───────────────────────────────────────────────────────────

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(REPO_ROOT, ".env"));
loadEnvFile(resolve(API_DIR, ".env"));

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`  ERROR: ${name} is not set. Check your .env or environment.`);
    process.exit(2);
  }
  return v;
}

// The .env files in the api container use docker service names (e.g.
// DB_HOST=postgres). When this script runs from the host, those names won't
// resolve. Allow a host-side override (DB_HOST_LOCAL) or fall back to
// 127.0.0.1 only if the requested host is clearly a docker service name.
function resolveDbHost(envHost) {
  if (process.env.DB_HOST_LOCAL) return process.env.DB_HOST_LOCAL;
  const dockerServiceNames = new Set([
    "postgres", "postgresql", "db", "mysql", "mariadb", "mongo", "mongodb",
  ]);
  if (dockerServiceNames.has(envHost.toLowerCase())) {
    console.warn(`  NOTE: DB_HOST=${envHost} looks like a Docker service name.`);
    console.warn(`        Falling back to 127.0.0.1 (host port mapping).`);
    console.warn(`        Override with DB_HOST_LOCAL=<host> if needed.\n`);
    return "127.0.0.1";
  }
  return envHost;
}

const dbConfig = {
  host: resolveDbHost(requireEnv("DB_HOST")),
  port: Number(process.env.DB_PORT ?? 5432),
  database: requireEnv("DB_DATABASE"),
  user: requireEnv("DB_USERNAME"),
  password: requireEnv("DB_PASSWORD"),
  sslmode: process.env.DB_SSLMODE === "require" ? "require" : "disable",
};

// ── DB queries ────────────────────────────────────────────────────────────

const SQL = {
  // Test users: timestamped test-{n}@example.com addresses
  // Uses parameterised regex via ~ operator with $1.
  selectTestUsers: `
    SELECT id, name, email, created_at, updated_at, last_seen_at
    FROM users
    WHERE deleted_at IS NULL
      AND email ~ $1
    ORDER BY created_at ASC
  `,

  // Test workspaces: name = 'Test Workspace' with no recent activity
  // (or never had activity). Includes --include-recent override.
  selectTestWorkspaces: `
    SELECT
      w.id,
      w.name,
      w.slug,
      w.created_at,
      w.updated_at,
      GREATEST(
        w.updated_at,
        COALESCE(
          (SELECT MAX(joined_at) FROM workspace_members WHERE workspace_id = w.id),
          w.created_at
        )
      ) AS last_activity_at,
      COALESCE(
        (SELECT MAX(joined_at) FROM workspace_members WHERE workspace_id = w.id),
        w.updated_at
      ) AS member_last_seen
    FROM workspaces w
    WHERE w.deleted_at IS NULL
      AND w.name = $1
      AND (
        $2::boolean = true
        OR GREATEST(
          w.updated_at,
          COALESCE(
            (SELECT MAX(joined_at) FROM workspace_members WHERE workspace_id = w.id),
            w.created_at
          )
        ) < (NOW() - ($3 || ' days')::interval)
        OR w.updated_at IS NULL
      )
    ORDER BY w.created_at ASC
  `,

  softDeleteUsers: `
    UPDATE users
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = ANY($1::uuid[])
      AND deleted_at IS NULL
    RETURNING id
  `,

  softDeleteWorkspaces: `
    UPDATE workspaces
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = ANY($1::uuid[])
      AND deleted_at IS NULL
    RETURNING id
  `,

  countDeleted: `
    SELECT
      (SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL AND email ~ $1) AS deleted_users,
      (SELECT COUNT(*) FROM workspaces WHERE deleted_at IS NOT NULL AND name = $2) AS deleted_workspaces
  `,
};

// ── Safety: protected email check ────────────────────────────────────────

function isProtectedEmail(email) {
  const lower = email.toLowerCase();
  for (const suffix of PROTECTED_EMAIL_SUFFIXES) {
    if (lower.endsWith(suffix)) return true;
  }
  return false;
}

// ── Reporting helpers ────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return "(never)";
  const iso = d instanceof Date ? d.toISOString() : String(d);
  return iso.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

function daysSince(d) {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function printSection(title, rows, columns) {
  console.log("");
  console.log(`─── ${title} (${rows.length}) ───`);
  if (rows.length === 0) {
    console.log("  (none)");
    return;
  }
  for (const row of rows) {
    const parts = columns.map((c) => `${c.label}: ${c.value(row)}`);
    console.log(`  • ${parts.join(" | ")}`);
  }
}

// ── Main flow ────────────────────────────────────────────────────────────

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     Aquerii — Test Data Cleanup                         ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Mode:          ${FLAGS.execute ? "EXECUTE (will soft-delete)" : "DRY-RUN (read-only)"}`);
  console.log(`  DB target:     ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`  Test pattern:  email ~ /^test-\\d+@example\\.com$/`);
  console.log(`  Workspace:     name = '${TEST_WORKSPACE_NAME}' AND stale >= ${STALE_DAYS}d`);
  console.log(`  Include recent:${FLAGS.includeRecent ? " YES (bypassing 30d filter)" : " no"}`);
  console.log("");

  const client = new pg.Client(dbConfig);
  await client.connect();

  try {
    // 1. Test users
    const { rows: users } = await client.query(SQL.selectTestUsers, [
      TEST_USER_EMAIL_REGEX.source,
    ]);

    // Defensive: filter out any protected emails (shouldn't match, but be safe)
    const safeUsers = users.filter((u) => !isProtectedEmail(u.email));
    const blocked = users.length - safeUsers.length;
    if (blocked > 0) {
      console.warn(`  WARNING: ${blocked} candidate(s) matched the test pattern but were filtered out as protected emails.`);
    }

    printSection(
      "Test users (test-{n}@example.com)",
      safeUsers,
      [
        { label: "id", value: (r) => r.id },
        { label: "name", value: (r) => r.name },
        { label: "email", value: (r) => r.email },
        { label: "created", value: (r) => formatDate(r.created_at) },
        { label: "last_seen", value: (r) => (r.last_seen_at ? formatDate(r.last_seen_at) : "(never)") },
      ]
    );

    // 2. Test workspaces
    const { rows: workspaces } = await client.query(SQL.selectTestWorkspaces, [
      TEST_WORKSPACE_NAME,
      FLAGS.includeRecent,
      String(STALE_DAYS),
    ]);

    printSection(
      `Test workspaces (name='${TEST_WORKSPACE_NAME}', stale >= ${STALE_DAYS}d)`,
      workspaces,
      [
        { label: "id", value: (r) => r.id },
        { label: "slug", value: (r) => r.slug || "(no slug)" },
        { label: "created", value: (r) => formatDate(r.created_at) },
        { label: "last_activity", value: (r) => formatDate(r.last_activity_at) },
        { label: "days_idle", value: (r) => {
          const d = daysSince(r.last_activity_at);
          return d == null ? "?" : String(d);
        }},
      ]
    );

    // 3. Summary
    console.log("");
    console.log(`  Summary: ${safeUsers.length} test user(s), ${workspaces.length} test workspace(es) match.`);
    console.log("");

    if (!FLAGS.execute) {
      console.log("  ℹ  Dry-run only. Re-run with --execute to soft-delete.");
      return;
    }

    if (safeUsers.length === 0 && workspaces.length === 0) {
      console.log("  Nothing to clean. Done.");
      return;
    }

    // 4. Confirmation prompt
    if (!FLAGS.yes) {
      const rl = createInterface({ input, output });
      try {
        const answer = await rl.question(
          `  Soft-delete ${safeUsers.length} user(s) and ${workspaces.length} workspace(s)? [y/N] `
        );
        if (!/^y(es)?$/i.test(answer.trim())) {
          console.log("  Aborted.");
          return;
        }
      } finally {
        rl.close();
      }
    }

    // 5. Soft-delete
    const t0 = Date.now();
    if (safeUsers.length > 0) {
      const userIds = safeUsers.map((u) => u.id);
      const { rows: deletedUsers } = await client.query(SQL.softDeleteUsers, [userIds]);
      console.log(`  ✓ Soft-deleted ${deletedUsers.length} user(s)`);
    }
    if (workspaces.length > 0) {
      const wsIds = workspaces.map((w) => w.id);
      const { rows: deletedWs } = await client.query(SQL.softDeleteWorkspaces, [wsIds]);
      console.log(`  ✓ Soft-deleted ${deletedWs.length} workspace(s)`);
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`  Done in ${elapsed}s.`);
  } catch (err) {
    console.error("  ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
