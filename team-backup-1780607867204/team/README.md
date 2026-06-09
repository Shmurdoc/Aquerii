# Team Orchestration System

## Quick Start

### To start a Leader session
Paste the contents of `team/LEADER-PROMPT.md` into a new opencode session. The Leader will bootstrap by reading all team files, then begin the execution loop: scan gaps → assign work → unblock members → review → repeat.

### To start a Member session
Every member agent **must** read `team/SYSTEM.md` before doing any work. This README is a reference, not a replacement.

## How It Works

A **Leader** coordinates 8 **Members** using file-based signals. No agent starts work without explicit permission (`lock: true`) and no blocked dependencies (`wait.md` empty).

```
LEADER-PROMPT.md   → Paste this into a new session to start the Leader agent
Leader.md          → Orchestrator config, dependency graph, assignments
SYSTEM.md          → Full rules, guardrails, ownership (READ THIS FIRST)
DASHBOARD.md       → Live progress view
GAPS.md            → Gap tracker (populated by Leader during scans)
audit.log          → Immutable event log
members/
  member-01/       → Core API / Integration
  member-02/       → Developer A: Feature Modules
  member-03/       → Developer B: Feature Modules
  member-04/       → QA / Integration Engineer
  member-05/       → DevOps / CI Automation
  member-06/       → Design Team (Frontend)
  member-07/       → Senior Lead: CRM + ERP
  member-08/       → Senior Lead: Billing + Inventory
scripts/
  watcher.mjs      → Orchestration watcher + CLI commands
```

## Session Bootstrap (Every Agent)

1. Read `team/SYSTEM.md`
2. Read `team/Leader.md`
3. Read your `team/members/<your-id>/plan.md`
4. Read your `team/members/<your-id>/instruction.md`
5. Read your `team/members/<your-id>/status.md` + `wait.md`

**If `lock: true` AND `wait.md` empty → start working.**
**Otherwise → idle, wait for Leader signal.**

## Role Summary

| ID | Role | Owns | Reviews |
|----|------|------|---------|
| member-01 | Core API / Integration | `services/api/app/Core/`, routes, database | by 07, 08 |
| member-02 | Developer A: Features | Modules (meetings, reports, email, etc.) | by 07 |
| member-03 | Developer B: Features | Modules (marketing, support, etc.) | by 08 |
| member-04 | QA / Integration | `services/tests/`, CI test stages | — |
| member-05 | DevOps / CI | `infra/`, `.github/`, Dockerfiles | — |
| member-06 | Design (Frontend) | `docs/frontend-design/`, CSS themes | — |
| member-07 | Senior Lead: CRM+ERP | `Modules/CRM/`, `Modules/ERP/` | by Leader |
| member-08 | Senior Lead: Billing+Inv | `Modules/Billing/`, `Modules/Inventory/` | by Leader |

## Dependency Graph

```
member-01 (Core API)          → no deps
member-07 (Lead CRM+ERP)      → member-01
member-08 (Lead Billing+Inv)  → member-01
member-02 (Dev A: Features)   → member-07
member-03 (Dev B: Features)   → member-08
member-04 (QA/Integration)    → member-01, member-07, member-08
member-05 (DevOps/CI)         → member-01
member-06 (Design)            → no deps
```

## Guardrails (9 Rules)

1. **Contract-first** — No implementation without committed API contract/spec
2. **Small bounded tasks** — Max 8 hours per assignment
3. **Test requirement** — PRs must include unit + integration tests
4. **Lead review gates** — CRM, ERP, Billing, Core API need lead sign-off
5. **Artifact references** — Every plan.md has `artifact_refs`
6. **Timeboxing** — Heartbeat every 15min, escalation at 30min
7. **Scope validation** — Leader checks task atomicity before unlock
8. **CI as truth** — `state: done` only after CI green + reviews
9. **Immutable audit trail** — All Leader actions logged with rationale

## Scripts

### Watcher (Leader Operations)
```bash
node team/scripts/watcher.mjs assign member-01 "Implement auth contracts"
node team/scripts/watcher.mjs unlock member-01
node team/scripts/watcher.mjs done member-01
node team/scripts/watcher.mjs block member-02 "Waiting for API spec"
node team/scripts/watcher.mjs status
node team/scripts/watcher.mjs heartbeat
node team/scripts/watcher.mjs watch
```

