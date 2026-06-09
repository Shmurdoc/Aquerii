#!/usr/bin/env node

/**
 * Team File Format Validator
 *
 * Validates all team/ files against the coordination rules.
 * Returns exit code 0 if valid, 1 if violations found.
 *
 * Usage:
 *   node team/scripts/validate.mjs              # Validate all files
 *   node team/scripts/validate.mjs --strict     # Strict mode (warnings = errors)
 *   node team/scripts/validate.mjs --fix        # Auto-fix fixable issues
 *   node team/scripts/validate.mjs --member XX  # Validate single member
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";

const TEAM_DIR = resolve(import.meta.dirname, "..");
const MEMBERS_DIR = join(TEAM_DIR, "members");
const AUDIT_LOG = join(TEAM_DIR, "audit.log");

const VALID_STATES = ["idle", "running", "blocked", "done", "failed"];
const VALID_MEMBERS = [
  "member-01", "member-02", "member-03", "member-04",
  "member-05", "member-06", "member-07", "member-08",
];

const [,, ...args] = process.argv;
const strict = args.includes("--strict");
const fix = args.includes("--fix");
const memberFilter = args.includes("--member") ? args[args.indexOf("--member") + 1] : null;

let errors = 0;
let warnings = 0;
let fixed = 0;

// ── Helpers ──────────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toISOString();
}

function auditLog(message) {
  appendFileSync(AUDIT_LOG, `[${timestamp()}] VALIDATOR: ${message}\n`);
}

function error(file, msg) {
  errors++;
  console.error(`  ERROR: ${msg}`);
  console.error(`         file: ${file}`);
}

function warn(file, msg) {
  warnings++;
  if (strict) errors++;
  console.warn(`  WARN:  ${msg}`);
  console.warn(`         file: ${file}`);
}

function info(msg) {
  console.log(`  OK:    ${msg}`);
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

// ── Validators ───────────────────────────────────────────────────────────

function validatePlan(memberId, data) {
  const path = join(MEMBERS_DIR, memberId, "plan.md");
  console.log(`\nValidating ${memberId}/plan.md`);

  if (!data.hasFrontmatter) {
    error(path, "Missing YAML frontmatter");
    return;
  }

  const required = ["member_id", "owner", "area", "priority", "created_at", "updated_by"];
  for (const field of required) {
    if (!data.frontmatter[field]) {
      error(path, `Missing required field: ${field}`);
    }
  }

  if (data.frontmatter.member_id !== memberId) {
    error(path, `member_id mismatch: expected ${memberId}, got ${data.frontmatter.member_id}`);
  }

  if (!["high", "medium", "low"].includes(data.frontmatter.priority)) {
    error(path, `Invalid priority: ${data.frontmatter.priority} (must be high/medium/low)`);
  }

  // Check for Objective in body
  if (!data.body.includes("- Objective:")) {
    warn(path, "Body missing '- Objective:' line");
  }

  // Check for artifact_refs (guardrail #5)
  if (!data.frontmatter.artifact_refs && data.frontmatter.review_required) {
    warn(path, "review_required is true but no artifact_refs defined (guardrail #5)");
  }
}

function validateInstruction(memberId, data) {
  const path = join(MEMBERS_DIR, memberId, "instruction.md");
  console.log(`\nValidating ${memberId}/instruction.md`);

  if (!data.hasFrontmatter) {
    error(path, "Missing YAML frontmatter");
    return;
  }

  if (!data.frontmatter.member_id) {
    error(path, "Missing required field: member_id");
  }

  if (data.frontmatter.member_id !== memberId) {
    error(path, `member_id mismatch: expected ${memberId}, got ${data.frontmatter.member_id}`);
  }

  // Check for SYSTEM.md reference
  if (!data.body.includes("SYSTEM.md")) {
    warn(path, "Instruction does not reference SYSTEM.md (bootstrap required)");
  }

  // Check for branch naming convention
  if (!data.body.includes("feature/member-")) {
    warn(path, "Instruction missing branch naming convention");
  }
}

function validateStatus(memberId, data) {
  const path = join(MEMBERS_DIR, memberId, "status.md");
  console.log(`\nValidating ${memberId}/status.md`);

  if (!data.hasFrontmatter) {
    error(path, "Missing YAML frontmatter");
    return;
  }

  const required = ["member_id", "state", "lock", "started_at", "completed_at", "last_heartbeat", "updated_by"];
  for (const field of required) {
    if (data.frontmatter[field] === undefined) {
      error(path, `Missing required field: ${field}`);
    }
  }

  if (data.frontmatter.member_id !== memberId) {
    error(path, `member_id mismatch: expected ${memberId}, got ${data.frontmatter.member_id}`);
  }

  if (!VALID_STATES.includes(data.frontmatter.state)) {
    error(path, `Invalid state: ${data.frontmatter.state} (must be one of: ${VALID_STATES.join(", ")})`);
  }

  if (typeof data.frontmatter.lock !== "boolean") {
    error(path, `lock must be boolean (true/false), got: ${data.frontmatter.lock}`);
  }

  // State/lock consistency
  if (data.frontmatter.state === "running" && !data.frontmatter.lock) {
    error(path, "state is running but lock is false (inconsistent)");
  }

  if (data.frontmatter.state === "idle" && data.frontmatter.lock) {
    error(path, "state is idle but lock is true (inconsistent)");
  }

  if (data.frontmatter.state === "done" && data.frontmatter.lock) {
    error(path, "state is done but lock is true (should be false)");
  }

  // Blocked must have reason
  if (data.frontmatter.state === "blocked" && !data.frontmatter.blocked_reason) {
    warn(path, "state is blocked but no blocked_reason set");
  }

  // Running must have started_at
  if (data.frontmatter.state === "running" && !data.frontmatter.started_at) {
    error(path, "state is running but started_at is null");
  }

  // Done must have completed_at
  if (data.frontmatter.state === "done" && !data.frontmatter.completed_at) {
    error(path, "state is done but completed_at is null");
  }
}

function validateWait(memberId, data) {
  const path = join(MEMBERS_DIR, memberId, "wait.md");
  console.log(`\nValidating ${memberId}/wait.md`);

  if (!data.hasFrontmatter) {
    error(path, "Missing YAML frontmatter");
    return;
  }

  if (!data.frontmatter.member_id) {
    error(path, "Missing required field: member_id");
  }

  if (data.frontmatter.member_id !== memberId) {
    error(path, `member_id mismatch: expected ${memberId}, got ${data.frontmatter.member_id}`);
  }

  const waitingFor = data.frontmatter.waiting_for;
  if (!Array.isArray(waitingFor)) {
    error(path, `waiting_for must be an array, got: ${typeof waitingFor}`);
    return;
  }

  // Check all referenced members exist
  for (const ref of waitingFor) {
    if (!VALID_MEMBERS.includes(ref)) {
      error(path, `waiting_for references non-existent member: ${ref}`);
    }
  }

  // Check for self-reference
  if (waitingFor.includes(memberId)) {
    error(path, `waiting_for references itself: ${memberId}`);
  }
}

function validateDependencyGraph() {
  console.log("\nValidating dependency graph (Leader.md)");

  const leaderPath = join(TEAM_DIR, "Leader.md");
  if (!existsSync(leaderPath)) {
    error(leaderPath, "Leader.md does not exist");
    return;
  }

  const raw = readFileSync(leaderPath, "utf-8");

  // Extract member IDs from the agents list using regex (handles complex nested YAML)
  const idMatches = raw.match(/id:\s*(member-\d+)/g) || [];
  const registeredIds = idMatches.map(m => m.replace("id:", "").trim());

  if (registeredIds.length === 0) {
    error(leaderPath, "No agents registered in frontmatter");
    return;
  }

  // Check all members are registered
  for (const id of VALID_MEMBERS) {
    if (!registeredIds.includes(id)) {
      error(leaderPath, `Member ${id} not registered in agents list`);
    }
  }

  // Cross-reference wait.md with dependency graph
  for (const id of VALID_MEMBERS) {
    const waitData = readMarkdown(join(MEMBERS_DIR, id, "wait.md"));
    if (!waitData) continue;

    const waitingFor = waitData.frontmatter.waiting_for || [];
    for (const dep of waitingFor) {
      if (!registeredIds.includes(dep)) {
        error(join(MEMBERS_DIR, id, "wait.md"), `Depends on ${dep} which is not in Leader.md agents list`);
      }
    }
  }
}

function validateDashboard() {
  console.log("\nValidating DASHBOARD.md");

  const dashPath = join(TEAM_DIR, "DASHBOARD.md");
  if (!existsSync(dashPath)) {
    error(dashPath, "DASHBOARD.md does not exist");
    return;
  }

  const content = readFileSync(dashPath, "utf-8");

  // Check all members are listed
  for (const id of VALID_MEMBERS) {
    if (!content.includes(id)) {
      error(dashPath, `Member ${id} not listed in dashboard`);
    }
  }
}

function validateGaps() {
  console.log("\nValidating GAPS.md");

  const gapsPath = join(TEAM_DIR, "GAPS.md");
  if (!existsSync(gapsPath)) {
    error(gapsPath, "GAPS.md does not exist");
    return;
  }

  const data = readMarkdown(gapsPath);
  if (!data.hasFrontmatter) {
    error(gapsPath, "Missing YAML frontmatter");
  }
}

// ── Main ─────────────────────────────────────────────────────────────────

console.log("=== Team File Format Validator ===\n");

const members = memberFilter ? [memberFilter] : VALID_MEMBERS;

// Validate each member's files
for (const id of members) {
  const memberDir = join(MEMBERS_DIR, id);
  if (!existsSync(memberDir)) {
    error(memberDir, `Member directory does not exist: ${id}`);
    continue;
  }

  const plan = readMarkdown(join(memberDir, "plan.md"));
  const instruction = readMarkdown(join(memberDir, "instruction.md"));
  const status = readMarkdown(join(memberDir, "status.md"));
  const wait = readMarkdown(join(memberDir, "wait.md"));

  if (!plan) error(join(memberDir, "plan.md"), "File does not exist");
  else validatePlan(id, plan);

  if (!instruction) error(join(memberDir, "instruction.md"), "File does not exist");
  else validateInstruction(id, instruction);

  if (!status) error(join(memberDir, "status.md"), "File does not exist");
  else validateStatus(id, status);

  if (!wait) error(join(memberDir, "wait.md"), "File does not exist");
  else validateWait(id, wait);
}

// Validate system files
validateDependencyGraph();
validateDashboard();
validateGaps();

// Summary
console.log("\n=== Validation Summary ===");
console.log(`  Errors:   ${errors}`);
console.log(`  Warnings: ${warnings}`);
if (fixed > 0) console.log(`  Fixed:    ${fixed}`);

if (errors > 0) {
  console.log("\nFAILED — fix errors before proceeding");
  auditLog(`VALIDATION FAILED — ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
} else if (warnings > 0) {
  console.log("\nPASSED with warnings");
  auditLog(`VALIDATION PASSED with warnings — ${warnings} warning(s)`);
  process.exit(0);
} else {
  console.log("\nPASSED — all files valid");
  auditLog(`VALIDATION PASSED — all files valid`);
  process.exit(0);
}
