---
project: "Aquerii"
purpose: "System coordination rules for all agents"
version: "4.0"
last_updated: "2026-06-05T00:00:00Z"
updated_by: "Leader"
architecture: "sub-session"
---

# SYSTEM.md — Team Coordination Rules

## Core Principle

This is a **sub-session orchestration system**. The Leader does not implement application code, write tests, debug, design, or ship directly. Every unit of work is delegated to a **sub-session** via the `task` tool with the appropriate `subagent_type`.

**State coordination happens through `team/` files.** Sub-sessions do not see the Leader's full context — they receive a focused task description with their plan, context_files, and expected return format.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ Leader Session (this session)                            │
│  - Reads team/DASHBOARD.md, GAPS.md, plan.md            │
│  - Decides which member to launch next                  │
│  - Invokes the `task` tool with subagent_type          │
│  - Integrates the structured return                     │
│  - Updates state files, audit.log                       │
└─────────────────────────────────────────────────────────┘
                          │
                          │ task tool call:
                          │   subagent_type: "builder" | "debugger" | ...
                          │   prompt: <plan + context_files + return format>
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Sub-Session (fresh context, isolated)                    │
│  - Sees ONLY the task description (no Leader history)   │
│  - Loads its type-specific skills                       │
│  - Reads context_files + own 4 files (strict scope)    │
│  - Runs quality gates                                   │
│  - Updates own status.md to done/blocked                │
│  - Returns structured summary to Leader                 │
└─────────────────────────────────────────────────────────┘
                          │
                          │ return: { status, summary, files, gates, issues, next }
                          │
                          ▼
                  Leader integrates and loops
```

## Sub-Session Type → subagent_type Mapping

| Member type | `subagent_type` | Skill set |
|-------------|-----------------|-----------|
| `ceo` | `ceo` | /office-hours, /plan-ceo-review, /autoplan, /plan-design-review, /plan-devex-review |
| `eng-manager` | `eng-manager` | /plan-eng-review, /plan-tune, /retro, /autoplan, /landing-report |
| `designer` | `designer` | /design-shotgun, /design-consultation, /design-review, /design-html, /plan-design-review |
| `builder` | `builder` | /review, /health, /investigate, /browse |
| `reviewer` | `reviewer` | /review, /health, /design-review |
| `debugger` | `debugger` | /investigate, /review, /browse, /health |
| `qa-lead` | `qa-lead` | /qa, /qa-only, /browse, /investigate, /health |
| `release-engineer` | `release-engineer` | /ship, /land-and-deploy, /canary, /benchmark, /landing-report |
| `doc-engineer` | `doc-engineer` | /document-generate, /document-release, /make-pdf |

## Leader Bootstrap Protocol

### Step 1: Discover
```bash
pwd                       # Confirm repo root
ls team/members/          # See all 16 typed members
cat team/team.config.json # Member registry
```

### Step 2: Read System Context
- Read `team/SYSTEM.md` (this file) — coordination rules
- Read `team/Leader.md` — dependency graph, current assignments
- Read `team/DASHBOARD.md` — live status
- Read `team/GAPS.md` — known gaps
- Read last 50 lines of `team/audit.log` — recent events

### Step 3: Validate
```bash
node team/scripts/validate.mjs
node team/scripts/recover.mjs  # if picking up from a crash
```

### Step 4: Begin Execution Loop
1. Pick the next gap from GAPS.md
2. Write a `plan.md` for the right typed member
3. Update member's `status.md` to `state: running, lock: true`
4. Build the task description (see "Sub-Session Task Description" below)
5. Invoke `task` tool with the right `subagent_type`
6. Wait for the structured return
7. Update DASHBOARD.md, audit.log, and dependent members' wait.md
8. Loop

## Sub-Session Task Description Template

When the Leader invokes the `task` tool, the `prompt` field must include:

```
You are <role> (<member_id>) in the <project> team, launched as a sub-session by the Leader.

## Your Role
<copy the role section from team/members/<id>/instruction.md>

## Your Task (from plan.md)
- **Objective**: <one-line>
- **Ticket**: <id>
- **Priority**: <high|medium|low>
- **Estimated hours**: <n>

### Acceptance Criteria
<checklist from plan.md>

## Strict Scope
You may read ONLY:
- The files in `context_files` below
- Your own 4 files: team/members/<member_id>/{plan,instruction,status,wait}.md
- Nothing else — request scope expansion from Leader if needed

context_files:
- <one per line>

## Quality Gates You Must Pass
<list from plan.md:quality_gates>

## Tools You Can Use
<list of skills for your subagent_type>

## Definition of Done
1. All quality gates pass
2. Update team/members/<id>/status.md → `state: done`
3. Update team/members/<id>/plan.md → mark deliverables complete
4. If you find a bug, add it to team/GAPS.md

