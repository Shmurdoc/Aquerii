---
version: 3.0
last_updated: 2026-06-04T00:00:00Z
---

# Team Coordination System

## How This System Works

You are a Member agent in a coordinated team. You MUST read this file before doing any work. Ignoring this file means you will conflict with other agents and break the project.

## Your Identity

- You have a `member_id` (e.g., `member-01`)
- You have a defined area of responsibility listed below
- You MUST NOT work outside your area without Leader approval
- Some members are **Senior Leads** who also review other members' work

## Session Bootstrap (Do These 5 Steps First)

1. Read `team/SYSTEM.md` (this file) — understand the coordination rules
2. Read `team/Leader.md` — see the full dependency graph and all assignments
3. Read your own `team/members/<your-id>/plan.md` — know your current task
4. Read your own `team/members/<your-id>/instruction.md` — know your constraints
5. Read your own `team/members/<your-id>/status.md` and `wait.md` — know your state

**THEN**: If `lock: true` AND `wait.md` empty → set `state: running` → begin work.
If `lock: false` OR `wait.md` non-empty → idle, wait for Leader signal.

## Core Rules

1. **Never start work** unless your `status.md` has `lock: true`
2. **Never start work** if your `wait.md` lists any members not in `state: done`
3. **Update `last_heartbeat`** in `status.md` every 15 minutes while working
4. **Commit atomically** — one logical change per commit, prefixed with your ID
5. **Never edit files outside your area** without explicit Leader permission
6. **Log decisions** — append significant choices to `team/audit.log`

## File Ownership

| Member | Role | Owns (Write) | Reads (From) |
|--------|------|-------------|-------------|
| member-01 | Core API | `services/api/app/Core/`, `services/api/routes/`, `services/api/database/` | member-07, member-08 (reviews) |
| member-02 | Dev A: Features | `services/api/app/Modules/` (meetings, reports, email, documents, marketing, support, settings, automation) | member-01 (contracts), member-07 (review) |
| member-03 | Dev B: Features | `services/api/app/Modules/` (meetings, reports, email, documents, marketing, support, settings, automation) | member-01 (contracts), member-08 (review) |
| member-04 | QA / Integration | `services/tests/`, test configs | all (for testing) |
| member-05 | DevOps / CI | `infra/`, `.github/`, `**/Dockerfile` | all (for CI/CD) |
| member-06 | Design | `docs/frontend-design/`, CSS themes, component specs | member-02 (implementation feedback) |
| member-07 | Lead: CRM+ERP | `services/api/app/Modules/CRM/`, `services/api/app/Modules/ERP/` | member-01 (contracts), member-02 (code) |
| member-08 | Lead: Billing+Inv | `services/api/app/Modules/Billing/`, `services/api/app/Modules/Inventory/` | member-01 (contracts), member-03 (code) |

## Conflict Prevention

- If you need to edit a file owned by another member, write a request in your `status.md` Notes field and notify the Leader
- The Leader will coordinate shared file access via the Conflict Registry in `Leader.md`
- If two members must edit the same file, the Leader assigns sequential order
- **Never** create `.filelock` files — use the Leader's coordination instead

## Git Conventions

- **Branch**: `feature/member-XX/short-description`
- **Commit prefix**: `[member-XX] description`
- **PR title**: `[member-XX] Short description`
- **PR body** must include: `Depends on: member-YY (if any)` and `Reviewed by: member-ZZ (if lead review required)`

## Quality Gates (Before Marking `state: done`)

| Member | Must Pass |
|--------|----------|
| member-01 | `php artisan test` + `vendor/bin/phpstan analyse` (level 5) + lead review from member-07 or member-08 |
| member-02 | `php artisan test` + `vendor/bin/phpstan analyse` (level 5) + lead review from member-07 |
| member-03 | `php artisan test` + `vendor/bin/phpstan analyse` (level 5) + lead review from member-08 |
| member-04 | All service tests green + Playwright critical paths + k6 smoke test |
| member-05 | Docker build success + CI pipeline green + Helm lint |
| member-06 | Lighthouse score > 90 + WCAG 2.1 AA audit |
| member-07 | `php artisan test` + `vendor/bin/phpstan analyse` (level 5) + Leader sign-off |
| member-08 | `php artisan test` + `vendor/bin/phpstan analyse` (level 5) + Leader sign-off |

## Guardrails

### 1. Contract-First Rule
Every feature that other members depend on must start with a **contract** (OpenAPI spec, JSON schema, or interface file) committed to the repo. Leader only unlocks implementation when contract exists and is approved.

### 2. Small Bounded Tasks
Limit plans to **one deliverable per assignment** and cap estimated work at **8 hours maximum**. Large scopes must be split before unlocking.

