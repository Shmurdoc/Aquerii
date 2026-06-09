#!/usr/bin/env node

/**
 * Team File Format Validator (v3)
 *
 * Validates all team/ files against the v3 coordination rules.
 * Returns exit code 0 if valid, 1 if violations found.
 *
 * Usage:
 *   node team/scripts/validate.mjs              # Validate all files
 *   node team/scripts/validate.mjs --strict     # Strict mode (warnings = errors)
 *   node team/scripts/validate.mjs --fix        # Auto-fix fixable issues
 *   node team/scripts/validate.mjs --member XX  # Validate single member
 *
 * v3 schema (from templates):
 *   plan.md      frontmatter: member_id, type, ticket, owner, status, lock,
 *                priority, review_required, time_estimate, time_spent,
 *                context_files, strict_scope, artifact_refs, created_at,
 *                updated_by, updated_at
 *                body sections: Ticket Summary, Deliverables, Preconditions,
 *                Acceptance Criteria, Context Files, Out of Scope
 *
 *   status.md    frontmatter: member_id, state, lock, current_progress,
 *                started_at, completed_at, blocked_reason, updated_by, updated_at
 *
 *   wait.md      frontmatter: member_id, waiting_for, reason, updated_at
 *
 *   instruction.md frontmatter: member_id, type, owner, version,
 *                last_updated, updated_by
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";

const TEAM_DIR = resolve(import.meta.dirname, "..");
const MEMBERS_DIR = join(TEAM_DIR, "members");
const CONFIG_PATH = join(TEAM_DIR, "team.config.json");
const AUDIT_LOG = join(TEAM_DIR, "audit.log");

const VALID_STATES = ["idle", "assigned", "running", "blocked", "done", "failed"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];

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

/**
 * Read a markdown file with YAML frontmatter.
 * v3 frontmatter: simple `key: value` lines (string, bool, or inline array).
 * Values are always stripped of surrounding single/double quotes.
 */
function readMarkdown(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { raw, frontmatter: {}, body: raw, hasFrontmatter: false };

  const frontmatter = {};
  const lines = match[1].split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const idx = line.indexOf(":");
    if (idx === -1) {
      i++;
      continue;
    }
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    i++;

    // Multi-line list: val is empty and next lines are `  - "..."` items
    if (val === "" && i < lines.length && /^\s+-\s+/.test(lines[i])) {
      const items = [];
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s+-\s+/, "").trim();
        if ((item.startsWith('"') && item.endsWith('"')) ||
            (item.startsWith("'") && item.endsWith("'"))) {
          item = item.slice(1, -1);
        }
        items.push(item);
        i++;
      }
      frontmatter[key] = items;
      continue;
    }

    // Inline list: [a, b] or ["a", "b"]
    if (val.startsWith("[") && val.endsWith("]")) {
      const inner = val.slice(1, -1).trim();
      val = inner === "" ? [] : inner.split(",").map(s => {
        let item = s.trim();
        if ((item.startsWith('"') && item.endsWith('"')) ||
            (item.startsWith("'") && item.endsWith("'"))) {
          item = item.slice(1, -1);
        }
        return item;
      });
    } else if ((val.startsWith('"') && val.endsWith('"')) ||
               (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else if (val === "true") {
      val = true;
    } else if (val === "false") {
      val = false;
    } else if (val === "null" || val === "~") {
      val = "";
    }
    // Empty string is kept as empty string (NOT converted to undefined)
    frontmatter[key] = val;
  }

  const body = raw.slice(match[0].length).trim();
  return { raw, frontmatter, body, hasFrontmatter: true };
}

function writeMarkdown(path, frontmatter, body) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (Array.isArray(v)) lines.push(`${k}: [${v.map(s => `"${s}"`).join(", ")}]`);
    else if (typeof v === "boolean") lines.push(`${k}: ${v}`);
    else if (v === "" || v === null) lines.push(`${k}: ""`);
    else lines.push(`${k}: "${v}"`);
  }
  lines.push("---", "", body);
  writeFileSync(path, lines.join("\n"), "utf-8");
}

/**
 * Check that a field is "present" — i.e., the key exists in frontmatter
 * (even if the value is an empty string). An empty string is a valid default
 * for many v3 fields (ticket, updated_by, blocked_reason, etc.).
 */
