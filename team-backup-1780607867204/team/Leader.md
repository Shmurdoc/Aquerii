---
role: Leader
repo_path: C:\Users\madoc\source\repos\Aquerii
version: 3.0
last_updated: 2026-06-04T00:00:00Z
agents:
  - id: member-01
    role: Core API / Integration
    area: services/api/
    tech: PHP 8.3 / Laravel 11
    reviews_by: [member-07, member-08]
  - id: member-02
    role: Developer A — Feature Modules
    area: services/api/app/Modules/ (low-coupling)
    tech: PHP 8.3 / Laravel 11
    reviews_by: [member-07]
  - id: member-03
    role: Developer B — Feature Modules
    area: services/api/app/Modules/ (low-coupling)
    tech: PHP 8.3 / Laravel 11
    reviews_by: [member-08]
  - id: member-04
    role: QA / Integration Engineer
    area: services/tests/, .github/workflows/
    tech: Pest PHP / Playwright / Vitest / k6
  - id: member-05
    role: DevOps / CI Automation
    area: infra/, .github/workflows/, Dockerfiles
    tech: Docker / Helm / Terraform / GitHub Actions
  - id: member-06
    role: Design Team (Frontend)
    area: docs/frontend-design/, services/web/src/components/
    tech: Tailwind / CSS variables / Figma
  - id: member-07
    role: Senior Lead — CRM + ERP
    area: services/api/app/Modules/CRM/, services/api/app/Modules/ERP/
    tech: PHP 8.3 / Laravel 11
    reviews: [member-01, member-02]
  - id: member-08
    role: Senior Lead — Billing + Inventory
    area: services/api/app/Modules/Billing/, services/api/app/Modules/Inventory/
    tech: PHP 8.3 / Laravel 11
    reviews: [member-01, member-03]
coordination_policy: hybrid-parallel
heartbeat_timeout: 1800
escalation_timeout: 3600
---

# Leader Orchestration

## Purpose

The Leader assigns tasks, enforces ordering, resolves conflicts, and updates member `wait.md` and `status.md` files. Leader is the single source of truth for all assignments and the dependency graph.

## How to Operate

1. **Create assignment**: write into target member's `plan.md` and update the dependency graph below
2. **Publish dependencies**: update the `dependencies` table and write dependent member IDs into each affected member's `wait.md`
3. **Locking**: when a member is allowed to start, Leader writes `lock: true` into that member's `status.md`. When finished, Leader sets `lock: false` and `state: done`
4. **Retries and timeouts**: if a member is blocked for more than `heartbeat_timeout` seconds, Leader escalates or reassigns
5. **Audit trail**: every change must include `updated_by: Leader` and `timestamp`
6. **Scope validation**: before unlocking, verify task is atomic, has contract, tests, and acceptance criteria
7. **Review enforcement**: for CRM, ERP, Billing, Core API — require lead review sign-off before merge

## Dependency Graph

| Member | Role | Depends On | Reviews By | Status | Current Task |
|--------|------|-----------|------------|--------|-------------|
| member-01 | Core API / Integration | none | member-07, member-08 | idle | (unassigned) |
| member-02 | Developer A: Features | member-07 | member-07 | idle | (unassigned) |
| member-03 | Developer B: Features | member-08 | member-08 | idle | (unassigned) |
| member-04 | QA / Integration | member-01, member-07, member-08 | — | idle | (unassigned) |
| member-05 | DevOps / CI | member-01 | — | idle | (unassigned) |
| member-06 | Design (Frontend) | none | — | idle | (unassigned) |
| member-07 | Senior Lead: CRM+ERP | member-01 | Leader | idle | (unassigned) |
| member-08 | Senior Lead: Billing+Inv | member-01 | Leader | idle | (unassigned) |

## Parallel vs Sequential Rules

- **Parallel allowed**: member-05, member-06 (independent)
- **Parallel with contract-first**: member-07, member-08 (need member-01 contracts first)
- **Sequential**: member-02 waits on member-07, member-03 waits on member-08
- **Last**: member-04 runs after implementations complete

## Coordination Rules

- **Exclusive start**: a member may only start when its `wait.md` is empty or all listed members have `state: done`
- **Partial parallelism**: members with no mutual dependencies may run concurrently
- **Preconditions**: Leader must verify preconditions listed in `plan.md` before unlocking
- **File conflicts**: if two members need the same file, Leader assigns sequential order via `wait.md`
- **Contract-first**: no implementation starts without committed API contract/spec
- **Small bounded tasks**: max 8 hours per assignment; split larger scopes before unlocking

## Assignment Log

Append-only log of all assignments and state changes.

```
[2026-06-04T00:00:00Z] SYSTEM: Team orchestration system initialized
[2026-06-04T00:00:00Z] SYSTEM: Role redesign — 8 members with hybrid coordination
```

## Conflict Registry

Track shared file access to prevent simultaneous edits.

| File | Holder | Since | Requester | Resolution |
|------|--------|-------|-----------|------------|
| (none) | | | | |

## Signals

- `signal_start(member-id)`: write `lock: true` and `started_at` in status.md
- `signal_done(member-id)`: write `state: done`, `completed_at`, clear dependents' wait.md
- `signal_block(member-id, reason)`: write `state: blocked` + `blocked_reason` in status.md
- `signal_review(member-id, reviewer)`: append review request to reviewer's status.md
- `heartbeat_check()`: scan all status.md, mark stale (>30min) as blocked
- `reassign(member-id, new_task)`: update plan.md, reset status.md, notify dependents

## Scope Validation Checklist

Before unlocking any member, Leader verifies:

- [ ] Task is atomic (single deliverable, <= 8 hours)
- [ ] Contract/spec exists in repo (if member depends on API)
- [ ] Acceptance criteria defined in plan.md
- [ ] Tests defined in plan.md
- [ ] Lead review assigned (if CRM/ERP/Billing/Core API)
- [ ] No file conflicts with active members

## Leader Decision Log

Record non-trivial decisions here for audit.

```
[2026-06-04T00:00:00Z] DECISION: Redesigned team from 6 to 8 members with hybrid coordination policy
[2026-06-04T00:00:00Z] DECISION: Added contract-first and scope-validation guardrails
```
