---
project: "Aquerii"
purpose: "System coordination rules for all agents"
version: "5.0"
last_updated: "2026-06-11T00:00:00Z"
updated_by: "Leader"
architecture: "sub-session with memory"
---

# SYSTEM.md — Team Coordination Rules

## Core Principle

This is a **sub-session orchestration system with persistent memory.** The Leader does not implement application code. Every unit of work is delegated to a **sub-session** via the `task` tool with the appropriate `subagent_type`.

**State coordination happens through `team/state/` files.** Sub-sessions do not see the Leader's full context — they receive a focused task description with their plan, context_files, and expected return format. They also read their area's memory file for accumulated project knowledge.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ Leader Session                                            │
│  - Reads state/roster.json, state/task-registry.json    │
│  - Routes task via route-task.mjs                        │
│  - Spawns sub-session via task tool                      │
│  - Runs update-memory.mjs to capture learnings           │
│  - Runs sync.mjs to update member status                 │
│  - Logs to state/audit.jsonl                             │
└─────────────────────────────────────────────────────────┘
                          │
                          │ task tool call with context_files + memory_file
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Sub-Session (fresh context, persistent memory)           │
│  - Reads memory/<area>.md for accumulated knowledge     │
│  - Reads ONLY context_files + own plan.md + status.md   │
│  - Executes work                                        │
│  - Returns structured summary with learnings            │
└─────────────────────────────────────────────────────────┘
```

## Sub-Session Type → subagent_type Mapping

| Member type | `subagent_type` | gstack Skills |
|-------------|-----------------|---------------|
| ceo | ceo | /office-hours, /plan-ceo-review |
| eng-manager | eng-manager | /plan-eng-review, /investigate |
| designer | designer | /design-shotgun, /design-html, /design-review |
| builder | builder | /browse, /qa |
| reviewer | reviewer | /review |
| debugger | debugger | /investigate, /browse |
| qa-lead | qa-lead | /qa, /qa-only, /browse |
| release-engineer | release-engineer | /ship, /canary, /land-and-deploy |
| dev-ops | release-engineer | /canary, /benchmark, /cso |
| doc-engineer | doc-engineer | /document-generate, /document-release |

## Leader Bootstrap Protocol

### Step 1: Discover
```bash
pwd                        # Confirm repo root
node team/scripts/validate.mjs  # Validate all state files
```

### Step 2: Read System Context
- Read `team/SYSTEM.md` (this file)
- Read `team/LEADER.md` (orchestrator manual)
- Read `team/state/roster.json` (member states)
- Read `team/state/task-registry.json` (task hierarchy)
- Read `team/state/gaps.json` (open gaps)

### Step 3: Route Task
```bash
node team/scripts/route-task.mjs "<task description>"
# Returns: suggested_type, suggested_member, context_files, memory_file
```

### Step 4: Spawn Sub-Session
1. Write `team/members/<id>/plan.md` with task details
2. Update `team/members/<id>/status.md` to running
3. Invoke `task` tool with suggested context_files and memory_file
4. Wait for structured return

### Step 5: Integrate
1. Run `node team/scripts/update-memory.mjs <type> "<summary>"` to capture learnings
2. Run `node team/scripts/sync.mjs` to update roster from status.md
3. Log to `state/audit.jsonl`
4. Pick next task

## Sub-Session Task Description Template

```
You are <role> (<member_id>) in the Aquerii team.

## Your Role
<copy from team/members/<id>/instruction.md>

## Your Task
- **Objective**: <one-line>
- **Ticket**: <id>
- **Priority**: <high|medium|low>

### Acceptance Criteria
<checklist>

## Memory (READ THIS FIRST)
Read team/memory/<area>.md before starting work. This contains accumulated patterns and gotchas from previous sessions.

## Context Files
You may read ONLY these files:
- <list from route-task.mjs>

## Quality Gates
<list>

## Return Format (REQUIRED)
- **Status**: done | blocked
- **Summary**: 2-3 sentences
- **Files changed**: list
- **Quality gates**: pass/fail
- **Learnings**: patterns/gotchas discovered (for memory update)
- **Next step**: ready for review | needs context | found a bug
```

## State Machine

```
idle → running (Leader sets lock=true, state=running)
running → done (Sub-session returns status=done)
running → blocked (Sub-session returns status=blocked)
blocked → running (Leader re-spawns)
done → idle (Leader resets state)
```

## Quality Gates (per type)

| Type | Quality Gate | gstack Skills |
|------|-------------|---------------|
| ceo | team validate | /office-hours, /plan-ceo-review |
| eng-manager | team validate + project tests | /plan-eng-review, /investigate |
| designer | design review | /design-shotgun, /design-html, /design-review |
| builder | project tests + linter + type check | /browse, /qa |
| reviewer | review check | /review |
| debugger | regression test + project tests | /investigate, /browse |
| qa-lead | test coverage + qa report + project tests | /qa, /qa-only, /browse |
| release-engineer | CI green + canary check + smoke test | /ship, /canary, /land-and-deploy |
| dev-ops | CI green + Docker build + smoke test + security scan | /canary, /benchmark, /cso |
| doc-engineer | docs build + link check | /document-generate, /document-release |

## Guardrails

1. **Sub-session is the unit of work**: Never do member work inline
2. **Fresh context per sub-session**: Members don't accumulate state across runs (memory does)
3. **Memory accumulation**: Every sub-session writes learnings to memory files
4. **Contract-first**: No implementation without committed spec
5. **Small tasks**: Maximum 4 hours per task
6. **Test requirement**: Every implementation includes tests
7. **Strict scope**: Sub-sessions read ONLY context_files + memory + own files
8. **CI-as-truth**: CI passing is the source of truth for "done"
9. **Immutable audit trail**: Every event logged to audit.jsonl
10. **Return format mandatory**: Every sub-session returns structured summary with learnings

## Enforcement Tools

| Script | Purpose |
|--------|---------|
| `validate.mjs` | Validates all state/*.json schemas + member consistency |
| `sync.mjs` | Reconciles status.md ↔ roster.json |
| `route-task.mjs` | Auto-routes tasks to members with context discovery |
| `update-memory.mjs` | Extracts learnings from sub-session returns |
| `build-context.mjs` | Scans codebase, builds context/graph.json |

```bash
node team/scripts/validate.mjs     # validate all state
node team/scripts/sync.mjs         # sync member files
node team/scripts/sync.mjs --ingest # ingest member changes
```
