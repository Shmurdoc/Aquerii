#!/usr/bin/env node

/**
 * Team Orchestration Watcher
 *
 * Watches team/members/*/status.md for changes and enforces coordination rules.
 * Provides CLI commands for Leader operations.
 *
 * Usage:
 *   node team/scripts/watcher.mjs watch              # Start file watcher
 *   node team/scripts/watcher.mjs assign <id> <task>  # Assign task to member
 *   node team/scripts/watcher.mjs unlock <id>         # Unlock member (lock: true)
 *   node team/scripts/watcher.mjs done <id>           # Signal member done
 *   node team/scripts/watcher.mjs block <id> <reason> # Mark member blocked
 *   node team/scripts/watcher.mjs status              # Show all member statuses
 *   node team/scripts/watcher.mjs heartbeat           # Check for stale heartbeats
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, watch } from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";

const TEAM_DIR = resolve(import.meta.dirname, "..");
const MEMBERS_DIR = join(TEAM_DIR, "members");
const AUDIT_LOG = join(TEAM_DIR, "audit.log");

// ── Helpers ──────────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toISOString();
}

function auditLog(message) {
  const line = `[${timestamp()}] ${message}\n`;
  appendFileSync(AUDIT_LOG, line);
  process.stdout.write(line);
}

function readMarkdown(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { raw, frontmatter: {}, body: raw };
  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (val === "null") val = null;
    else if (val.startsWith("[") && val.endsWith("]")) {
      val = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/["\[\]]/g, ""));
    }
    frontmatter[key] = val;
  }
  const body = raw.slice(match[0].length).trim();
  return { raw, frontmatter, body };
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

function getMembers() {
  return readdirSync(MEMBERS_DIR)
    .filter((d) => d.startsWith("member-"))
    .sort()
    .map((d) => ({
      id: d,
      dir: join(MEMBERS_DIR, d),
      statusPath: join(MEMBERS_DIR, d, "status.md"),
      planPath: join(MEMBERS_DIR, d, "plan.md"),
      waitPath: join(MEMBERS_DIR, d, "wait.md"),
    }));
}

// ── Commands ─────────────────────────────────────────────────────────────

function cmdAssign(memberId, task) {
  const memberDir = join(MEMBERS_DIR, memberId);
  if (!existsSync(memberDir)) {
    console.error(`Member ${memberId} not found`);
    process.exit(1);
  }

  const statusFile = readMarkdown(join(memberDir, "status.md"));
  if (!statusFile) {
    console.error(`Cannot read status.md for ${memberId}`);
    process.exit(1);
  }

  // Update status
  statusFile.frontmatter.lock = false;
  statusFile.frontmatter.state = "idle";
  statusFile.frontmatter.started_at = null;
  statusFile.frontmatter.completed_at = null;
  statusFile.frontmatter.updated_by = "Leader";
  writeMarkdown(join(memberDir, "status.md"), statusFile.frontmatter, `- Current task: ${task}\n- Notes: Assigned by Leader`);

  auditLog(`ASSIGN: Leader assigned "${task}" to ${memberId}`);
  console.log(`Assigned "${task}" to ${memberId}`);
}

function cmdUnlock(memberId) {
  const statusPath = join(MEMBERS_DIR, memberId, "status.md");
  const statusFile = readMarkdown(statusPath);
  if (!statusFile) {
    console.error(`Cannot read status.md for ${memberId}`);
    process.exit(1);
  }

  statusFile.frontmatter.lock = true;
  statusFile.frontmatter.state = "running";
  statusFile.frontmatter.started_at = timestamp();
  statusFile.frontmatter.updated_by = "Leader";
  writeMarkdown(statusPath, statusFile.frontmatter, statusFile.body);

  auditLog(`UNLOCK: Leader unlocked ${memberId}`);
  console.log(`Unlocked ${memberId}`);
}

function cmdDone(memberId) {
  const statusPath = join(MEMBERS_DIR, memberId, "status.md");
  const statusFile = readMarkdown(statusPath);
  if (!statusFile) {
    console.error(`Cannot read status.md for ${memberId}`);
    process.exit(1);
  }

  statusFile.frontmatter.lock = false;
  statusFile.frontmatter.state = "done";
  statusFile.frontmatter.completed_at = timestamp();
  statusFile.frontmatter.updated_by = "Leader";
  writeMarkdown(statusPath, statusFile.frontmatter, statusFile.body);

  // Clear dependents' wait.md
  const members = getMembers();
  for (const m of members) {
    const waitFile = readMarkdown(m.waitPath);
    if (waitFile && Array.isArray(waitFile.frontmatter.waiting_for)) {
      const filtered = waitFile.frontmatter.waiting_for.filter((id) => id !== memberId);
      if (filtered.length !== waitFile.frontmatter.waiting_for.length) {
        waitFile.frontmatter.waiting_for = filtered;
        waitFile.frontmatter.updated_at = timestamp();
        const body = filtered.length === 0
          ? "- None"
          : filtered.map((id) => `- ${id}`).join("\n");
        writeMarkdown(m.waitPath, waitFile.frontmatter, body);
        auditLog(`UNBLOCK: Cleared ${memberId} from ${m.id} wait list`);
      }
    }
  }

  auditLog(`DONE: ${memberId} completed work`);
  console.log(`Marked ${memberId} as done`);
}

function cmdBlock(memberId, reason) {
  const statusPath = join(MEMBERS_DIR, memberId, "status.md");
  const statusFile = readMarkdown(statusPath);
  if (!statusFile) {
    console.error(`Cannot read status.md for ${memberId}`);
    process.exit(1);
  }

  statusFile.frontmatter.state = "blocked";
  statusFile.frontmatter.blocked_reason = reason || "unspecified";
  statusFile.frontmatter.updated_by = "Leader";
  writeMarkdown(statusPath, statusFile.frontmatter, statusFile.body);

  auditLog(`BLOCK: ${memberId} blocked — ${reason}`);
  console.log(`Blocked ${memberId}: ${reason}`);
}

function cmdStatus() {
  const members = getMembers();
  console.log("\n┌─────────────┬──────────────────────────────┬──────────┬─────────────┐");
  console.log("│ Member      │ Role                         │ State    │ Lock        │");
  console.log("├─────────────┼──────────────────────────────┼──────────┼─────────────┤");
  for (const m of members) {
    const s = readMarkdown(m.statusPath);
    if (!s) continue;
    const id = m.id.padEnd(11);
    const state = (s.frontmatter.state || "unknown").padEnd(8);
    const lock = s.frontmatter.lock ? "true" : "false";
    console.log(`│ ${id} │ (see plan.md)               │ ${state} │ ${lock.padEnd(11)} │`);
  }
  console.log("└─────────────┴──────────────────────────────┴──────────┴─────────────┘\n");
}

function cmdHeartbeat() {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes
  const members = getMembers();
  let staleCount = 0;

  for (const m of members) {
    const s = readMarkdown(m.statusPath);
    if (!s || s.frontmatter.state !== "running") continue;

    const lastBeat = s.frontmatter.last_heartbeat;
    if (!lastBeat) continue;

    const beatTime = new Date(lastBeat).getTime();
    if (now - beatTime > timeout) {
      console.log(`STALE: ${m.id} — last heartbeat ${lastBeat}`);
      staleCount++;
    }
  }

  if (staleCount === 0) console.log("All running members have fresh heartbeats.");
  else console.log(`\n${staleCount} stale heartbeat(s) found.`);
}

function cmdWatch() {
  console.log("Watching team/members/*/status.md for changes...");
  console.log("Press Ctrl+C to stop.\n");

  watch(
    MEMBERS_DIR,
    { recursive: true },
    (eventType, filename) => {
      if (!filename || !filename.endsWith("status.md")) return;
      const memberMatch = filename.match(/(member-\d+)/);
      if (!memberMatch) return;

      const memberId = memberMatch[1];
      const s = readMarkdown(join(MEMBERS_DIR, memberId, "status.md"));
      if (s) {
        console.log(
          `[${timestamp()}] ${memberId} status: state=${s.frontmatter.state} lock=${s.frontmatter.lock}`
        );
      }
    }
  );
}

// ── CLI ──────────────────────────────────────────────────────────────────

const [,, command, ...args] = process.argv;

switch (command) {
  case "assign":
    if (args.length < 2) {
      console.error("Usage: watcher.mjs assign <member-id> <task description>");
      process.exit(1);
    }
    cmdAssign(args[0], args.slice(1).join(" "));
    break;

  case "unlock":
    if (!args[0]) {
      console.error("Usage: watcher.mjs unlock <member-id>");
      process.exit(1);
    }
    cmdUnlock(args[0]);
    break;

  case "done":
    if (!args[0]) {
      console.error("Usage: watcher.mjs done <member-id>");
      process.exit(1);
    }
    cmdDone(args[0]);
    break;

  case "block":
    if (!args[0]) {
      console.error("Usage: watcher.mjs block <member-id> <reason>");
      process.exit(1);
    }
    cmdBlock(args[0], args.slice(1).join(" "));
    break;

  case "status":
    cmdStatus();
    break;

  case "heartbeat":
    cmdHeartbeat();
    break;

  case "watch":
    cmdWatch();
    break;

  default:
    console.log(`
Team Orchestration Watcher v3.0

Commands:
  watch                          Start file watcher (live monitoring)
  assign <id> <task>             Assign task to member
  unlock <id>                    Unlock member (set lock: true)
  done <id>                      Mark member done + clear dependents
  block <id> <reason>            Mark member blocked
  status                         Show all member statuses
  heartbeat                      Check for stale heartbeats

Examples:
  node watcher.mjs assign member-01 "Implement auth contracts"
  node watcher.mjs unlock member-01
  node watcher.mjs done member-01
  node watcher.mjs block member-02 "Waiting for API spec"
  node watcher.mjs status
`);
}