### 3. Test and Artifact Requirement
PRs must include unit tests and at least one integration test or mock harness for the contract. Member cannot mark `state: done` without passing CI.

### 4. Review Gates and Senior Signoff
For critical modules (CRM, ERP, Billing, Core API), require **lead review** (member-07 or member-08) before merging. Leader enforces this by requiring `review_required: true` in plan frontmatter.

### 5. Artifact References and Provenance
Every `plan.md` must include `artifact_refs` (file paths, spec IDs, or PR numbers). Members must reference these in status updates to avoid hallucinated outputs.

### 6. Timeboxing and Heartbeat
Members update `last_heartbeat` every 15 minutes. If no heartbeat and no status change within 30 minutes, Leader marks `blocked` and triggers escalation.

### 7. Scope Validation Step
Before unlocking, Leader runs a **scope check**: is the task atomic, does it have a contract, tests, and acceptance criteria? If not, reject and require refinement.

### 8. CI as Truth
Use CI pass/fail as the canonical verification. Status transitions to `done` only after CI success and required reviews.

### 9. Immutable Audit Trail
All Leader actions append to `team/audit.log` with timestamp, action, and rationale. This prevents silent reassignments and helps debugging.

## Escalation Path

1. **Blocked < 30 min**: Wait, it may resolve naturally
2. **Blocked > 30 min**: Write `state: blocked` + reason in `status.md`
3. **Leader responds within 1 hour**: Leader unblocks or reassigns
4. **Leader unresponsive > 2 hours**: Proceed with best judgment, document decision in `team/audit.log`

## Communication

- All coordination happens via files in `team/`
- Do NOT use external channels (Slack, email) for coordination
- Log major decisions to `team/audit.log` with format: `[ISO timestamp] EVENT: description`

## Heartbeat Protocol

While actively working, update `last_heartbeat` in your `status.md` every 15 minutes. The Leader scans heartbeats and marks stale agents as `blocked`. If you pause work (lunch, break), set `state: blocked` with reason `pause` so the Leader knows you're intentionally idle.

## Skill Loading Protocol

After reading team files, load only the GStack skills relevant to your role. **Never load more than 3 skills per session** to conserve tokens.

### Per-Member Skill Map

| Member | Skills to Load | MCP Servers | Purpose |
|--------|---------------|-------------|---------|
| member-01 | `/review`, `/health` | filesystem, github, postgresql | Code review + quality scoring |
| member-02 | `/review`, `/health` | filesystem, github, postgresql | Code review + quality scoring |
| member-03 | `/review`, `/health` | filesystem, github, postgresql | Code review + quality scoring |
| member-04 | `/browse`, `/qa`, `/investigate` | filesystem, github, playwright | Browser QA + test automation + debugging |
| member-05 | `/ship`, `/canary` | filesystem, github | Deployment + canary monitoring |
| member-06 | `/design-review`, `/browse` | filesystem | Visual QA + screenshots |
| member-07 | `/review`, `/health`, `/investigate` | filesystem, github, postgresql | Senior review + debugging |
| member-08 | `/review`, `/health`, `/investigate` | filesystem, github, postgresql | Senior review + debugging |

### Loading Order

1. Read team files (SYSTEM.md, Leader.md, your plan/instruction/status/wait) — **always first**
2. Load your GStack skills — **only after team files are read**
3. Begin work

### Tool Usage During Work

- **Before committing**: run `/health` on changed files to get quality score
- **Before marking done**: run `/review` to catch logic errors
- **When debugging**: run `/investigate` for root cause analysis
- **member-04**: use `/browse` for Playwright-style browser testing, `/qa` for systematic test execution
- **member-05**: use `/ship` for deployment, `/canary` for post-deploy monitoring
- **member-06**: use `/design-review` for visual QA, `/browse` for screenshots

### Prerequisites

- `/browse` and `/canary` require the GStack browser daemon to be running
- If a skill fails to load, proceed without it and note the limitation in your status.md
- Never block on a missing skill — the team files are the source of truth, not the tools

## Parallel vs Sequential Heuristic

- **If coupling is low** (modules have clear contracts, no shared mutable state): **parallelize** across members
- **If coupling is medium** (shared models, frequent API changes): **parallelize with strict contract-first + lead review**
- **If coupling is high** (one output is direct input to next stage): **sequence** or split into micro-deliverables

### Quick Checklist Before Parallelizing

1. Is there a contract/spec?
2. Are acceptance criteria and tests defined?
3. Can the work be validated independently?
4. Is a lead assigned for review?

If any answer is **no**, do not parallelize — refine first.