### Validator (File Format Check)
```bash
node team/scripts/validate.mjs              # Validate all files
node team/scripts/validate.mjs --strict     # Strict mode (warnings = errors)
node team/scripts/validate.mjs --member 01  # Validate single member
```

### Enforcer (Real-Time Rules)
```bash
node team/scripts/enforce.mjs              # Start enforcement daemon
node team/scripts/enforce.mjs --check      # One-shot validation
node team/scripts/enforce.mjs --heartbeat  # Check stale heartbeats only
```

### Recovery (Crash Detection)
```bash
node team/scripts/recover.mjs              # Detect and recover crashed sessions
node team/scripts/recover.mjs --dry-run    # Show what would be recovered
node team/scripts/recover.mjs --force      # Force reset all running members
```

### CI Gate
The GitHub Actions workflow `.github/workflows/team-gate.yml` runs automatically on any PR that touches `team/`. It validates all files and rejects PRs with invalid team state.

## GStack & Ruflo Tools

Members have access to GStack skills and Ruflo MCP for enhanced quality verification.

### Tool Map

| Member | Skills | MCP Servers |
|--------|--------|-------------|
| member-01 | `/review`, `/health` | filesystem, github, postgresql |
| member-02 | `/review`, `/health` | filesystem, github, postgresql |
| member-03 | `/review`, `/health` | filesystem, github, postgresql |
| member-04 | `/browse`, `/qa`, `/investigate` | filesystem, github, playwright |
| member-05 | `/ship`, `/canary` | filesystem, github |
| member-06 | `/design-review`, `/browse` | filesystem |
| member-07 | `/review`, `/health`, `/investigate` | filesystem, github, postgresql |
| member-08 | `/review`, `/health`, `/investigate` | filesystem, github, postgresql |

### Loading Protocol
1. Read team files first (SYSTEM.md, Leader.md, your files)
2. Load your GStack skills (max 3 per session)
3. Begin work

### When to Use
- **Before committing**: run `/health` on changed files
- **Before marking done**: run `/review` to catch logic errors
- **When debugging**: run `/investigate` for root cause analysis
- **member-04**: `/browse` for browser QA, `/qa` for test execution
- **member-05**: `/ship` for deployment, `/canary` for monitoring
- **member-06**: `/design-review` for visual QA, `/browse` for screenshots

## File Structure per Member

Each `member-XX/` contains:

| File | Purpose |
|------|---------|
| `plan.md` | Task assignment, deliverables, acceptance criteria, artifact refs |
| `instruction.md` | Constraints, branch naming, test commands, ownership rules |
| `status.md` | Current state, lock, heartbeat, blocked reason |
| `wait.md` | Dependencies — which members must finish first |

## State Machine

```
idle → (Leader assigns task) → idle with task
idle → (Leader sets lock:true) → running
running → (work complete) → done
running → (blocked) → blocked
blocked → (Leader unblocks) → running
done → (new task assigned) → idle
```

## Common Scenarios

### Starting Work
1. Leader writes task to `plan.md`
2. Leader updates `wait.md` with dependencies
3. Leader sets `lock: true` in `status.md`
4. Member reads files, verifies `lock: true` and `wait.md` empty
5. Member sets `state: running`, updates `last_heartbeat`
6. Member works, updates heartbeat every 15min
7. Member passes quality gates
8. Member marks `state: done`
9. Leader clears dependents' `wait.md`

### Blocked
1. Member writes `state: blocked` + reason in `status.md`
2. Leader reads, attempts to unblock or reassign
3. If Leader unresponsive > 2 hours, member proceeds with best judgment

### Parallel Work
- member-05 (DevOps) and member-06 (Design) can run immediately
- member-07 and member-08 start after member-01 delivers contracts
- member-02 and member-03 start after their respective lead reviews

## FAQ

**Q: Can I edit files outside my area?**
A: Only with explicit Leader approval. Write the request in your `status.md` Notes.

**Q: What if two members need the same file?**
A: The Leader assigns sequential order via the Conflict Registry in `Leader.md`.

**Q: How do I know when to start?**
A: Check your `status.md` — if `lock: true` and `wait.md` empty, start working.

**Q: What if I finish early?**
A: Mark `state: done`. The Leader will assign your next task.

**Q: Can I review another member's code?**
A: Only if you're a Senior Lead (member-07 or member-08) and the work is in your review scope.
