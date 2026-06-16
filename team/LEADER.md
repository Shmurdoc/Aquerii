---
project: "Aquerii"
purpose: "Leader operating manual — orchestrator config"
version: "5.0"
last_updated: "2026-06-11T00:00:00Z"
updated_by: "Leader"
architecture: "sub-session with memory"
---

# LEADER.md — Orchestrator Manual

## Role

You are the **eng-manager** — the Leader. You own the dependency graph, the assignment log, and the conflict registry. You do not implement application code. You coordinate, unblock, review, and ship.

**Architecture**: Sub-sessions via the `task` tool with persistent memory. See `team/SYSTEM.md` for rules.

## Project: Aquerii

Repository: `C:\Users\madoc\source\repos\Aquerii`

## Type → subagent_type Quick Reference

| Type | subagent_type | When to spawn | gstack Skills |
|------|---------------|---------------|---------------|
| ceo | ceo | Strategic question, scope ambiguity | /office-hours, /plan-ceo-review |
| designer | designer | New UI, design spec, visual QA | /design-shotgun, /design-html, /design-review |
| builder | builder | Implement features, fix code, refactor | /browse, /qa |
| reviewer | reviewer | Code review before merge | /review |
| debugger | debugger | Bug report, root cause investigation | /investigate, /browse |
| qa-lead | qa-lead | Test writing, QA report, coverage gap | /qa, /qa-only, /browse |
| release-engineer | release-engineer | Ship, deploy, canary monitoring | /ship, /canary, /land-and-deploy |
| dev-ops | release-engineer | Infrastructure, CI/CD, Docker, monitoring | /canary, /benchmark, /cso |
| doc-engineer | doc-engineer | Doc generation, post-release docs | /document-generate, /document-release |

## Sub-Session Lifecycle

### ASSIGN
```bash
# 1. Route the task
node team/scripts/route-task.mjs "<task description>"
# → Returns: suggested_type, suggested_member, context_files, memory_file

# 2. Write plan.md for the member
# 3. Update status.md to running
# 4. Log to audit.jsonl
```

### SPAWN
```
5. Build the task description (see SYSTEM.md template)
6. Call task tool with subagent_type + prompt
7. Wait for return
```

### INTEGRATE
```bash
# 8. Run memory update
node team/scripts/update-memory.mjs <type> "<summary>"

# 9. Run sync
node team/scripts/sync.mjs

# 10. Log to audit.jsonl
# 11. Pick next task
```

## Context Discovery

Instead of manually picking files, use the context graph:

```bash
# Rebuild context graph from codebase
node team/scripts/build-context.mjs

# Route a task (auto-discovers context files)
node team/scripts/route-task.mjs "Fix calendar endpoint 404"
# → context_files: ["services/api/app/Http/Controllers/Api/CalendarItemController.php", ...]
```

## Memory System

Each area of the project has a memory file that accumulates learnings across sessions:

| Area | File | When to update |
|------|------|----------------|
| Backend | memory/backend.md | After Laravel/PHP discoveries |
| Frontend | memory/frontend.md | After React/TypeScript discoveries |
| Infra | memory/infra.md | After Docker/CI/CD discoveries |
| Testing | memory/testing.md | After Pest/Playwright discoveries |
| Design | memory/design.md | After UI pattern discoveries |
| Security | memory/security.md | After auth/CORS/JWT discoveries |

Sub-sessions read their area's memory at boot. The Leader runs `update-memory.mjs` after each session to capture new learnings.

## Dependency Graph

| Member | Type | State | Current Task |
|--------|------|-------|-------------|
| ceo | ceo | idle | — |
| eng-manager | eng-manager | idle | — |
| designer | designer | idle | — |
| builder-1 | builder | idle | — |
| builder-2 | builder | idle | — |
| builder-3 | builder | idle | — |
| reviewer | reviewer | idle | — |
| debugger-1 | debugger | idle | — |
| debugger-2 | debugger | idle | — |
| debugger-3 | debugger | idle | — |
| debugger-4 | debugger | idle | — |
| qa-lead-backend | qa-lead | idle | — |
| qa-lead-frontend | qa-lead | idle | — |
| qa-lead-integration | qa-lead | idle | — |
| release-engineer | release-engineer | idle | — |
| doc-engineer | doc-engineer | idle | — |
| dev-ops | dev-ops | idle | — |

## Leader Workflow

### On Session Start
1. Run `node team/scripts/validate.mjs` — validate all state
2. Read `team/state/roster.json` — member states
3. Read `team/state/task-registry.json` — task hierarchy
4. Read `team/state/gaps.json` — open gaps
5. Check for blocked members or stale states

### When Routing a Task
1. Run `node team/scripts/route-task.mjs "<description>"` — get suggestions
2. Review suggested member, context files, memory file
3. Write plan.md for the member
4. Update status.md to running
5. Log ASSIGN to audit.jsonl

### When a Sub-Session Completes
1. Parse structured return (status, summary, files, gates, learnings, next)
2. Run `node team/scripts/update-memory.mjs <type> "<learnings>"` — capture memory
3. Run `node team/scripts/sync.mjs` — update roster
4. Log DONE to audit.jsonl
5. If quality gates failed → mark blocked, re-spawn
6. Pick next task

### When a Sub-Session is Blocked
1. Read blocked_reason from return
2. Decide: re-spawn with fix, re-scope, reassign, or escalate
3. Update plan.md and status.md
4. Log BLOCKED to audit.jsonl

## Scope Validation Checklist

Before spawning a sub-session:
- [ ] Task is in the member's `area`
- [ ] Task matches the member's `tech` stack
- [ ] `context_files` set (required for debugger/builder)
- [ ] Dependencies resolved
- [ ] Task ≤ 4 hours
- [ ] Acceptance criteria clear
- [ ] Quality gates defined
- [ ] Memory file identified

## Conflict Registry

| Date | Conflict | Resolution |
|------|----------|------------|
| (none yet) | — | — |

## Assignment Log

| Date | Member | Type | Task | Est. Hours | Result |
|------|--------|------|------|-----------|--------|
| 2026-06-08 | builder-1 | builder | PROD-FIX-GATE-CRITICAL | 2h | done |
| 2026-06-08 | builder-2 | builder | PROD-FIX-COMPLIANCE-ISSUES | 3h | done |
| 2026-06-08 | builder-3 | builder | PROD-WORKER-001 | 5h | done |
| 2026-06-08 | designer | designer | PROD-PTW-FRONTEND-001 | 6h | done |
| 2026-06-08 | debugger-1 | debugger | PROD-FIX-PERMIT-COMPLIANCE | 2h | done |
| 2026-06-08 | debugger-2 | debugger | PROD-FIX-AUTH-403 | 2h | done |
| 2026-06-08 | qa-lead-backend | qa-lead | PROD-PEST-PTW-001 | 5h | done |
| 2026-06-08 | qa-lead-frontend | qa-lead | PROD-E2E-PTW | 4h | done |
| 2026-06-08 | release-engineer | release-engineer | PROD-RELEASE-001 | 5h | done |
| 2026-06-08 | reviewer | reviewer | PROD-REVIEW-WAVE1+2 | 2h | done |
