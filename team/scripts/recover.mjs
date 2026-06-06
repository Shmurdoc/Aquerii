#!/usr/bin/env node

/**
 * Team Crash Recovery Protocol
 *
 * Detects and recovers from crashed sessions by scanning member status files.
 * Identifies members stuck in `running` state with stale heartbeats and
 * resets them to a recoverable state.
 *
 * Usage:
 *   node team/scripts/recover.mjs              # Detect and recover crashed sessions
 *   node team/scripts/recover.mjs --dry-run    # Show what would be recovered
 *   node team/scripts/recover.mjs --force      # Force reset all running members
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";

const TEAM_DIR = resolve(import.meta.dirname, "..");
const MEMBERS_DIR = join(TEAM_DIR, "members");
const AUDIT_LOG = join(TEAM_DIR, "audit.log");
const RECOVER_LOG = join(TEAM_DIR, "recover.log");

const VALID_MEMBERS = [
  "member-01", "member-02", "member-03", "member-04",
  "member-05", "member-06", "member-07", "member-08",
];
const HEARTBEAT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours

const [,, ...args] = process.argv;
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

// ── Helpers ──────────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toISOString();
}

function log(level, message) {
  const line = `[${timestamp()}] [${level}] RECOVERY: ${message}`;
  appendFileSync(RECOVER_LOG, line + "\n");
  console.log(line);
}

function auditLog(message) {
  appendFileSync(AUDIT_LOG, `[${timestamp()}] RECOVERY: ${message}\n`);
}

function readMarkdown(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { raw, frontmatter: {}, body: raw, hasFrontmatter: false };
  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (val === "null" || val === "~") val = null;
    else if (val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1).split(",").map(s => s.trim().replace(/["\[\]]/g, ""));
    }
    frontmatter[key] = val;
  }
  const body = raw.slice(match[0].length).trim();
  return { raw, frontmatter, body, hasFrontmatter: true };
}

function writeMarkdown(path, frontmatter, body) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (Array.isArray(v)) lines.push(`${k}: ${JSON.stringify(v)}`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push("---", "", body);
  writeFileSync(path, lines.join("\n"), "utf-8");
}

// ── Recovery Logic ───────────────────────────────────────────────────────

function detectCrashedSessions() {
  log("INFO", "Scanning for crashed sessions...");
  const crashed = [];

  for (const id of VALID_MEMBERS) {
    const statusPath = join(MEMBERS_DIR, id, "status.md");
    const data = readMarkdown(statusPath);
    if (!data || !data.hasFrontmatter) continue;

    const { state, last_heartbeat, started_at } = data.frontmatter;

    if (state !== "running") continue;

    // Check heartbeat age
    let heartbeatAge = Infinity;
    if (last_heartbeat) {
      heartbeatAge = Date.now() - new Date(last_heartbeat).getTime();
    }

    // Check session age
    let sessionAge = Infinity;
    if (started_at) {
      sessionAge = Date.now() - new Date(started_at).getTime();
    }

    const heartbeatStale = heartbeatAge > HEARTBEAT_TIMEOUT;
    const sessionExpired = sessionAge > SESSION_TIMEOUT;

    if (heartbeatStale || sessionExpired || force) {
      crashed.push({
        id,
        heartbeatAge: Math.round(heartbeatAge / 60000),
        sessionAge: Math.round(sessionAge / 60000),
        reason: heartbeatStale
          ? `Heartbeat stale (${Math.round(heartbeatAge / 60000)}min)`
          : sessionExpired
          ? `Session expired (${Math.round(sessionAge / 60000)}min)`
          : force
          ? "Force reset requested"
          : "Unknown",
      });
    }
  }

  return crashed;
}

function recoverSession(member, dryRun) {
  const statusPath = join(MEMBERS_DIR, member.id, "status.md");
  const data = readMarkdown(statusPath);
  if (!data || !data.hasFrontmatter) {
    log("ERROR", `Cannot read status.md for ${member.id}`);
    return false;
  }

  log("INFO", `${dryRun ? "[DRY RUN] " : ""}Recovering ${member.id}: ${member.reason}`);

  if (dryRun) {
    log("INFO", `  Would set: state=blocked, lock=false, blocked_reason="Session crash — ${member.reason}"`);
    return true;
  }

  // Save previous state for audit
  const previousState = data.frontmatter.state;

  // Reset to blocked state
  data.frontmatter.state = "blocked";
  data.frontmatter.lock = false;
  data.frontmatter.blocked_reason = `Session crash — ${member.reason}`;
  data.frontmatter.updated_by = "Recovery";

  // Add recovery note to body
  const recoveryNote = `\n## Recovery\n- Previous state: ${previousState}\n- Recovery time: ${timestamp()}\n- Reason: ${member.reason}\n- Heartbeat age: ${member.heartbeatAge}min\n- Session age: ${member.sessionAge}min`;
  const newBody = data.body + recoveryNote;

  writeMarkdown(statusPath, data.frontmatter, newBody);

  log("INFO", `  Recovered ${member.id} → blocked`);
  auditLog(`RECOVER: ${member.id} recovered from ${previousState} to blocked — ${member.reason}`);

  return true;
}

function resetPlanForRecovery(memberId) {
  const planPath = join(MEMBERS_DIR, memberId, "plan.md");
  const data = readMarkdown(planPath);
  if (!data || !data.hasFrontmatter) return;

  // Don't clear the plan — Leader needs to review and reassign
  // Just add a note
  log("INFO", `  Plan preserved for ${memberId} — Leader must review and reassign`);
}

function clearWaitForRecovery(memberId) {
  // Don't clear wait.md — dependencies are still valid
  log("INFO", `  Wait list preserved for ${memberId} — dependencies still valid`);
}

// ── Summary Report ───────────────────────────────────────────────────────

function generateReport(crashed, recovered) {
  const report = {
    timestamp: timestamp(),
    scanned: VALID_MEMBERS.length,
    crashed: crashed.length,
    recovered: recovered.length,
    failed: crashed.length - recovered.length,
    details: crashed.map((c, i) => ({
      member: c.id,
      reason: c.reason,
      heartbeatAge: `${c.heartbeatAge}min`,
      sessionAge: `${c.sessionAge}min`,
      recovered: i < recovered.length,
    })),
  };

  return report;
}

// ── Main ─────────────────────────────────────────────────────────────────

console.log("=== Team Crash Recovery Protocol ===\n");

const crashed = detectCrashedSessions();

if (crashed.length === 0) {
  log("INFO", "No crashed sessions detected — all members healthy");
  console.log("\nAll members healthy. No recovery needed.");
  process.exit(0);
}

log("WARN", `Found ${crashed.length} crashed session(s):`);
for (const member of crashed) {
  log("WARN", `  ${member.id}: ${member.reason} (heartbeat: ${member.heartbeatAge}min ago, session: ${member.sessionAge}min old)`);
}

const recovered = [];
for (const member of crashed) {
  const success = recoverSession(member, dryRun);
  if (success) {
    recovered.push(member);
    resetPlanForRecovery(member.id);
    clearWaitForRecovery(member.id);
  }
}

// Generate report
const report = generateReport(crashed, recovered);
console.log("\n=== Recovery Summary ===");
console.log(`  Scanned:    ${report.scanned} members`);
console.log(`  Crashed:    ${report.crashed}`);
console.log(`  Recovered:  ${report.recovered}`);
console.log(`  Failed:     ${report.failed}`);

if (dryRun) {
  console.log("\n[DRY RUN] No changes were made. Run without --dry-run to execute recovery.");
}

auditLog(`RECOVERY COMPLETE — ${recovered.length}/${crashed.length} sessions recovered`);
process.exit(report.failed > 0 ? 1 : 0);