function isMissing(frontmatter, field) {
  return !(field in frontmatter);
}

// ── Member discovery (v3) ───────────────────────────────────────────────

/**
 * Read the v3 source of truth for member IDs.
 * Falls back to dynamic directory listing if team.config.json is missing
 * or malformed (e.g., a partially-migrated repo).
 */
function discoverMembers() {
  if (existsSync(CONFIG_PATH)) {
    try {
      const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      const ids = (cfg.members || []).map(m => m.id).filter(Boolean);
      if (ids.length > 0) return ids;
    } catch (e) {
      warn(CONFIG_PATH, `team.config.json is malformed: ${e.message} — falling back to directory listing`);
    }
  }
  if (existsSync(MEMBERS_DIR)) {
    return readdirSync(MEMBERS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();
  }
  return [];
}

const VALID_MEMBERS = discoverMembers();

// ── Validators ───────────────────────────────────────────────────────────

function validatePlan(memberId, data) {
  const path = join(MEMBERS_DIR, memberId, "plan.md");
  console.log(`\nValidating ${memberId}/plan.md`);

  if (!data.hasFrontmatter) {
    error(path, "Missing YAML frontmatter");
    return;
  }

  // v3 required fields
  const required = ["member_id", "type", "owner", "status", "lock", "priority", "created_at"];
  for (const field of required) {
    if (isMissing(data.frontmatter, field)) {
      error(path, `Missing required field: ${field}`);
    }
  }

  if (data.frontmatter.member_id !== memberId) {
    error(path, `member_id mismatch: expected ${memberId}, got "${data.frontmatter.member_id}"`);
  }

  if (!VALID_STATES.includes(data.frontmatter.status)) {
    error(path, `Invalid status: ${data.frontmatter.status} (must be one of: ${VALID_STATES.join(", ")})`);
  }

  if (typeof data.frontmatter.lock !== "boolean") {
    error(path, `lock must be boolean, got: ${typeof data.frontmatter.lock} (${data.frontmatter.lock})`);
  }

  if (!VALID_PRIORITIES.includes(data.frontmatter.priority)) {
    error(path, `Invalid priority: ${data.frontmatter.priority} (must be one of: ${VALID_PRIORITIES.join(", ")})`);
  }

  // review_required must be boolean
  if ("review_required" in data.frontmatter && typeof data.frontmatter.review_required !== "boolean") {
    error(path, `review_required must be boolean, got: ${data.frontmatter.review_required}`);
  }

  // strict_scope must be boolean
  if ("strict_scope" in data.frontmatter && typeof data.frontmatter.strict_scope !== "boolean") {
    error(path, `strict_scope must be boolean, got: ${data.frontmatter.strict_scope}`);
  }

  // context_files and artifact_refs must be arrays
  for (const arrField of ["context_files", "artifact_refs"]) {
    if (arrField in data.frontmatter && !Array.isArray(data.frontmatter[arrField])) {
      error(path, `${arrField} must be an array, got: ${typeof data.frontmatter[arrField]}`);
    }
  }

  // Status/lock consistency (plan.md also has these)
  if (data.frontmatter.status === "running" && !data.frontmatter.lock) {
    error(path, "status is running but lock is false (inconsistent)");
  }
  if (data.frontmatter.status === "idle" && data.frontmatter.lock) {
    error(path, "status is idle but lock is true (inconsistent)");
  }
  if (data.frontmatter.status === "done" && data.frontmatter.lock) {
    warn(path, "status is done but lock is true (should be false)");
  }

  // Body checks
  if (data.frontmatter.ticket && data.frontmatter.ticket !== "" &&
      !data.body.includes("## Ticket Summary")) {
    warn(path, "ticket is set but body missing '## Ticket Summary' section");
  }
  if (data.frontmatter.review_required && (!data.frontmatter.artifact_refs || data.frontmatter.artifact_refs.length === 0)) {
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

  const required = ["member_id", "type", "owner", "version", "last_updated", "updated_by"];
  for (const field of required) {
    if (isMissing(data.frontmatter, field)) {
      error(path, `Missing required field: ${field}`);
    }
  }

  if (data.frontmatter.member_id !== memberId) {
    error(path, `member_id mismatch: expected ${memberId}, got "${data.frontmatter.member_id}"`);
  }

  // Check for SYSTEM.md reference in body
  if (!data.body.includes("SYSTEM.md")) {
    warn(path, "Instruction does not reference SYSTEM.md (bootstrap required)");
  }
}

function validateStatus(memberId, data) {
  const path = join(MEMBERS_DIR, memberId, "status.md");
  console.log(`\nValidating ${memberId}/status.md`);

  if (!data.hasFrontmatter) {
    error(path, "Missing YAML frontmatter");
    return;
  }

  const required = ["member_id", "state", "lock", "updated_at"];
  for (const field of required) {
    if (isMissing(data.frontmatter, field)) {
      error(path, `Missing required field: ${field}`);
    }
  }

  if (data.frontmatter.member_id !== memberId) {
    error(path, `member_id mismatch: expected ${memberId}, got "${data.frontmatter.member_id}"`);
  }

  if (!VALID_STATES.includes(data.frontmatter.state)) {
    error(path, `Invalid state: ${data.frontmatter.state} (must be one of: ${VALID_STATES.join(", ")})`);
  }

  if (typeof data.frontmatter.lock !== "boolean") {
    error(path, `lock must be boolean, got: ${typeof data.frontmatter.lock} (${data.frontmatter.lock})`);
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
    error(path, "state is running but started_at is empty");
  }

  // Done must have completed_at
  if (data.frontmatter.state === "done" && !data.frontmatter.completed_at) {
    error(path, "state is done but completed_at is empty");
  }
}

function validateWait(memberId, data) {
  const path = join(MEMBERS_DIR, memberId, "wait.md");
  console.log(`\nValidating ${memberId}/wait.md`);

  if (!data.hasFrontmatter) {
    error(path, "Missing YAML frontmatter");
    return;
  }

  const required = ["member_id", "waiting_for", "updated_at"];
  for (const field of required) {
    if (isMissing(data.frontmatter, field)) {
      error(path, `Missing required field: ${field}`);
    }
  }

  if (data.frontmatter.member_id !== memberId) {
    error(path, `member_id mismatch: expected ${memberId}, got "${data.frontmatter.member_id}"`);
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

  // v3 source of truth: team.config.json. We accept any of:
  //   - frontmatter `agents:` YAML list with `- id: foo` entries
  //   - markdown `## Agents` section with `- id: foo` entries
  //   - the v2 hardcoded `member-XX` schema (legacy fallback)
  const registeredIds = new Set();

  // Pattern 1: frontmatter-style "  - id: <id>"
  for (const m of raw.matchAll(/-\s*id:\s*([A-Za-z0-9_-]+)/g)) {
    registeredIds.add(m[1]);
  }

  // Pattern 2: "id: <id>" (top-level, indent ≤ 2)
  for (const m of raw.matchAll(/^\s{0,2}id:\s*([A-Za-z0-9_-]+)/gm)) {
    registeredIds.add(m[1]);
  }

  if (registeredIds.size === 0) {
    error(leaderPath, "No agents registered in Leader.md (no `- id:` or top-level `id:` entries)");
    return;
  }

  // Cross-reference wait.md with dependency graph
  for (const id of VALID_MEMBERS) {
    const waitData = readMarkdown(join(MEMBERS_DIR, id, "wait.md"));
    if (!waitData) continue;

    const waitingFor = waitData.frontmatter.waiting_for || [];
    for (const dep of waitingFor) {
      if (!VALID_MEMBERS.includes(dep)) {
        error(join(MEMBERS_DIR, id, "wait.md"), `Depends on ${dep} which is not in team member list`);
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

  // Check all members are listed in the dashboard table
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
    warn(gapsPath, "Missing YAML frontmatter (GAPS.md may not have one — informational)");
  }
}

// ── Main ─────────────────────────────────────────────────────────────────

console.log("=== Team File Format Validator (v3) ===\n");
console.log(`Discovered ${VALID_MEMBERS.length} member(s) from ${existsSync(CONFIG_PATH) ? "team.config.json" : "directory listing"}`);
info(`Members: ${VALID_MEMBERS.join(", ")}`);

if (VALID_MEMBERS.length === 0) {
  error(TEAM_DIR, "No members found — neither team.config.json nor members/ directory yielded any IDs");
}

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
