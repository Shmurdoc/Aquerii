#!/usr/bin/env node

/**
 * Team Enforcement Daemon
 *
 * Watches team/ files for changes and enforces coordination rules in real-time.
 * Validates every mutation against the rule set and rejects invalid changes.
 *
 * Usage:
 *   node team/scripts/enforce.mjs              # Start enforcement daemon
 *   node team/scripts/enforce.mjs --check      # Run one-shot validation
 *   node team/scripts/enforce.mjs --heartbeat  # Check for stale heartbeats only
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, watch, statSync } from "fs";
import { join, resolve } from "path";

const TEAM_DIR = resolve(import.meta.dirname, "..");
const MEMBERS_DIR = join(TEAM_DIR, "members");
const AUDIT_LOG = join(TEAM_DIR, "audit.log");
const ENFORCE_LOG = join(TEAM_DIR, "enforce.log");

const VALID_STATES = ["idle", "running", "blocked", "done", "failed"];
const VALID_MEMBERS = [
  "member-01", "member-02", "member-03", "member-04",
  "member-05", "member-06", "member-07", "member-08",
];
const HEARTBEAT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const FILE_WRITE_DEBOUNCE = 500; // ms to wait after file change before validating

const [,, ...args] = process.argv;
const checkMode = args.includes("--check");
const heartbeatMode = args.includes("--heartbeat");

// ── Helpers ──────────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toISOString();
}

function log(level, message) {
  const line = `[${timestamp()}] [${level}] ${message}`;
  appendFileSync(ENFORCE_LOG, line + "\n");
  if (level === "ERROR" || level === "VIOLATION") {
    console.error(line);
  } else if (level !== "DEBUG") {
    console.log(line);
  }
}

function auditLog(message) {
  appendFileSync(AUDIT_LOG, `[${timestamp()}] ENFORCER: ${message}\n`);
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
      const inner = val.slice(1, -1).trim();
      val = inner === "" ? [] : inner.split(",").map(s => s.trim().replace(/["\[\]]/g, ""));
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

// ── Enforcement Rules ────────────────────────────────────────────────────

const violations = [];

function addViolation(memberId, rule, message, file) {
  violations.push({ memberId, rule, message, file, timestamp: timestamp() });
  log("VIOLATION", `${memberId}: [${rule}] ${message}`);
  auditLog(`VIOLATION: ${memberId} — ${rule}: ${message}`);
}

function enforceStatusRules(memberId) {
  const statusPath = join(MEMBERS_DIR, memberId, "status.md");
  const data = readMarkdown(statusPath);
  if (!data || !data.hasFrontmatter) return;

  const { state, lock, started_at, completed_at, last_heartbeat } = data.frontmatter;

  // Rule: valid state
  if (!VALID_STATES.includes(state)) {
    addViolation(memberId, "INVALID_STATE", `State "${state}" is not valid`, statusPath);
    return;
  }

  // Rule: lock/state consistency
  if (state === "running" && lock !== true) {
    addViolation(memberId, "LOCK_MISMATCH", "State is running but lock is false", statusPath);
  }

  if (state === "idle" && lock === true) {
    addViolation(memberId, "LOCK_MISMATCH", "State is idle but lock is true", statusPath);
  }

  if (state === "done" && lock === true) {
    addViolation(memberId, "LOCK_MISMATCH", "State is done but lock should be false", statusPath);
  }

  // Rule: running must have started_at
  if (state === "running" && !started_at) {
    addViolation(memberId, "MISSING_STARTED_AT", "Running state requires started_at", statusPath);
  }

  // Rule: done must have completed_at
  if (state === "done" && !completed_at) {
    addViolation(memberId, "MISSING_COMPLETED_AT", "Done state requires completed_at", statusPath);
  }

  // Rule: blocked must have reason
  if (state === "blocked" && !data.frontmatter.blocked_reason) {
    addViolation(memberId, "MISSING_BLOCKED_REASON", "Blocked state requires blocked_reason", statusPath);
  }

  // Rule: heartbeat freshness
  if (state === "running" && last_heartbeat) {
    const beatTime = new Date(last_heartbeat).getTime();
    const age = Date.now() - beatTime;
    if (age > HEARTBEAT_TIMEOUT) {
      addViolation(memberId, "STALE_HEARTBEAT", `Last heartbeat ${Math.round(age / 60000)}min ago (threshold: 30min)`, statusPath);
    }
  }
}

function enforceWaitRules(memberId) {
  const waitPath = join(MEMBERS_DIR, memberId, "wait.md");
  const data = readMarkdown(waitPath);
  if (!data || !data.hasFrontmatter) return;

  let waitingFor = data.frontmatter.waiting_for;
  if (!Array.isArray(waitingFor)) {
    addViolation(memberId, "INVALID_WAIT_FORMAT", "waiting_for must be an array", waitPath);
    return;
  }

  // Filter out empty strings
  waitingFor = waitingFor.filter(s => s && s.length > 0);

  // Rule: no self-reference
  if (waitingFor.includes(memberId)) {
    addViolation(memberId, "SELF_REFERENCE", "waiting_for references itself", waitPath);
  }

  // Rule: all referenced members exist
  for (const ref of waitingFor) {
    if (!VALID_MEMBERS.includes(ref)) {
      addViolation(memberId, "INVALID_DEPENDENCY", `References non-existent member: ${ref}`, waitPath);
    }
  }

  // Rule: no circular dependencies (simple check)
  for (const ref of waitingFor) {
    const refWait = readMarkdown(join(MEMBERS_DIR, ref, "wait.md"));
    if (refWait && refWait.frontmatter.waiting_for && refWait.frontmatter.waiting_for.includes(memberId)) {
      addViolation(memberId, "CIRCULAR_DEPENDENCY", `Circular dependency with ${ref}`, waitPath);
    }
  }
}

function enforcePlanRules(memberId) {
  const planPath = join(MEMBERS_DIR, memberId, "plan.md");
  const data = readMarkdown(planPath);
  if (!data || !data.hasFrontmatter) return;

  // Rule: member_id must match
  if (data.frontmatter.member_id !== memberId) {
    addViolation(memberId, "MEMBER_ID_MISMATCH", `plan.md member_id is ${data.frontmatter.member_id}, expected ${memberId}`, planPath);
  }

  // Rule: review_required must have artifact_refs
  if (data.frontmatter.review_required && !data.frontmatter.artifact_refs) {
    addViolation(memberId, "MISSING_ARTIFACT_REFS", "review_required is true but no artifact_refs", planPath);
  }
}

function enforceStateTransition(memberId, oldState, newState) {
  const validTransitions = {
    idle: ["running", "idle"],  // idle -> running, or idle -> idle (reassignment)
    running: ["blocked", "done"],
    blocked: ["running", "idle", "failed"],
    done: ["idle"],  // done -> idle (new assignment)
    failed: ["idle"],
  };

  if (!validTransitions[oldState]?.includes(newState)) {
    addViolation(memberId, "INVALID_TRANSITION", `Cannot transition from ${oldState} to ${newState}`, "");
    return false;
  }
  return true;
}

// ── Heartbeat Check ──────────────────────────────────────────────────────

function checkHeartbeats() {
  log("INFO", "Checking heartbeats...");
  let staleCount = 0;

  for (const id of VALID_MEMBERS) {
    const statusPath = join(MEMBERS_DIR, id, "status.md");
    const data = readMarkdown(statusPath);
    if (!data || !data.hasFrontmatter) continue;

    if (data.frontmatter.state !== "running") continue;

    const lastBeat = data.frontmatter.last_heartbeat;
    if (!lastBeat) {
      addViolation(id, "NO_HEARTBEAT", "Running member has no last_heartbeat", statusPath);
      staleCount++;
      continue;
    }

    const beatTime = new Date(lastBeat).getTime();
    const age = Date.now() - beatTime;

    if (age > HEARTBEAT_TIMEOUT) {
      addViolation(id, "STALE_HEARTBEAT", `Last heartbeat ${Math.round(age / 60000)}min ago`, statusPath);
      staleCount++;

      // Auto-mark as blocked
      data.frontmatter.state = "blocked";
      data.frontmatter.blocked_reason = `Heartbeat stale — last seen ${Math.round(age / 60000)}min ago`;
      data.frontmatter.updated_by = "Enforcer";
      writeMarkdown(statusPath, data.frontmatter, data.body);
      log("INFO", `Auto-blocked ${id} due to stale heartbeat`);
      auditLog(`AUTO-BLOCK: ${id} — stale heartbeat (${Math.round(age / 60000)}min)`);
    }
  }

  if (staleCount === 0) {
    log("INFO", "All heartbeats fresh");
  } else {
    log("WARN", `${staleCount} stale heartbeat(s) found and handled`);
  }

  return staleCount;
}

// ── File Watcher ─────────────────────────────────────────────────────────

function startWatcher() {
  log("INFO", "Starting enforcement daemon...");
  log("INFO", `Watching ${MEMBERS_DIR}`);
  log("INFO", `Heartbeat timeout: ${HEARTBEAT_TIMEOUT / 60000} minutes`);

  // Run initial validation
  for (const id of VALID_MEMBERS) {
    enforceStatusRules(id);
    enforceWaitRules(id);
    enforcePlanRules(id);
  }
  checkHeartbeats();

  if (violations.length > 0) {
    log("WARN", `Initial scan found ${violations.length} violation(s)`);
  } else {
    log("INFO", "Initial scan clean");
  }

  // Watch for changes
  const pending = new Map();

  watch(MEMBERS_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    const memberMatch = filename.match(/(member-\d+)/);
    if (!memberMatch) return;

    const memberId = memberMatch[1];
    const file = filename.split(/[/\\]/).pop();

    // Debounce rapid changes
    if (pending.has(memberId)) {
      clearTimeout(pending.get(memberId));
    }

    pending.set(memberId, setTimeout(() => {
      pending.delete(memberId);
      log("DEBUG", `Change detected: ${memberId}/${file}`);

      enforceStatusRules(memberId);
      enforceWaitRules(memberId);
      enforcePlanRules(memberId);

      // Check if running member changed status without updating heartbeat
      const statusData = readMarkdown(join(MEMBERS_DIR, memberId, "status.md"));
      if (statusData && statusData.frontmatter.state === "running") {
        // Running member should have recent heartbeat
        const lastBeat = statusData.frontmatter.last_heartbeat;
        if (lastBeat) {
          const age = Date.now() - new Date(lastBeat).getTime();
          if (age > HEARTBEAT_TIMEOUT) {
            addViolation(memberId, "STALE_HEARTBEAT", `Running but heartbeat is ${Math.round(age / 60000)}min old`, "");
          }
        }
      }
    }, FILE_WRITE_DEBOUNCE));
  });

  // Periodic heartbeat check (every 5 minutes)
  setInterval(checkHeartbeats, 5 * 60 * 1000);

  log("INFO", "Enforcement daemon running. Press Ctrl+C to stop.");
}

// ── Main ─────────────────────────────────────────────────────────────────

if (heartbeatMode) {
  checkHeartbeats();
  process.exit(violations.length > 0 ? 1 : 0);
} else if (checkMode) {
  for (const id of VALID_MEMBERS) {
    enforceStatusRules(id);
    enforceWaitRules(id);
    enforcePlanRules(id);
  }
  checkHeartbeats();

  if (violations.length > 0) {
    console.log(`\n${violations.length} violation(s) found`);
    process.exit(1);
  } else {
    console.log("\nAll rules enforced — no violations");
    process.exit(0);
  }
} else {
  startWatcher();
}