## Return Format (REQUIRED)
Your final message MUST be:
- **Status**: done | blocked
- **Summary**: 2-3 sentences
- **Files changed**: list of file paths
- **Quality gates**: pass/fail for each
- **Issues found**: any blockers, design questions, scope concerns
- **Next step**: ready for review | needs more context | found a bug — fix or escalate
```

## Sub-Session Bootstrap Protocol

When a sub-session is launched, it MUST:

### Step 1: Read Identity
- Read `team/SYSTEM.md` (this file) — coordination rules
- Read `team/members/<id>/instruction.md` — role and tools

### Step 2: Read Task
- Read `team/members/<id>/plan.md` — current task
- Read `team/members/<id>/status.md` — your state
- Read `team/members/<id>/wait.md` — dependencies

### Step 3: Announce
```
[BOOT] Member <id> (<type>) online. Task: <plan objective>.
[BOOT] Strict scope: <N> context files.
[BOOT] Skills: <list>
```

### Step 4: Load Skills
Use the Skill tool to load each skill listed in your instruction.md.

### Step 5: Execute
- Read ONLY `context_files` + your own 4 files
- Implement per acceptance criteria
- Run quality gates
- Update status.md and plan.md as you progress

### Step 6: Return
Send the structured return to the Leader. Do NOT keep working after returning.

## Type-Specific Rules

| Type | Sub-Session Behavior |
|------|---------------------|
| `ceo` | Strategic advisor sub-session. Reads `team/`, `docs/strategy/`, project context. Returns a strategy document, not code. |
| `eng-manager` | Planning/coordination sub-session. Returns a plan or recommendation, not code. (Leader is primary eng-manager.) |
| `designer` | UX sub-session. Reads `docs/design/`, `services/web/src/`. Returns design artifacts (specs, mockups, style updates). |
| `builder` | Implementation sub-session. Writes code in `context_files` scope. Runs linter + type check + tests. |
| `reviewer` | Code review sub-session. Reads diff or `context_files`. Returns a review verdict with issues, suggestions, score. |
| `debugger` | Root-cause sub-session. `strict_scope: true` mandatory. Returns root cause, fix, regression test. |
| `qa-lead` | Test sub-session. Writes/runs tests, generates QA report. May read broadly in test directories. |
| `release-engineer` | Ship sub-session. Runs /ship, /land-and-deploy, /canary. Returns ship status. |
| `doc-engineer` | Documentation sub-session. Updates docs, generates new docs. Returns doc updates + build status. |

## Coordination Signals

| Signal | File | Who Sets | Meaning |
|--------|------|----------|---------|
| Wait | `wait.md` | Leader | Block until dependency resolves |
| Lock | `status.md:lock` | Leader | Authorizes work start |
| State | `status.md:state` | Sub-session (done/blocked), Leader (idle/running) | Current state |
| Gap | `GAPS.md` | Anyone | Missing work identified |
| Audit | `audit.log` | Leader (append) | Immutable event log |

## State Machine

```
idle -> running (Leader sets lock=true, state=running, then spawns sub-session)
running -> done (Sub-session completes, sets state=done; Leader clears lock)
running -> blocked (Sub-session reports blocker; Leader sets state=blocked)
blocked -> running (Leader re-spawns with fix)
done -> idle (Leader resets state=idle, plan.md updated for next task)
```

## File Ownership

| File | Who Modifies | Notes |
|------|-------------|-------|
| `team/SYSTEM.md` | Leader | Read-only at runtime |
| `team/Leader.md` | Leader | Config and dependency graph |
| `team/DASHBOARD.md` | Leader | Progress tracking |
| `team/GAPS.md` | Anyone | Gap identification |
| `team/audit.log` | Leader (append) | Immutable event log |
| `team/team.config.json` | Leader / CLI | Member registry |
| `team/members/<id>/plan.md` | Leader (assign) → Sub-session (deliverables) | Task objectives |
| `team/members/<id>/instruction.md` | Generated at init | Read-only at runtime |
| `team/members/<id>/status.md` | Sub-session (state) + Leader (lock) | Current state |
| `team/members/<id>/wait.md` | Leader | Dependencies |

## Quality Gates (per type)

| Type | Quality Gate |
|------|-------------|
| ceo | team validate |
| eng-manager | team validate + project tests |
| designer | design review |
| builder | project tests + linter + type check |
| reviewer | review check |
| debugger | regression test + project tests |
| qa-lead | test coverage + qa report + project tests |
| release-engineer | CI green + canary check + smoke test |
| doc-engineer | docs build + link check |

## Skill Loading Protocol

Every sub-session MUST load its type-specific skills before starting work:

1. Read `team/members/<id>/instruction.md` — find the Tool Recommendations section
2. Use the Skill tool to load each listed skill
3. Follow each skill's workflow for your task
4. Log which skills you loaded in status.md

## Guardrails

1. **Sub-session is the unit of work**: Never do member work inline. Always spawn a sub-session.
2. **Fresh context per sub-session**: Each `task` tool call gets a new context. Members don't accumulate state across runs.
3. **Contract-first**: No implementation starts without committed API contract/spec
4. **Small tasks**: Maximum 4 hours per task, ideally 1-2 hours
5. **Test requirement**: Every implementation includes tests
6. **Strict scope**: Sub-sessions read ONLY `context_files` + their own 4 files
7. **Timeboxing**: Heartbeat every 15 minutes, auto-block at 30min stale
8. **CI-as-truth**: CI passing is the source of truth for "done"
9. **Immutable audit trail**: Every coordination event is logged
10. **Return format mandatory**: Every sub-session returns the structured summary

## Enforcement Tools

| Script | Purpose | When |
|--------|---------|------|
| `validate.mjs` | Validates all team file formats | Before any commit, on Leader bootstrap |
| `enforce.mjs` | Real-time enforcement check | During work sessions |
| `recover.mjs` | Crash recovery protocol | On session start (if previous session crashed) |
| `watcher.mjs` | CLI state operations | Leader state changes (assign, unlock, done, block) |

```bash
node team/scripts/validate.mjs   # validate all files
node team/scripts/enforce.mjs --check  # one-shot enforcement
node team/scripts/recover.mjs    # recover crashed sessions
```
