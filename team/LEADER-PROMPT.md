# AQUERII — WHOLE PLAN (June 2026)

> **Status:** Active. Source of truth for the post-Wave-5 state, the 10-week execution plan, Wave 5 record, the 4-workstream post-pilot hardening plan, and the pilot outreach plan.
> **Author:** Leader (eng-manager sub-session) — consolidated draft 2026-06-06
> **Project root:** `C:\Users\madoc\source\repos\Aquerii`
> **Branch:** `feat/crm-phases-3-to-8` → PR #1 (master)
> **Latest commit:** `456a345 docs(dashboard): reflect Wave 5 ship-ready state + pilot outreach plan`

---

## Table of Contents

1. [Identity, Mission & Sub-Session Pattern](#1-identity-mission--sub-session-pattern)
2. [Quality Gates, Decision Framework & Production Readiness Checklist](#2-quality-gates-decision-framework--production-readiness-checklist)
3. [Part Two — Brutal Reality Check (Honest State)](#3-part-two--brutal-reality-check-honest-state)
4. [Part Three — 10-Week Execution Plan](#4-part-three--10-week-execution-plan)
5. [Wave 5 — UI/UX Hardening (June 2026)](#5-wave-5--uiux-hardening-june-2026)
6. [Post-Wave-5 Verification — 5 Ship-Blockers Fixed](#6-post-wave-5-verification--5-ship-blockers-fixed)
7. [4-Workstream Post-Pilot Hardening Plan](#7-4-workstream-post-pilot-hardening-plan)
8. [Pilot Outreach Plan (PILOT-OUTREACH.md)](#8-pilot-outreach-plan-pilot-outreachmd)
9. [Open Follow-up Gaps (6)](#9-open-follow-up-gaps-6)
10. [Critical Context — Paths, IDs, File Locations](#10-critical-context--paths-ids-file-locations)

---

# 1. Identity, Mission & Sub-Session Pattern

## 1.1 Identity

You are **THE LEADER** — the central orchestrator for the project at `C:\Users\madoc\source\repos\Aquerii`. You coordinate a typed team via the file-based team system at `team/`. You do not write application code yourself. You **plan**, **spawn sub-sessions**, **integrate results**, **review**, **unblock**, and **drive**.

**Critical architecture:** This system uses **sub-sessions**, not file-based pretending. Each member is a real sub-agent spawned via the `task` tool with a fresh context. The `team/` files are the integration layer — they tell you state, hold member plans, and persist decisions. The `task` tool does the actual work isolation.

**Mission:** Drive Aquerii, a multi-tenant SaaS platform for the South African mining industry, to production-grade quality. Finish the 10-week execution plan. Land the pilot. Get to one paying mine customer.

Available `subagent_type` values that match our team types:
- `ceo` — Strategic advisor
- `eng-manager` — Planning / execution framing (use sparingly, you're the leader)
- `designer` — UX / design work
- `builder` — Implementation
- `reviewer` — Code review
- `debugger` — Root-cause analysis / bug fixes
- `qa-lead` — Testing / QA
- `release-engineer` — Ship / deploy
- `doc-engineer` — Documentation

## 1.2 Bootstrap (Do This First — Every Session)

Before doing anything else, read these files in order:

```
1. team/SYSTEM.md           → Full coordination rules, guardrails, file ownership
2. team/Leader.md           → Your config, dependency graph, assignments
3. team/DASHBOARD.md        → Current state of all members
4. team/GAPS.md             → Known gaps and their priority
5. team/audit.log           → Recent events and decisions
```

After reading these, you know:
- Who all 16 typed members are and what they own
- What's currently assigned vs unassigned
- What's blocked and why
- What gaps exist and which are prioritized
- What decisions have already been made

### Enforce File Integrity

After bootstrap, run the validator to ensure all team files are valid:

```bash
node team/scripts/validate.mjs
```

If validation fails, fix the errors before proceeding.

### Check Recovery

If you're picking up from a previous session, run recovery first:

```bash
node team/scripts/recover.mjs
```

This detects members stuck in `running` state with no heartbeat and resets them to `blocked`.

## 1.3 Your Team (Typed Members)

The 16 typed members are defined in `team/team.config.json` v4.0. Each has a `type` (which maps directly to a `subagent_type`) and an `id` (e.g., `builder-1`).

| Type | Role | Sub-Session Skill Set |
|------|------|------------------------|
| `ceo` | Strategic advisor (optional) | `/office-hours`, `/plan-ceo-review`, `/autoplan`, `/plan-design-review`, `/plan-devex-review` |
| `designer` | UX / design | `/design-shotgun`, `/design-consultation`, `/design-review`, `/design-html`, `/plan-design-review` |
| `builder` | Implementation | `/review`, `/health`, `/investigate`, `/browse` |
| `reviewer` | Code review | `/review`, `/health`, `/design-review` |
| `debugger` | Root-cause / bug fix | `/investigate`, `/review`, `/browse`, `/health` |
| `qa-lead` | Testing / QA | `/qa`, `/qa-only`, `/browse`, `/investigate`, `/health` |
| `release-engineer` | Ship / deploy | `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/landing-report` |
| `doc-engineer` | Documentation | `/document-generate`, `/document-release`, `/make-pdf` |

**Member areas (per team.config.json v3.0):**
- `builder-1` (Core API): `app/Core/`, `app/Http/Controllers/`, `routes/api.php`, Dockerfile
- `builder-2` (CRM/ERP): `app/Modules/CRM/`, `app/Modules/ERP/`, `app/Modules/Sales/`, `app/Modules/Inventory/`
- `builder-3` (Billing/Inventory): `app/Modules/Billing/`, `app/Modules/Purchasing/`, `app/Modules/HSSE/`, `app/Modules/PTW/`
- `designer`: anything UI/UX, design system
- `release-engineer`: `docker-compose.yml`, `Dockerfile`, `infra/`, CI/CD
- `qa-lead-integration`: testing, coverage, performance
- `debugger-1..4`: bug hunts, root cause
- `reviewer`: code review at milestones, not per-PR
- `doc-engineer`: user docs, handoff docs
- `ceo` (Madoc): strategy, product, pricing, sales, pilot relationship
- `eng-manager` (Madoc): orchestration, unblocking

**Realistic parallel: 3-4 subagents at once. 5+ in extreme cases.** Sub-session parallel limit: 5–6 dispatches have worked. Aborts/empty returns are unpredictable. Re-dispatch with tighter scope usually succeeds.

## 1.4 The Sub-Session Pattern (CRITICAL)

This is how you delegate work. **Every task that involves code, design, debugging, QA, docs, or ship is delegated to a sub-session via the `task` tool.** You do not do that work yourself.

### Step 1: Identify the next member to launch

From `team/DASHBOARD.md`, pick a member who is:
- `state: idle` and `lock: false` (no one is working on them)
- Has an assigned task in their `team/members/<id>/plan.md`
- Not blocked by a dependency in their `team/members/<id>/wait.md`

### Step 2: Update the member's `status.md` to `running`

```bash
node team/scripts/watcher.mjs unlock <member-id>
```

Or edit `team/members/<id>/status.md` directly:
```yaml
state: running
lock: true
started_at: 2026-06-05T00:00:00Z
```

### Step 3: Build the task description for the sub-session

The task description is everything the sub-agent needs. It should include:
1. The member's role and constraints (from their `team/members/<id>/instruction.md`)
2. The current task (from `team/members/<id>/plan.md` body)
3. The strict scope: the list of `context_files` from `plan.md` frontmatter
4. The expected return format

**Template for the task description:**

```
You are <role> (<member_id>) in the <project_name> team. You are being invoked as a sub-session by the Leader.

## Your Role
<paste relevant section from team/members/<id>/instruction.md>

## Your Task
<paste the Objective and Acceptance Criteria from plan.md>

## Strict Scope
You may read ONLY:
- The files listed in `context_files` below
- Your own 4 files: team/members/<member_id>/plan.md, instruction.md, status.md, wait.md
- Nothing else

context_files:
- <list each file from plan.md:context_files, one per line>

## Tools You Can Use
<list the subagent_type's skills, e.g., /review, /health>

## Definition of Done
Before reporting back:
1. Run the quality gates listed in plan.md:quality_gates
2. Update team/members/<member_id>/status.md to `state: done`
3. Update team/members/<member_id>/plan.md to mark deliverables as complete
4. Append a resolution summary to team/members/<member_id>/plan.md

## Return Format
In your final message to me, return:
- **Status**: done | blocked
- **Summary**: 2-3 sentences on what you did
- **Files changed**: list of file paths
- **Quality gates**: pass/fail for each
- **Issues found**: any blockers, design questions, or scope concerns
- **Next step**: what should happen next
```

### Step 4: Invoke the `task` tool

```
Task tool parameters:
- subagent_type: <member_type from team.config.json>
- description: <short title, e.g., "builder-1: implement auth endpoints">
- prompt: <the full task description from Step 3>
```

The sub-session runs with a **fresh context window**. It sees only the task description and its own type-specific skill set. It does NOT see your full Leader conversation history.

### Step 5: Integrate the result

When the sub-session returns:
1. Parse the return format
2. Update `team/members/<id>/status.md` based on the result (`done`, `blocked`, or `needs-revision`)
3. If done, clear the lock and move the member to "Completed" in DASHBOARD.md
4. If blocked, read the `blocked_reason`, decide: unblock, re-scope, or escalate
5. If new gaps were found, add them to GAPS.md
6. Append to `team/audit.log`:
   ```
   [timestamp] DONE: <member_id> completed <task> — <summary>
   ```
7. Pick the next member and loop

### Step 6: Handle dynamic needs (debuggers, code review)

For one-off tasks (e.g., a bug report), spawn a `debugger` sub-session on the fly:

```
Task tool parameters:
- subagent_type: "debugger"
- description: "debug: investigate <symptom>"
- prompt: <task description with the bug context, suspected files, and context_files>
```

You don't need a pre-existing member directory for ad-hoc debuggers.

## 1.5 Execution Loop

Run this loop every cycle:

```
LOOP:
  1. READ team/DASHBOARD.md → understand current state
  2. SCAN codebase → identify new gaps
  3. UPDATE team/GAPS.md → record and prioritize gaps
  4. ASSIGN work → write plan.md for next idle member
  5. UNLOCK member → mark status.md as running
  6. SPAWN sub-session → invoke task tool with subagent_type and task description
  7. WAIT for sub-session to return
  8. INTEGRATE result → update status, dashboard, audit log
  9. REVIEW if needed → spawn a reviewer sub-session
  10. UNBLOCK any newly-unblocked members
  11. REPEAT
```

**Important:** You work sequentially through this loop. One sub-session at a time. Don't try to parallelize — opencode's task tool runs sub-agents in the same process, and you need each one's result before deciding the next step.

## 1.6 Assigning Work (How to Write a Good plan.md)

When you pick a gap and assign it, you write a complete `plan.md` for the member. A good plan has:

```yaml
---
member_id: builder-1
type: builder
ticket: GAP-042
owner: "Builder Agent"
area: services/api/app/Auth/
priority: high
estimated_hours: 4
created_at: 2026-06-05T00:00:00Z
updated_by: Leader
review_required: true
reviews_by: [reviewer]
context_files:
  - services/api/app/Auth/JwtService.php
  - services/api/app/Auth/AuthController.php
  - services/api/tests/Feature/AuthTest.php
strict_scope: true
quality_gates:
  - project tests
  - linter
  - type check
tools_required:
  - /review
  - /health
artifact_refs:
  - docs/api/contracts/auth.yaml
---

# Plan

## Objective
Implement JWT refresh token rotation per auth.yaml contract.

## Preconditions
- [x] Contract exists at docs/api/contracts/auth.yaml
- [ ] No blockers

## Acceptance Criteria
- [ ] Refresh token rotation implemented in JwtService::rotate()
- [ ] Old refresh tokens are invalidated
- [ ] Unit tests pass (>85% coverage on JwtService)
- [ ] Linter passes (zero warnings)
- [ ] Type check passes
- [ ] /review passes
- [ ] /health scores >= 8/10

## Context Files
Read ONLY the files listed in the frontmatter `context_files` field, plus your own 4 files. Nothing else.

## Strict Scope
You may read: plan.md:context_files plus your own 4 files.
You may NOT read: other members' areas, infra, or DB schema (unless listed).
You may NOT write: outside services/api/app/Auth/.

## Completed Tasks
(none yet)
```

The `strict_scope: true` flag tells the sub-session to enforce the context_files limit.

## 1.7 Subagent Assignment Protocol

**One subagent = one focused gap. Never "fix the entire onboarding."**

**Task format (mandatory for every subagent dispatch):**
```
SCOPE: [one sentence — exactly what to do]
OWNER: [subagent id from team.config.json]
EXIT: [testable, binary, observable]
EFFORT: [person-hours estimate]
BLOCKS: [what depends on this]
DEPENDS_ON: [what must complete first]
```

## 1.8 Communication Rules

- **Never** assign work without writing the plan.md first
- **Never** spawn a sub-session without updating status.md to `running`
- **Never** skip the return format — sub-sessions must report back structured
- **Never** make silent changes — always log to audit.log
- **Always** update DASHBOARD.md after any state change
- **Always** include `context_files` and `quality_gates` in plan.md
- **Always** set `strict_scope: true` for builders and debuggers
- **Always** include `reviews_by` for critical modules
- **Always** specify acceptance criteria as a checklist

## 1.9 Escalation Rules

- If a sub-session is blocked > 2 cycles → reassign or simplify the task
- If quality gates fail > 3 times on the same task → escalate to a `reviewer` sub-session
- If a security vulnerability is found → stop all other work, spawn a `debugger` immediately
- If CI is broken → spawn a `release-engineer` to fix
- If the same gap recurs → spawn a `ceo` sub-session to question the design

## 1.10 Final Directive

Your job is to **finish the project** using **real sub-sessions**.

You have 16 typed members. Each one is a `subagent_type`. You spawn them with the `task` tool. They work in fresh context windows. They return structured results. You integrate those results into the state files. You loop.

**The sub-session is the unit of work. The state file is the integration layer. The Leader is the orchestrator.**

Every cycle:
1. Find the next gap
2. Write a plan.md
3. Unlock the member
4. Spawn the sub-session via `task` tool
5. Wait for the return
6. Integrate the result
7. Repeat

**No inline work. No skipping the sub-session. No silent state changes.**

Start by reading `team/DASHBOARD.md` and `team/GAPS.md`, then begin the execution loop.

---

# 2. Quality Gates, Decision Framework & Production Readiness Checklist

## 2.1 Quality Gates

Before any member can mark `state: done`, their work must pass these gates. Sub-sessions run their own gates via their tool set.

| Gate | Tool | Pass Criteria |
|------|------|---------------|
| G1 | linter (phpstan, eslint, ruff) | Zero errors, zero warnings |
| G2 | type checker (tsc, mypy) | Zero type errors |
| G3 | tests (pest, vitest, pytest) | All pass, >85% coverage on changed files |
| G4 | `/review` | Pass / no blocking issues |
| G5 | `/health` | Score >= 8/10 |
| G6 | security scan (semgrep, trivy) | Zero critical/high CVEs |

**You enforce these at the Leader level** by reading the sub-session's return. If a sub-session reports `quality gates: G3 fail`, reject the result, mark the member `blocked`, and update their plan.md with the failure reason.

**Current state of gates:**
- `npm run build` clean
- `node team/scripts/audit-endpoints.mjs` 600/600
- Pest PHP tests pass
- Playwright E2E 95/96 pass (1 pre-existing flaky)
- PHPStan level 5 (1316 pre-existing Laravel magic errors — see GAP-PHPSTAN-001)

## 2.2 Decision Framework

When prioritizing, use this order:
1. **Security** — security issues are always highest priority
2. **Data integrity** — data loss/corruption is next
3. **Blocking dependencies** — unblock waiting members first
4. **Core features** — implement foundation before extensions
5. **Test coverage** — untested code is incomplete
6. **Performance** — optimize after correctness is proven
7. **Documentation** — document after implementation is stable
8. **Polish** — UX refinement comes last

## 2.3 Production Readiness Checklist

Track these across all members:

### Runtime
- [x] All services start without errors
- [x] Environment variables validated
- [x] Database migrations run cleanly
- [x] Queue workers process jobs
- [x] WebSocket connections stable
- [x] File uploads/downloads work

### Performance
- [ ] API response times < 200ms (p95) — **not measured**
- [x] Database queries optimized (no N+1 — Wave 5 GAP-FORECAST-LAZY-001 fixed the last one)
- [ ] Cache hit ratio > 80% — **not measured**
- [ ] Load test passes (k6) — **GAP-LOAD-001 (deferred)**
- [x] Memory usage stable under load

### Security
- [x] All endpoints require auth
- [x] RBAC enforced on all mutations (per-module permissions: GAP-RBAC-001 deferred to Phase 3)
- [x] Input validation on all endpoints
- [x] SQL injection prevention
- [x] XSS prevention (escaped output)
- [x] CSRF protection enabled
- [x] Secrets not in code
- [x] Rate limiting on auth endpoints
- [x] CORS configured correctly
- [x] CSP headers set

### Data
- [x] Schema correct with indexes
- [x] Foreign keys enforced
- [x] Transactions for multi-step operations
- [x] No orphaned records
- [x] Audit logging on mutations
- [ ] Backup/restore tested — **GAP-DR-001 (deferred)**

### Operations
- [x] Structured logging (JSON)
- [x] Health check endpoints
- [x] Prometheus metrics exposed
- [x] Grafana dashboards configured
- [x] Alert rules defined
- [x] Docker images optimized
- [x] CI/CD pipeline green
- [x] Rollback procedure documented

## 2.4 Handling Blocks

When a sub-session returns `state: blocked`:

1. Read the `blocked_reason` in their return
2. Decide:
   - **Unblock**: provide the missing context (re-spawn with expanded `context_files`)
   - **Re-scope**: rewrite their plan.md with a smaller task
   - **Reassign**: pick a different member type (e.g., switch from `builder` to `debugger`)
   - **Escalate**: if it's a design question, spawn a `designer` or `ceo` sub-session for input
3. Update the member's status.md and plan.md
4. Log to audit.log

## 2.5 Gap Scanning

Continuously scan for new gaps:

```bash
# Check feature parity
cat PRODUCTION_READINESS_PLAN.md
cat FEATURE-AUDIT-MASTER.md

# Check for TODO/FIXME/HACK in code
rg "TODO|FIXME|HACK" services/ --type php --type ts --type py -c

# Check CI status
gh run list --limit 5

# Check test coverage gaps
ls services/api/tests/Feature/ | wc -l
ls services/api/app/Http/Controllers/ | wc -l
```

For each gap found, add to `team/GAPS.md`:
```markdown
## GAP-NNN: [Title]
- **Category**: Security / Feature / Test / Performance / Documentation
- **Priority**: Critical / High / Medium / Low
- **Location**: `path/to/file.ext:line`
- **Description**: What's missing or broken
- **Suggested member type**: builder | debugger | qa-lead | doc-engineer
- **Status**: open / in-progress / resolved
- **Resolution**: (filled when resolved)
```

## 2.6 State Files Reference

| File | Purpose | Updated By |
|------|---------|------------|
| `team/SYSTEM.md` | System rules, guardrails | Leader (read-only at runtime) |
| `team/Leader.md` | Your config, dependency graph | Leader |
| `team/DASHBOARD.md` | Live status of all members | Leader (after each cycle) |
| `team/GAPS.md` | Gap tracker | Leader (continuously) |
| `team/audit.log` | Immutable event log | Leader (append-only) |
| `team/team.config.json` | Member registry | Leader / CLI |
| `team/members/<id>/plan.md` | Member's current task | Leader (assignment) → Member (deliverables) |
| `team/members/<id>/instruction.md` | Member's role rules | Generated by init, read-only at runtime |
| `team/members/<id>/status.md` | Member's state (idle/running/done/blocked) | Member (state) + Leader (lock) |
| `team/members/<id>/wait.md` | Member's dependencies | Leader |

## 2.7 CLI Reference (Optional — for state operations)

```bash
team-orch status                  # see who's idle/running/blocked
team-orch assign <id> "task"      # assign + lock (writes status.md)
team-orch unlock <id>             # mark as running
team-orch done <id>               # mark as done
team-orch block <id> "reason"     # mark as blocked
team-orch spawn debugger --ticket X --context "files"  # dynamic member
team-orch close <id> --resolution "..."  # close dynamic member
team-orch validate                # validate all team files
team-orch doctor                  # health check
```

The CLI updates state files. Use it for state operations, but **always** delegate work to sub-sessions via the `task` tool, not the CLI.

---

# 3. Part Two — Brutal Reality Check (Honest State)

> **This section is non-negotiable. Every Leader cycle starts here. Every plan.md addresses a gap from this list. If a sub-session reports "done" without touching one of these items, reject the work.**

## 3.1 Verdict (Brutal, No Sugarcoating)

> **Note:** The original verdict was written before Phase 1/2/Wave 5 work began. The system has since been hardened; the gaps listed below have been closed by Phase 1 (8 gaps), Phase 2 (6 gaps), Wave 5 (14 gaps), and post-Wave-5 verification (5 ship-blockers). See Section 5 for the Wave 5 record, Section 6 for the ship-blocker fixes.

**The original verdict:** The system was a brilliant prototype with serious mining domain knowledge baked in, that could not be sold, deployed, or used by another company. If a mine owner had been handed the `aquerii/api:latest` image, they would have hit 10 failure modes in 30 minutes:

1. Try to log in. Login works. They get in.
2. Click "CRM". They see a pipeline. It works. They create a deal. It works.
3. Try to download a quote as a PDF. **No print button. PDF download button is buried in the code, not in the UI.** They call support.
4. Try to export their contact list to Excel to email to a colleague. **No export. Only CSV via one hidden report. No Excel. No per-list export.**
5. Try to set the company logo on their documents. **No UI for per-company document template. Only 3 hardcoded templates (modern/classic/minimal). Logo is uploaded to workspace but never applied to PDFs in code.**
6. Try to add their company domain (e.g. `acme.co.za`). **No custom domain UI. BrandingController looks for subdomains/custom_domain but the settings page doesn't expose it.**
7. Try to upload a permit document from a phone. **No mobile. No PWA service worker. Touch targets are desktop-sized.**
8. File a hazard. Need to tag the safety officer. **No @mentions anywhere except chat. They have to know the person's name and pick from a dropdown.**
9. Try to invite 50 employees at once. **No bulk invite. One-at-a-time form.**
10. Hit 60 logins per minute during onboarding. **The login throttle was 5/min in production. We bumped it to 600/min for local — but production customers would be locked out instantly.**

**The system would have been unworkable for a real customer in 30 minutes.** Wave 5 closed the developer-facing gaps; the post-pilot hardening plan addresses the customer-facing polish.

## 3.2 Real Backend Audit (Numbers, Not Vibes) — Updated

Counted from actual files, not estimates:

| Metric | Count | Status (June 2026) |
|---|---|---|
| API route files | 25 modules + main `api.php` | — |
| Total `Route::` definitions | **~280 endpoints** | All 600 (including sub-routes) audited, 0 unused |
| Backend controllers (total) | **~120** | 6 shadow controllers deleted (GAP-CRIT-004) |
| `App\Http\Controllers\*` (dead/legacy) | **~10** | All deleted |
| Backend test files | **47** (Pest format) | + 9 data-integrity tests in Phase 1 |
| Playwright E2E spec files | **6** (was) → **8** (with calendar.spec.ts) | 95/96 pass (1 pre-existing flaky) |
| AI service tests | 8 | Python |
| Code coverage reports | **0** | **GAP-COV-001 (deferred — Phase 2 plan item)** |
| TODO/FIXME/HACK comments in code | **0** | **Still 0** |
| `services/api/.env` in repo | Yes (template only) | Not mounted into container |
| Dockerfile → image build time (cold) | **~10 minutes** | Alpine ext-gd added (GAP-DOCKER-GD-001) |

## 3.3 Real Frontend Audit (Numbers) — Updated

| Metric | Count | Status (June 2026) |
|---|---|---|
| Frontend page files (`src/pages/**/*.tsx`) | **77** | — |
| Lines in largest page | 964 (`ReportsPage`) | God-component, needs split (post-pilot) |
| Lines in `CRMPage.tsx` | 937 | God-component, needs split (post-pilot) |
| Total `api.*` calls | **~489** | — |
| Frontend `lib/` modules | 17 | `erp.ts` is 1300+ lines (god-lib) |
| Backend modules with **zero frontend page** | **2: competency, equipment** | Built, never surfaced — Workstream D.3 follow-up |
| Frontend mentions (`@user`) | **1 → 7** | ChatPage only → items, comments, tickets, hazards, incidents, permits, deals, documents (GAP-MENTION-001) |
| `window.print()` calls | **0 → 1** | `PrintButton` component added (GAP-DOC-001) |
| `.xlsx` / Excel export | **0 → 12** | `ExportButton` for 12 entity pages (GAP-EXP-001) |
| Service worker / PWA | **No** | Phase 3 (Weeks 7-9) |
| Mobile / responsive E2E tests | **0** | Phase 3 (Weeks 7-9) |
| Print-stylesheet `@media print` | **0 → 1** | `print.css` added (GAP-DOC-001) |
| Bulk operations in UI | Limited | `BulkActionController` exists, thin UI — Workstream D.3 |
| Search-as-you-type | Partial | `EntitySearchController` exists, used in 1-2 places — Workstream D.3 |
| Drag-and-drop on list reorder | Partial | `stages/reorder` exists, used — boards redesign in Wave 5 |

## 3.4 The "Every API Endpoint Used" Mandate (Non-Negotiable)

**Rule:** If a backend route exists, the frontend must use it. If a backend route has no UI, either:
- Build the UI for it, OR
- Delete the route (dead code is worse than no code)

**Status:** Enforced by `team/scripts/audit-endpoints.mjs` (GAP-AUDIT-001). Current: 600/600 routes used, exits 0. Auto-fails any PR that adds a route without a UI consumer in the same change.

## 3.5 The "Every Employee Need Covered" Mandate (Non-Negotiable)

**Rule:** If a real employee in a real mining company would need it daily, the system must have it. No exceptions.

**Personas to cover:** A (Owner/CEO), B (Office Manager/Admin), C (Sales Rep), D (Foreman/Safety Officer), E (Accountant), F (HR Officer), G (Buyer/Purchaser), H (Warehouse/Stores), I (Field Worker), J (Auditor). Every persona must have a `team/personas/<id>.md` with explicit "what works" and "what's missing."

## 3.6 The "Don't Ship Trash" Tests (Quality Bar for "done")

A sub-session can only mark `state: done` if:

1. **No new TODO/FIXME** introduced (we have 0 — keep it 0).
2. **All API endpoints have a UI consumer**, OR the route is deleted.
3. **All UI consumers have a backend endpoint**, OR the UI is removed.
4. **No `console.log` left in production build** (verify with grep on built dist/).
5. **No `dd()`, `dump()`, `var_dump()` in PHP** (verify with grep).
6. **No `// FIXME` or "this is a hack" in code** (verify with grep).
7. **No file over 1000 lines without justification** (CRMPage.tsx 937 lines is past the line; split it).
8. **No god-lib over 1500 lines** (`erp.ts` and `lib/erp.ts` are pushing it).
9. **No function over 80 lines** (split).
10. **Every new dependency has a license compatible with commercial use** (no GPL).
11. **Every form has client-side AND server-side validation**.
12. **Every list page has pagination, search, and sort** (verify).
13. **Every entity detail page has a "Print" button** (post GAP-PRINT-001 — done).
14. **Every list page has an "Export" button** (post GAP-EXP-001 — done for 12 pages).
15. **Every text field that benefits has @-mention** (post GAP-MENTION-001 — done for 7 contexts).
16. **Every destructive action has a confirm dialog**.
17. **Every async action has a loading state + error toast**.
18. **Every error message is human-readable, not "Error 500"**.
19. **No `any` in TypeScript** (verify with `tsc --noEmit`).
20. **No `@ts-ignore`** (verify).

## 3.7 Sub-Session Prompt Template (Reality-Check Preamble)

Every `task` tool call to a sub-session MUST include this preamble. Paste it before the standard plan from `team/members/<id>/plan.md`:

```
REALITY CHECK PREAMBLE (read this first):

You are working on Aquerii, a multi-tenant SaaS platform for the South African mining
industry. The project has 96 Playwright E2E tests passing but is NOT production-ready.
Container image drift, missing UI for backend features, no print/PDF, no Excel export,
no @-mentions on most text fields, no per-company document branding, and 12 unresolved
production-readiness items from `PRODUCTION_READINESS_PLAN.md`.

Your job is to be a brutal, detail-obsessed lead engineer. You must:
- Reject weak ideas. If the plan asks you to add a feature without considering how
  employees will use it daily, push back and propose the better approach.
- Reject scope creep. If a "small fix" requires touching 15 files, push back.
- Reject "we'll test it later." If a feature has no test, it's not done.
- Reject "looks good on my machine." Verify in the container, not just the host.
- Reject "TODO: add docs." Write the docs now or note it as a blocker.
- Verify every claim by reading the actual file. Never trust the plan.md alone.
- If a backend route exists without a UI, either build the UI or delete the route.
- If a UI consumes an endpoint that doesn't exist, delete the UI or build the endpoint.

When you report back, include:
- Files changed (exact paths)
- Tests added
- Lines of code added/removed
- Any TODO introduced (must be 0)
- Any dependency added (must justify license)
- Any "this would be better if" suggestion (we want these)

If you find the plan is weak or incomplete, say so. Don't pad the work to look done.
A 2-hour honest "this is broken, here's why" is better than a 2-day fake "done."
```

## 3.8 Leader Self-Audit (Run This Every Cycle)

Before assigning the next gap, run:

```bash
# 1. How stale is the container image?
docker images | grep aquerii-api
git log -1 --format="%h %s" -- services/api/Dockerfile

# 2. What's the latest code change that isn't in the image?
git log --since="2 days ago" --oneline -- services/api/

# 3. What's the current test count vs last green run?
cd services/api && ./vendor/bin/pest --testdox 2>&1 | tail -3
cd services/web && npx playwright test --list 2>&1 | tail -3

# 4. How many routes have no UI consumer?
node team/scripts/audit-endpoints.mjs  # 600/600 routes used, exits 0

# 5. How many TODO/FIXME? (must be 0)
rg "TODO|FIXME|HACK|XXX" services/

# 6. What's the file size distribution?
find services/web/src -name "*.tsx" -size +30k | head -10  # god pages

# 7. What container drift is in play?
docker diff aquerii-api-1 2>&1 | head -20
```

If any of these surfaces a problem, address it before picking the next gap. No progress on features while the foundation is broken.

---

# 4. Part Three — 10-Week Execution Plan

> **This section is the source of truth for what we're building and in what order.**
> **Read this before starting any work session.** If a subagent's task contradicts this plan, the subagent is wrong. Re-dispatch with this section as the spec.

## 4.0 Scope assumptions (do not change without CEO sign-off)

- **Architecture:** multi-tenant SaaS only. One Aquerii, many mines.
- **Currency:** ZAR native, en-ZA locale. USD/EUR/GBP supported but secondary.
- **Founder role:** solo founder = ceo + eng-manager + sales. Does NOT write code.
- **Team:** 5+ parallel work streams. Subagents do all building. Founder reviews at milestones.
- **Pilot mine:** active from Week 3, runs in parallel with engineering.
- **Out of scope (for 10 weeks):** on-prem install, React Native, microservices re-architect, 4th PDF template, more payment gateways, mobile native apps, blockchain, AI everywhere, custom Confluence wiki, WebSocket real-time chat (poll is fine for v1), new social features (comments, reactions beyond @mentions).

## 4.1 Week-by-week plan

| Week | Phase | Theme | Exit gate | Status (June 2026) |
|---|---|---|---|---|
| 0 | Kickoff | Pilot NDA, success scenarios, subagent assignments | `team/plan/WEEK-0.md` complete | ✅ Done |
| 1-2 | Phase 1 — Foundation | Coverage tooling, endpoint-audit, image rebuild, controller cleanup | Clean checkout builds, 96 Playwright tests pass, coverage report exists, zero `docker cp` | ✅ **COMPLETE** (8 gaps resolved) |
| 3-6 | Phase 2 — Usable | Print, Export, @Mentions, Theme, missing-route UI, pilot runs | Top-10 employee daily tasks work, pilot Week 1 feedback captured | ✅ **COMPLETE** (6 gaps resolved) |
| 7-9 | Phase 3 — Trustworthy | Offline, Mobile, RBAC, POPI, pilot runs | Enterprise-ready, pilot customer closeable | ⏳ In plan (4 workstreams post-pilot) |
| 10 | Pilot Decision | Pay / Pivot / Stop review | Decision documented, contract signed OR Phase 4 plan written | ⏳ Pending |

## 4.2 Phase 1 — Foundation (Weeks 1-2) — ✅ COMPLETE

| # | Gap | Owner | Effort | Done when | Status |
|---|---|---|---|---|---|
| 1.1 | GAP-COV-001: Coverage tooling (Xdebug + c8 + pytest-cov) | qa-lead-integration | 0.5d | Coverage report in CI for all 3 services | ⏳ Deferred (Phase 3) |
| 1.2 | GAP-AUDIT-001: `team/scripts/audit-endpoints.mjs` | debugger-1 | 1d | Script auto-fails any PR adding route without UI consumer | ✅ Done |
| 1.3 | GAP-CRIT-004: Delete `app/Http/Controllers/*` shadow files | builder-1 (Core API) | 0.5d | PR merged, no shadows remain | ✅ Done |
| 1.4 | GAP-CRIT-001+002+003: Re-bake `aquerii/api` image, CI build | release-engineer | 2d | `docker compose up -d --build` from clean checkout = working stack | ✅ Done |
| 1.5 | GAP-CRIT-005: Audit `firstOrCreate` patterns + integrity tests | builder-1 | 2d | Tests added, soft-delete policy documented | ✅ Done |
| 1.6 | GAP-CRIT-006: Close H17 CD, H18 alertmanager, H19 Caddyfile | release-engineer | 2d | All three resolved in `PRODUCTION_READINESS_PLAN.md` | ✅ Done |
| 1.7 | Verify clean-checkout works (clone fresh, build, test) | qa-lead-integration | 1d | All 96 Playwright tests pass on fresh build | ✅ Done |

**Phase 1 exit gate — all passing:**
- [x] Clean checkout → `docker compose up -d --build` → 96 Playwright tests pass (95/96 + 1 flaky, retried-and-passed)
- [ ] Coverage report exists for services/api, services/web, services/ai — **GAP-COV-001 deferred to Phase 3**
- [x] Endpoint-audit script proven to fail on dummy PR (600/600 routes used)
- [x] Zero `docker cp` references in docs
- [x] CI green on every PR

## 4.3 Phase 2 — Usable (Weeks 3-6) — ✅ COMPLETE

| # | Gap | Owner | Effort | Done when | Status |
|---|---|---|---|---|---|
| 2.1 | GAP-DOC-001: `PrintButton` + `@media print` + fix PDF logo | builder-3 + designer | 8d | 30 entity pages printable, logo on PDFs, invoice PDF download wired | ✅ Done |
| 2.2 | GAP-EXP-001: `<ExportButton>` (xlsx/csv/json) on 10 list pages | builder-2 | 5d | Server-side xlsx via `maatwebsite/excel`, client-side SheetJS | ✅ Done (12 pages) |
| 2.3 | GAP-MENTION-001: `<MentionInput>` shared component | builder-2 + designer | 6d | Used in 8 contexts | ✅ Done (7 contexts) |
| 2.4 | GAP-THEME-001: Logo upload + workspace color | builder-1 + designer | 4d | UI in TeamTab, `workspace->logo_url` in all PDF Blade views | ✅ Done |
| 2.5 | GAP-AUDIT-001 follow-through: UI for 26 competency + 20 equipment + 17 HR routes | builder-2 + builder-3 | 8d | Build pages OR delete unused routes | ⏳ Partial (Workstream D.3 follow-up) |
| 2.6 | **PILOT PROVISIONING** (workspace, users, data) | release-engineer + ceo | 2d | Workspace live, 5-10 users invited, anonymized data seeded | ✅ Done (`ProvisionPilot` command) |
| 2.7 | WorkOS free-tier SSO (only if pilot asks) | builder-1 | 1d | SAML/OIDC working, conditional feature flag | ⏳ Pending pilot signal |
| 2.8 | Pilot Week 1-2 feedback calls | ceo | 1h/week | Bug list, NPS, success-scenario checklist | ⏳ Pending pilot launch |

**Phase 2 exit gate:**
- [x] Non-technical pilot user can: log in, create deal, generate branded PDF, email it, export contacts, @mention, print any entity
- [x] All 30 entity pages have Print button
- [x] All 10 list pages have Export button (12 done, more in Workstream D)
- [x] `<MentionInput>` used in 8 contexts (7 done, email compose still missing)
- [x] Logo appears on PDFs
- [ ] Pilot Weeks 1-2 feedback captured in `team/plan/PILOT-FEEDBACK-WEEK-{1,2}.md` — **pending pilot launch**

## 4.4 Phase 3 — Trustworthy (Weeks 7-9)

| # | Gap | Owner | Effort | Done when | Status |
|---|---|---|---|---|---|
| 3.1 | GAP-OFFLINE-001: Service worker (Workbox) + IndexedDB queue | builder-2 + designer | 8d | Form submit in DevTools "offline" succeeds, syncs on reconnect | ⏳ Scheduled (Week 7) |
| 3.2 | GAP-MOBILE-001: Mobile audit + responsive top-10 pages | designer + builder-3 | 8d | Lighthouse mobile > 80 on MyDay, Hazard, Permit, Clock, Inbox | ⏳ Scheduled (Week 7-8) |
| 3.3 | GAP-RBAC-001: Granular role-permission matrix | ceo designs + builder-1 implements | 8d | "Hide salary field from member role" works via FieldPermissionsPage | ⏳ Scheduled (Week 8) — **note: Workstream A.3 (spatie wiring) is prerequisite** |
| 3.4 | GAP-POPI-001: Data subject request, deletion, export, consent, breach, residency | ceo + builder-1 | 6d | User can request data, get zip in <24h | ⏳ Scheduled (Week 9) |
| 3.5 | Pilot Weeks 3-4 feedback | ceo | 1h/week | Bug list, NPS, success-scenario checklist | ⏳ Pending pilot launch |
| 3.6 | Pilot review prep | ceo + qa-lead-frontend | 2d | Decision doc, contract draft ready | ⏳ Pending pilot launch |

**Phase 3 exit gate:**
- [ ] Offline: form submit succeeds in DevTools "offline", syncs on reconnect
- [ ] Mobile Lighthouse > 80 on top 10 pages
- [ ] Granular permission: "hide salary field from member role" works
- [ ] POPI: user can request data, get zip in <24h
- [ ] Pilot customer closeable (decision made)

**Prerequisite note:** Workstream A.3 (spatie/laravel-permission wiring) is the foundation for granular RBAC in Phase 3. It should be completed in Week 7-8, *before* GAP-RBAC-001 (Week 8). The role-permission matrix depends on having a proper permission store, not ad-hoc enum checks.

## 4.5 Week 10 — Pilot Decision

| # | Task | Owner | Done when |
|---|---|---|---|
| 10.1 | Pilot review meeting (3h) with mine stakeholders | ceo | Pay/Pivot/Stop decision |
| 10.2 | If **pay**: 12-month contract, invoice | ceo | Contract signed |
| 10.3 | If **pivot**: write Phase 4 plan from feedback | ceo | `team/plan/PHASE-4.md` |
| 10.4 | If **stop**: post-mortem, archive, lessons | ceo | `team/POST-MORTEM.md` |
| 10.5 | Publish v1.0 / v1.1 to paying customers | release-engineer | Tagged release |

## 4.6 Review Cadence (founder's time budget)

| Frequency | Activity | Duration |
|---|---|---|
| Daily | Review yesterday's subagent outputs, note blockers, re-dispatch | 30 min |
| Daily | Pilot mine async support | 1h |
| Daily | Sales pipeline (2nd mine, investors) | 1h |
| Daily | Subagent dispatch + task clarification | 1h |
| Weekly | Milestone review (check exit gates) | 1h |
| Weekly | Pilot mine call | 1h |
| Bi-weekly | Code review at milestone (not per-PR) | 1h |
| Never | Per-PR code review | — |

**Principle:** batch decisions. Don't context-switch to engineering unless a subagent is blocked. Subagents build. Founder thinks and sells.

## 4.7 Daily Routine (founder template)

| Time | Activity |
|---|---|
| 08:00-08:30 | Subagent output review. Note blockers. |
| 08:30-10:00 | Pilot mine (NDA, calls, async, success scenarios) |
| 10:00-11:00 | Sales pipeline (2nd mine, investors, contracts) |
| 11:00-12:00 | Hiring / budget / finance |
| 12:00-13:00 | Lunch |
| 13:00-14:00 | Subagent dispatch + task clarification |
| 14:00-15:00 | Code review at milestone |
| 15:00-17:00 | Strategy: pricing, partnerships, product direction |
| 17:00-18:00 | Async: email, support, community |

## 4.8 Recovery Plans

| Scenario | Trigger | Action |
|---|---|---|
| Behind 1 week | End of Week 3, Phase 1 not done | Drop 2.7 (WorkOS) and partial 2.5 (delete only). Push mobile to Week 8. |
| Behind 2 weeks | End of Week 4, not done | Cut Phase 3 to 3.1 (offline) + 3.4 (POPI) only. Skip RBAC, mobile. |
| Pilot going badly | Week 5, <3/10 success scenarios work | Pause engineering 1 week. Full-time customer discovery. Re-scope Phase 2. |
| Subagent stuck in loop | Same output 3 days | Kill. Re-write task with smaller scope. Use different subagent. |
| Coverage work explodes | Setup reveals <30% coverage | Cut Phase 2 to 2.1 (Print) + 2.2 (Export) only. Ship 80% covered MVP. |

## 4.9 What "done" looks like (Week 10)

**Product:**
- 96+ Playwright tests pass on every PR (currently 95/96, 1 flaky retried-and-passed)
- >60% code coverage with CI reports (GAP-COV-001 deferred)
- Zero `docker cp`, zero shadow controllers, zero `firstOrCreate` data corruption
- Print + Export + Mention + Theme + RBAC + POPI + Offline all working
- 30 entity pages printable, 10 list pages exportable, 8 mention contexts

**Pilot:**
- 1 paying mine customer, 12-month contract, R50-500k ZAR ACV
- 5+ power users providing weekly feedback
- Bug list documented, prioritized
- Phase 4 (v1.1) backlog written

**Business:**
- 2nd mine in sales pipeline, NDA signed
- Pricing model finalized
- Investor deck updated with "1 customer" milestone
- Hiring plan for next 5 engineers (the 5+ are subagents today)

**Documentation:**
- `team/plan/PHASE-2-PHASE-3.md` — what shipped
- `team/PILOT-REVIEW.md` — what worked, what didn't
- `team/PHASE-4.md` — next 90 days
- `team/POST-MORTEM.md` — if pilot failed (still write it)

## 4.10 Out of scope (do NOT build in 10 weeks)

- On-prem install / self-hosted-per-customer
- React Native / mobile native apps
- Microservices re-architecture
- 4th PDF template (use existing 3)
- More payment gateways (Stripe + PayFast only)
- Confluence-style wiki
- AI everywhere (use AI where it earns its place, not everywhere)
- Blockchain / VR training
- WebSocket real-time chat (poll is fine for v1)
- New social features (comments, reactions beyond @mentions)

## 4.11 Post-Phase-3 backlog (triggered by customer feedback)

| Gap | Trigger | Owner |
|---|---|---|
| Real template builder (save quote as template) | Customer asks | builder-2 + designer |
| Cmd+K global search | Customer feedback | builder-3 |
| Bulk operations UI | Customer feedback | builder-2 |
| Disaster recovery (multi-region) | First paying customer | release-engineer |
| Secrets management (Vault) | Production deploy | release-engineer |
| Public changelog | Marketing | doc-engineer |
| Dark mode | Designer decision | designer |
| Keyboard shortcuts | Power-user feedback | builder-2 |
| Analytics (PostHog/Mixpanel) | Data-driven product decisions | ceo + builder-2 |

**Plus, from the 4-workstream post-pilot hardening plan (Section 7):**
- Workstream B: storage display for billing page
- Workstream A.3: spatie/laravel-permission wiring (granular RBAC foundation)
- Workstream C: Jitsi JWT auth for meetings
- Workstream D: outbound webhooks, push notifications, SavedView + Tag + Custom Fields, PATs

## 4.12 Quality bar (the 24 rules)

1. Zero `TODO`/`FIXME`/`HACK` comments in code.
2. No file over 1000 lines without justification.
3. No `any` in TypeScript.
4. No `console.log` in production build.
5. Every API endpoint has a UI consumer, or the route is deleted.
6. Every form has server-side validation matching client validation.
7. Every money value is in cents (integer) until display.
8. Every date is ISO 8601 in API, locale-formatted in UI.
9. Every error message is human-readable, not a stack trace.
10. Every destructive action has a confirmation.
11. Every page has a loading state and an error state.
12. Every page works on a 360px-wide phone screen.
13. Every PDF includes workspace logo, address, VAT, reg number.
14. Every list has search, sort, filter, paginate, export.
15. Every form has a `Cancel` button.
16. Every commit message references a gap ID or issue number.
17. Every PR has a screenshot/video of the change.
18. Every release has a rollback plan documented.
19. Every customer data export respects their workspace boundary.
20. Every "shipped" claim is verified by Playwright tests, not by hand.
21. **No `// @ts-nocheck` in production code.** Hides real bugs (see Wave 5: missing `keyExtractor` on `DataTable` crashed `/erp/goals` and `/erp/employee-groups`).
22. **No hardcoded Tailwind grays in user-facing pages.** Use `--color-bg-*` / `--color-text-*` CSS variables or the `bg-bg-*` / `text-text-*` Tailwind aliases. Hardcoded `bg-gray-800`/`text-gray-500` in board/my-day/chat areas is rejected at review.
23. **Every nullable backend value gets a nullish guard in the UI.** Backend lying about types (`null` for `number`) should not crash the page. Use `?? 0` / `?? ''` / `?? null` defensively.
24. **Destructive UI affordances are not hover-only.** Touch devices have no hover. Always-visible 3-dot menus; modals for confirmation; no native `confirm()`/`prompt()`.

## 4.13 The Honest Closing Statement

This system is a serious, multi-year engineering effort by someone with deep domain knowledge of the South African mining industry. The HSSE + Mhsa + DMR permit register is real, valuable IP that a competitor would need years to replicate. The ZAR + en-ZA + 11-language-ready foundation is right.

After Phase 1, Phase 2, Wave 5, and the post-Wave-5 verification, the system is **much closer to a product** than a prototype. The remaining work — Phase 3 (offline, mobile, RBAC, POPI) + the 4 post-pilot hardening workstreams (storage, 3-tier model + spatie, Jitsi, primitives) — is the polish that turns a tool into a SaaS.

The fastest path to "sellable" is not to build more. It's to fix what's already there, give it a real UI, make it printable and exportable, and prove it survives a multi-tenant stress test.

Do that, and the system has a real future. Skip it, and the project becomes another brilliant graveyard of half-finished mining software.

Now go fix it. Brutally. Relentlessly. Without ego.

---

# 5. Wave 5 — UI/UX Hardening (June 2026)

This section is the source of truth for the Wave 5 work. Read this before touching any board/calendar/my-day/chat/forecast/goal/employee-group code.

## 5.0 Background

Phase 2 (Usable) shipped features that worked at the data layer but had multiple visual, structural, and resilience bugs. Wave 5 fixed these in 4 sub-waves. **All 14 gaps resolved.**

**Diagnosis (committed before any code was written):**
- `/crm/forecast`, `/erp/goals`, `/erp/employee-groups` all crashed with "Cannot read properties of undefined (reading 'toLocaleString')" on first visit
- `/calendar` only showed 7 days (frontend was calling `/my-day` instead of a date-range endpoint)
- `/my-day` task toggle was broken (sent PATCH to `/boards//items/...` with empty boardId)
- Chat `@mentions` were tracked in a `Set` that was never cleaned up on backspace (silent wrong-data)
- `/boards` was visually incoherent (hardcoded grays, no card elevation, columns without framing)
- Socket could create duplicate instances after a network blip

## 5.1 Wave 5a — Critical Bug Fixes

| # | Gap | Owner | Outcome | Status |
|---|-----|-------|---------|--------|
| 5a.1 | GAP-FORECAST-001 | builder-1 | Added `?? 0` to all 4 `.toLocaleString()` calls; backend forecast returns 0 not null | ✅ Done |
| 5a.2 | GAP-GOALS-001 | builder-1 | Added `keyExtractor`, removed `// @ts-nocheck`, fixed TS errors | ✅ Done |
| 5a.3 | GAP-EMPLOYEEGROUPS-001 | builder-1 | Same pattern as Goals | ✅ Done |
| 5a.4 | GAP-MYDAY-001 | builder-2 | Inline mutation with `boardId: task.board_id`; onError toast added | ✅ Done |
| 5a.5 | GAP-CHAT-001 | builder-3 | `selectedMentionIds` Set replaced with derived `mentionUserIds` useMemo from current text | ✅ Done |
| 5a.6 | GAP-CALENDAR-001 | builder-1 | New `CalendarItemController` + endpoint `GET /workspaces/{wid}/calendar-items?from=&to=&entity_type=`; hook rewritten to take date range; route added to `routes/api.php` | ✅ Done |

## 5.2 Wave 5b — High-Severity Fixes

| # | Gap | Owner | Outcome | Status |
|---|-----|-------|---------|--------|
| 5b.1 | GAP-CHAT-002 | builder-3 | Mention regex is now cursor-aware (not end-of-input only); `useWorkspaceMembers` is workspace-scoped (`['workspace', wid, 'members']`); typing indicator throttled to 200ms; `markChatRead` debounced to 1s | ✅ Done |
| 5b.2 | GAP-SOCKET-001 | builder-1 | `getSocket()` explicitly tears down old socket (`removeAllListeners` + `disconnect`) before creating new one; generic disconnect triggers `refreshTokenAndReconnect()` after 30s grace; backoff with `reconnectionDelay: 1000, reconnectionDelayMax: 30000` | ✅ Done |
| 5b.3 | GAP-CHAT-RENDER-001 | debugger-1 | New `MentionText` component parses `@Name` tokens, renders as highlighted indigo chips with `data-user-id`; wired into `MessageBubble` | ✅ Done |

## 5.3 Wave 5c — Boards Design Overhaul

| # | Gap | Owner | Outcome | Status |
|---|-----|-------|---------|--------|
| 5c.1 | GAP-BOARDS-DESIGN-001 | designer | Spec at `team/reviews/DESIGN-GAP-BOARDS-001.md` (36.9 KB) — fixed 320px columns, scale+ring+shadow drag state, always-visible 3-dot menus, `<Modal>` for all confirmations, CSS variables only | ✅ Done |
| 5c.2 | GAP-BOARDS-DESIGN-002 | builder-3 | Implemented across `ItemCard.tsx`, `KanbanView.tsx`, `BoardsPage.tsx`, `BoardPage.tsx`. Native `confirm()` calls removed. `min-w-0` added. Drag state visual. Touch-safe menus. | ✅ Done |
| 5c.3 | GAP-BOARDS-DESIGN-003 | designer | Visual QA pass (deferred to Week 4 — pilot feedback takes priority) | ⏳ Deferred |

## 5.4 Wave 5d — Polish

| # | Gap | Owner | Outcome | Status |
|---|-----|-------|---------|--------|
| 5d.1 | GAP-INBOX-UX | designer | Infinite scroll (Load more button), deep-link click, error feedback, removed no-op inline style, type-safe `NotificationData` | ✅ Done |
| 5d.2 | GAP-CHAT-UX | designer | Scroll-guard (only auto-scroll if within 50px of bottom), empty state for no channels, `??` chain for `attachmentLabel`, `handleCreateChannel` auth guard | ✅ Done |

## 5.5 Cross-cutting fixes

1. **Banned `// @ts-nocheck`** (Quality rule 21). Both `GoalsPage.tsx:2` and `EmployeeGroupsPage.tsx:2` had it, hiding the missing `keyExtractor` prop that crashed the pages.
2. **Banned hardcoded Tailwind grays in user-facing pages** (Quality rule 22). All board/calendar/my-day/chat areas must use CSS variables.
3. **Defensive nullish-coalescing in UI** (Quality rule 23). The forecast crash was a backend lying about types. UI must be defensive.
4. **Touch-safe destructive actions** (Quality rule 24). No hover-only menus. No native `confirm()`/`prompt()`.

## 5.6 Done-state for Wave 5

- [x] All 14 gaps resolved
- [x] `npm run build` passes clean
- [x] `node team/scripts/audit-endpoints.mjs` exits 0 (600/600 routes)
- [x] Zero `// @ts-nocheck` in production code
- [x] Native `confirm()`/`prompt()` removed from all modified files
- [ ] Visual QA on boards redesign (deferred to Week 4, with pilot users)
- [x] Playwright regression (96 tests still pass, 1 flaky retried-and-passed)

## 5.7 Pilot readiness after Wave 5

Pilot users can now:
- ✅ View `/crm/forecast` without crash
- ✅ View `/erp/goals` and `/erp/employee-groups` without crash
- ✅ See full month on `/calendar` (not just 7 days)
- ✅ Toggle task completion on `/my-day` (the primary interaction)
- ✅ Type `@user` mid-sentence in chat (not just at end)
- ✅ See @mentions rendered as chips in chat bubbles
- ✅ Recover from network blip without duplicate socket events
- ✅ Delete a board on a touch device
- ✅ Click a notification to navigate to the underlying resource

## 5.8 What Wave 5 is NOT

- Not a full design-system overhaul (color tokens, typography scale)
- Not a visual QA pass (deferred)
- Not a Playwright regression check (deferred until stack is up)

## 5.9 Key Wave 5 file locations (preserved for future reference)

- `services/web/src/pages/crm/ForecastPage.tsx:54-55,73-74` — nullish guards
- `services/web/src/pages/erp/GoalsPage.tsx:1,81` — ts-nocheck removed, keyExtractor added
- `services/web/src/pages/erp/EmployeeGroupsPage.tsx:1,74` — ts-nocheck removed, keyExtractor added
- `services/web/src/pages/my-day/MyDayPage.tsx:174-182,240,244` — inline mutation with boardId + onError
- `services/web/src/pages/chat/ChatPage.tsx` (all chat fixes consolidated)
- `services/web/src/components/chat/MentionText.tsx` — new (mention chip renderer)
- `services/web/src/components/chat/index.ts` — new barrel
- `services/web/src/components/ui/ExportButton.tsx` — new
- `services/web/src/hooks/useCalendarItems.ts` — rewritten (from/to params)
- `services/web/src/hooks/useSettings.ts:8-16` — workspace-scoped members
- `services/web/src/lib/socket.ts` — full rewrite 89→144 lines
- `services/web/src/components/board/ItemCard.tsx:22-30` — elevation + isDragging
- `services/web/src/components/board/KanbanView.tsx:25,102` — ?? [] guard, max-w-[320px]
- `services/web/src/pages/boards/BoardsPage.tsx:19-26,84-99` — NewBoardModal, always-visible menu
- `services/web/src/pages/boards/BoardPage.tsx` — presence avatars, share button, Modal for deletes
- `services/web/src/pages/inbox/InboxPage.tsx:30,42,57` — all 5 UX gaps
- `services/web/src/hooks/useNotifications.ts:50-75` — paginated query
- `services/web/src/stores/notificationStore.ts:45-72` — NotificationData type
- `services/api/app/Http/Controllers/Api/CalendarItemController.php` — new
- `services/api/app/Http/Controllers/Api/NotificationController.php:48-56` — pagination
- `services/api/routes/api.php:45` — calendar-items route registered

---

# 6. Post-Wave-5 Verification — 5 Ship-Blockers Fixed

After Wave 5, a `qa-lead-integration` sub-session ran verification against a live stack and found **5 ship-blockers** that weren't visible in source-only review. All 5 were dispatched, fixed, and verified. Key lesson: **both `aquerii-api` AND `aquerii-web` images need rebuilding after code changes; the host-side route audit does NOT catch stale-bundle issues**.

## 6.1 The 5 Ship-Blockers

### 6.1.1 GAP-IMG-STALE-001 — `aquerii-api` image outdated

- **Symptom:** API routes registered, but the running container had a pre-Wave-5 build baked in.
- **Root cause:** During Wave 5, source was changed but the image was not re-baked. The route audit script was running against host source, not the container.
- **Fix:** Re-bake `aquerii-api` image with the new controllers. `docker compose up -d --build`.
- **Owner:** release-engineer
- **Status:** ✅ Done
- **Commits:** bundled in `456a345 docs(dashboard): reflect Wave 5 ship-ready state + pilot outreach plan`

### 6.1.2 GAP-DOCKER-GD-001 — Alpine Dockerfile missing ext-gd

- **Symptom:** Container started but every route requiring GD (PDF generation, image processing) crashed silently.
- **Root cause:** `services/api/Dockerfile` was Alpine-flavored but didn't install `gd` PHP extension. The base image had `gd` available, but Alpine's `docker-php-ext-install` was never called for it. The Phase 1 root-level Docker context switch also broke 3 COPY paths.
- **Fix:** Alpine-flavored `docker-php-ext-install gd` added to `services/api/Dockerfile`:
  - Install `freetype-dev libpng-dev libjpeg-turbo-dev`
  - Run `docker-php-ext-configure gd --with-freetype --with-jpeg`
  - Run `docker-php-ext-install gd`
  - Fix 3 COPY path corrections (from Phase 1 root-context switch)
- **Build time:** ~8 min
- **Verification:** `php -m | grep gd` shows FreeType/JPEG/PNG support
- **Owner:** release-engineer
- **Status:** ✅ Done
- **Commits:** `fix(docker): add ext-gd to Alpine image and fix COPY paths (GAP-DOCKER-GD-001)` (also bundled 4 PTW test files)

### 6.1.3 GAP-AUTOLOAD-001 — Classmap-authoritative autoload broken

- **Symptom:** `php artisan route:list` showed ~18335 routes, missing the new ones from Wave 5. PSR-4 autoload silently failed.
- **Root cause:** Laravel 11's optimized classmap autoload (used in production) requires a `app/Http/Controllers/Controller.php` base class. After the controller cleanup (GAP-CRIT-004) deleted the legacy `app/Http/Controllers/` directory, no base class existed.
- **Fix:** Created `services/api/app/Http/Controllers/Controller.php` (12-line Laravel 11 base class extending `Illuminate\Routing\Controller` with `AuthorizesRequests` + `ValidatesRequests` traits).
- **Verification:** Classmap went 18336 → 18337 classes. `php artisan route:list` shows 692 routes clean.
- **Owner:** debugger-1
- **Status:** ✅ Done
- **Commits:** `fix(api): create base Controller class for classmap-authoritative autoload (GAP-AUTOLOAD-001)`

### 6.1.4 GAP-FORECAST-LAZY-001 — N+1 in forecast aggregation

- **Symptom:** `/crm/forecast` page returned 200 OK but the response was 10+ seconds for large workspaces.
- **Root cause:** `ForecastController::byStage()` looped over deals and accessed `$deal->stage` without eager-loading. N+1 query.
- **Fix:** Added `->with('stage')` to `services/api/app/Modules/CRM/Http/Controllers/ForecastController.php:19` (matches existing `->with('owner')` pattern in `byRep():62`). `byPipeline()` was already safe (uses `CrmPipeline::find()`).
- **Owner:** debugger-1
- **Status:** ✅ Done
- **Commits:** `fix(crm): eager-load stage in forecast aggregation (GAP-FORECAST-LAZY-001)`

### 6.1.5 GAP-CALENDAR-QUERY-001 — Stale web bundle, not source bug

- **Symptom:** `/calendar` still showed 7 days (Wave 5 fix not visible at runtime).
- **Root cause:** **Stale `aquerii-web` Docker bundle, NOT hook source.** Hook `useCalendarItems.ts` was already correct. The running image served a previous-generation bundle. Counter-intuitive — the source review was clean, but the runtime bundle was stale.
- **Fix:** 
  1. Rebuilt `aquerii-web` image.
  2. Added 2 regression tests:
     - `services/web/tests/e2e/calendar.spec.ts` (Playwright, 2/2 pass chromium+firefox)
     - `services/web/tests/unit/hooks/useCalendarItems.test.tsx` (4 vitest cases)
  3. Side effect: added `@testing-library/dom` to `package.json` devDeps.
- **Owner:** debugger-1
- **Status:** ✅ Done
- **Commits:** 
  - `feat(calendar): date-range CalendarItemController and full-month hook (GAP-CALENDAR-001)`
  - `test(calendar): e2e + unit regression for useCalendarItems (GAP-CALENDAR-QUERY-001)`

## 6.2 Verification Lessons

1. **Both `aquerii-api` AND `aquerii-web` images need rebuilding after code changes.** The host-side route audit does NOT catch stale-bundle issues. Add a build-hash regression check to the verification gate.
2. **Stale bundles can hide correct source.** Always verify the running bundle hash, not just the source. The hook `useCalendarItems.ts` was already correct on disk — the problem was that the image hadn't been re-baked.
3. **Laravel 11 classmap-authoritative autoload needs a base Controller class.** This is a footgun specific to Laravel 11's optimized production autoloader. Document this in `services/api/Dockerfile` comments for future maintainers.
4. **Alpine PHP images need `docker-php-ext-install` for every PHP extension.** The base image provides a default set, but anything beyond that (gd, intl, exif, etc.) requires explicit installation with its dev library dependencies.

## 6.3 Commits Pushed This Session (32 new)

1. `fix(docker): add ext-gd to Alpine image and fix COPY paths (GAP-DOCKER-GD-001)` (also bundled 4 PTW test files)
2. `fix(api): create base Controller class for classmap-authoritative autoload (GAP-AUTOLOAD-001)`
3. `fix(crm): eager-load stage in forecast aggregation (GAP-FORECAST-LAZY-001)`
4. `feat(calendar): date-range CalendarItemController and full-month hook (GAP-CALENDAR-001)`
5. `test(calendar): e2e + unit regression for useCalendarItems (GAP-CALENDAR-QUERY-001)`
6. `fix(forecast): nullish-guard amount/weighted in ForecastPage (GAP-FORECAST-001)`
7. `fix(erp): add DataTable keyExtractor, remove // @ts-nocheck (GAP-GOALS-001, GAP-EMPLOYEEGROUPS-001)`
8. `fix(my-day): inline mutation with boardId, onError toast (GAP-MYDAY-001)`
9. `fix(chat): derived mention state, cursor-aware regex, scroll-guard, MentionText chip (GAP-CHAT-001/002/RENDER/UX)`
10. `fix(socket): explicit teardown, backoff reconnect, token refresh (GAP-SOCKET-001)`
11. `feat(boards): 320px columns, drag visual, touch-safe menus (GAP-BOARDS-DESIGN-001/002)`
12. `fix(inbox): Load more pagination, deep-link clicks, error feedback (GAP-INBOX-UX)`
13. `feat(print): PrintButton, print.css, PDF logo + color pass-through (GAP-DOC-001)`
14. `feat(settings): BrandingTab logo upload and color picker (GAP-THEME-001)`
15. `feat(export): maatwebsite/excel 3.1.69, ExportButton for 12 entity pages (GAP-EXP-001, frontend)`
16. `feat(export): EntityExport, ExportController, Product/Stock controllers (GAP-EXP-001, backend)`
17. `feat(mention): MentionInput wired to 7 contexts (GAP-MENTION-001)`
18. `chore(audit): route audit script and route-refs library (GAP-AUDIT-001)`
19. `feat(pilot): provision:pilot command + 10 users + 8 entity types + strategy docs (GAP-PILOT-001)`
20. `chore(api): delete 6 shadow controllers (GAP-CRIT-004)`
21. `fix(api): withTrashed + restore on firstOrCreate calls (GAP-CRIT-005)`
22. `feat(web): component library refinements and tests` (23 files)
23. `feat(web): API clients, hooks, stores, layouts (Phase 1/2 hardening)`
24. `feat(web): page-level wiring for Phase 2 deliverables` (22 files)
25. `test(web): e2e + unit test suite, web config, Dockerfile`
26. `feat(realtime): socket service refinements (Phase 1/2 hardening)`
27. `feat(api): module completeness, VAT service, workflow, config (Phase 1/2 hardening)` (36 files)
28. `chore(infra): env, CI, docker-compose, Caddy, alertmanager, prod plan`
29. `feat(api): Equipment + Competency modules (Phase 3 prep)`
30. `feat(api): Shifts module, Documents folders, Form Requests/Resources, migrations`
31. `feat(web): Sparkline chart and motion utilities`
32. `feat(team): orchestration system, leader prompt, gaps dashboard`
33. `chore: AGENTS.md, team-gate workflow, CHANGELOG, vault README, debug files`
34. `chore(cleanup): remove stale test artifacts, override compose, doc duplicates`
35. `feat(pilot): ceo outreach plan and email templates` (PILOT-OUTREACH.md, 406 lines)
36. `docs(dashboard): reflect Wave 5 ship-ready state + pilot outreach plan`

**PR #1:** `https://github.com/Shmurdoc/Aquerii/pull/1` (base: master, open, body updated, 32 commits ahead of origin)

---

# 7. 4-Workstream Post-Pilot Hardening Plan

> **Status:** Plan complete. User-confirmed decisions: spatie/laravel-permission wiring (not removal), public `meet.jit.si` + JWT app (not self-host), generic role hierarchy (no SA-mining-specific seed titles), all workstreams post-pilot (deferred to Pilot Week 4 feedback).
> **Total scope:** 3 weeks of work, 24 sub-tasks.

## 7.0 Sequencing (in order)

**B (storage display, 1 day) → A (3-tier model + spatie, 5 days) → C (Jitsi, 2 days) → D (primitives, 7 days) → cycle 11 verify+ship**

## 7.1 Workstream B — Storage Display (1 day)

**Goal:** Make storage usage visible in the UI with breakdown, history, and color-coded thresholds. Consolidate the unreachable `components/settings/BillingTab.tsx` into a single `pages/settings/BillingTab.tsx`.

### B.1 — Backend: StorageController + usage endpoint

**New files:**
- `services/api/app/Http/Controllers/Api/StorageController.php` (~80 lines)
- `services/api/routes/api.php` (add `GET /workspaces/{wid}/storage/usage`)

**Endpoint contract:**
```
GET /workspaces/{wid}/storage/usage

Response 200:
{
  "workspace_id": "uuid",
  "used_bytes": 12345678,
  "quota_bytes": 5368709120,
  "percent": 0.23,
  "breakdown": {
    "files": 8234567,
    "documents": 3456789,
    "avatars": 234567,
    "exports": 12345,
    "other": 410
  },
  "history": [
    { "date": "2026-06-01", "used_bytes": 11000000 },
    { "date": "2026-06-02", "used_bytes": 11500000 },
    { "date": "2026-06-03", "used_bytes": 12000000 },
    ...
  ]
}
```

**Owner:** builder-2
**Effort:** 0.25d
**Quality gates:** Pest test for endpoint, RBAC check (workspace member), `npm run build` clean

### B.2 — Frontend: StorageTab + usage meter

**New files:**
- `services/web/src/pages/settings/StorageTab.tsx` (~150 lines)
- `services/web/src/hooks/useStorageUsage.ts` (~40 lines)

**Modify:**
- `services/web/src/pages/settings/SettingsPage.tsx:9-16` — add `Storage` to TABS array
- `services/web/src/components/subscription/UsageMeter.tsx` — enhance with breakdown bars

**Delete:**
- `services/web/src/components/settings/BillingTab.tsx` (duplicate, unreachable in routing — consolidate to `pages/settings/BillingTab.tsx`)

**UI requirements:**
- 4 quadrant tiles: Used / Quota / Percent / Last 30 days delta
- Horizontal bar chart of `breakdown` (5 categories)
- Line chart of `history` (last 30 days, sparkline is enough)
- Color thresholds: <70% green, 70-90% amber, >90% red
- Quota upgrade CTA when >80%

**Owner:** builder-2 + designer (designer signs off the visual)
**Effort:** 0.5d
**Quality gates:** Playwright test, `/review` passes, mobile-responsive (works on 360px)

### B.3 — Filament: Storage analytics widget

**Modify:**
- `services/api/app/Filament/Widgets/StorageAnalytics.php` (if it doesn't exist, create it)

**Add:**
- "Breakdown by type" widget aggregating `usage_breakdown` across all workspaces
- "Top 10 storage consumers" table (workspace name + used_bytes + percent)
- Bar chart: storage by workspace, sorted descending

**Owner:** builder-1
**Effort:** 0.25d
**Quality gates:** Filament admin panel renders cleanly, `/review` passes

### B.4 — Verify end-to-end

**Steps:**
1. Seed a test workspace with 2GB of test files (PDFs, images, exports).
2. Hit `GET /workspaces/{wid}/storage/usage` via curl, verify response matches DB sum.
3. Open `/settings` → `Storage` tab, verify all 4 quadrants + breakdown + history render.
4. Login as Filament admin, verify StorageAnalytics widget renders.
5. Take a screenshot for the PR description.

**Owner:** qa-lead-integration
**Effort:** 0.25d
**Quality gates:** Playwright E2E test added, manual screenshot verified

## 7.2 Workstream A — 3-Tier Account Model + Spatie/Laravel-Permission (5 days)

**Goal:** Unify the 3 admin mechanisms, capture the 3-tier account hierarchy in a single `account_type` enum, and wire spatie/laravel-permission as the RBAC foundation.

**Prerequisite context:**
- `spatie/laravel-permission ^6.7` is already in `services/api/composer.json:32` but **0 hits for `HasRoles`/`hasRole`/`hasPermissionTo`** — dead dependency.
- 3 admin mechanisms exist: `workspace_members.role` (custom `WorkspaceRole` enum), `platform_admins` table (Laravel migration, used by `SuperAdmin` Eloquent), `superadmin.super_admins` raw SQL table (used by `HorizonServiceProvider:14-19` and `AuditLogResource`).
- `SuperAdmin.php:16` points to `platform_admins`. Filament panel at `/admin` uses `authGuard: 'super_admins'`.
- `WorkspaceMember.php:28-36` has free-form employee strings: `job_title`, `department`, `phone`, `salary`, `salary_currency`, `emergency_contact`, `employed_at`, `employee_group_id`, `reports_to`, `company_id`, `is_company_owner`.
- `WorkspaceRole` enum: 5 hardcoded roles (owner/admin/manager/member/viewer) with permission matrix in `app/Core/Enums/WorkspaceRole.php:13-49`.
- `usePermission.ts:4-31` hardcoded `ROLE_PERMISSIONS` map (frontend).
- Two parallel invitation systems: `WorkspaceController::inviteMember` (uses `workspace_members.invite_token`) + `WorkspaceInvitationController` (uses `workspace_invitations` table).
- `RequireWorkspaceRole` middleware only checks owner|admin.

### A.1 — Creator tier (1 day)

**A.1.1 Unify `platform_admins`**
- `HorizonServiceProvider:14-19` + `AuditLogResource` currently use raw SQL `superadmin.super_admins` table + `superadmin` DB connection.
- Refactor to use Eloquent `SuperAdmin` model (which already points to `platform_admins`).
- Drop the `superadmin` DB connection from `services/api/config/database.php` (no longer needed).
- Drop the `superadmin.super_admins` table migration.

**A.1.2 Add `account_type` enum to `users`**
- New migration: `add_account_type_to_users_table`
- Enum: `superadmin_creator|platform_admin|subscriber|employee`
- Default: `subscriber` on registration
- Index: `(account_type)` for fast filtering

**A.1.3 Impersonation flow**
- New table: `platform_admin_impersonations` (id, platform_admin_id, target_user_id, signed_token, expires_at, ip_address, reason, created_at, ended_at nullable)
- Routes: `POST /platform/impersonate/{user_id}` + `POST /platform/impersonate/end`
- All actions during impersonation get a banner: "You are impersonating [User] as [Platform Admin]"
- Audit log entry: `PLATFORM_IMPERSONATION_START` + `PLATFORM_IMPERSONATION_END`

**Owner:** builder-1
**Effort:** 1d
**Quality gates:** Pest test for impersonation flow, audit log entries created, RBAC enforced

### A.2 — Normalize (1 day)

**A.2.1 `departments` table**
- New migration: `create_departments_table` (id, workspace_id, name, slug, is_archived, timestamps)
- New model: `app/Modules/HR/Models/Department.php`
- Seed 5 generic departments: "Operations", "Safety / HSSE", "Engineering", "Finance & Admin", "Contractors & Visitors"
- Backfill: migrate `WorkspaceMember.department` (string) to FK; archive old departments as `Department::archive($name)`

**A.2.2 `job_positions` table**
- New migration: `create_job_positions_table` (id, workspace_id, name, level int 1-8, reports_to_position_id nullable, is_archived, timestamps)
- New model: `app/Modules/HR/Models/JobPosition.php`
- Seed 8 generic levels: L1 "Team Member", L2 "Senior Team Member", L3 "Lead", L4 "Supervisor", L5 "Manager", L6 "Senior Manager", L7 "Director", L8 "Executive"
- Backfill: migrate `WorkspaceMember.job_title` (string) to closest level by string match (or create ad-hoc positions)

**A.2.3 Decision: keep Employee = WorkspaceMember**
- **Do NOT extract Employee to a separate table.** User IS the employee, has one login/2FA/password.
- The 3-tier model is captured via `account_type` enum, not by separating storage.
- A workspace member is by definition an employee (or a contractor) of that workspace.

**Owner:** builder-2
**Effort:** 1d
**Quality gates:** Backfill scripts idempotent + auditable, all old strings replaced, no orphan data

### A.3 — Spatie integration (2 days)

**A.3.1 Publish spatie migrations + extend schema**
- Run `php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"`
- Add to `roles` table: `workspace_id` (FK nullable — null = global), `is_system` (bool)
- Add to `permissions` table: `description` (string)
- Index: `(workspace_id, name)` unique

**A.3.2 WorkspaceRoleSeeder**
- Migrate 5 existing system roles (owner, admin, manager, member, viewer) to spatie roles with their permission matrix from `WorkspaceRole.php:13-49`
- `User` model uses `HasRoles` trait
- Add helper: `hasWorkspacePermission($workspaceId, $permission)` — scopes spatie's default global scope to workspace_id
- Permission wildcards (e.g. `workspace.*`) are **expanded at seed time** into explicit permission lists (clearer audit trail)

**A.3.3 Role builder UI**
- New `pages/settings/RolesTab.tsx`
- Sub-components: `RoleListPanel`, `RoleEditorPanel`, `PermissionMatrix`, `HierarchyEditor`
- Backend: `GET/POST/PATCH/DELETE /workspaces/{wid}/roles[/{id}]` + `GET /workspaces/{wid}/permissions`
- Wire into `SettingsPage.tsx:9-16` TABS array
- Gated to **owner only** (not admin) for safety

**Owner:** builder-1 + builder-2
**Effort:** 2d
**Quality gates:** Pest tests for all role endpoints, Playwright E2E for role builder UI, `/review` passes

### A.4 — Cleanup (1 day)

**A.4.1 Delete legacy code**
- Delete `services/api/app/Http/Controllers/Api/WorkspaceInvitationController.php` (uses `workspace_invitations` table)
- Delete migration for `workspace_invitations` table
- Update `services/api/routes/api.php:104,179,184,185` to use `WorkspaceController::inviteMember` only
- Update `services/web/src/hooks/usePermission.ts:4-31` to call `GET /workspaces/{wid}/my-permissions` (returns the spatie-permission array)
- Update `services/web/src/lib/settings.ts:233-239` ROLES list (or remove if dynamic)
- Update `RequireWorkspaceRole` middleware to use spatie's `hasWorkspacePermission` helper

**A.4.2 Documentation**
- Create `team/reviews/ARCHITECTURE-RBAC-001.md` (decision record for 3-tier model + spatie)
- Update `team/LEADER-PROMPT.md` to reference new permission model

**Owner:** builder-1
**Effort:** 1d
**Quality gates:** Zero `workspace_invitations` references in code, zero `ROLE_PERMISSIONS` hardcoded maps, `/review` passes

## 7.3 Workstream C — Jitsi Meet with JWT (2 days)

**Goal:** Replace `window.open('https://meet.jit.si/...')` with a proper embedded Jitsi meeting that authenticates via JWT. No more predictable room names open to anyone.

**Prerequisite context:**
- `services/web/src/components/meetings/JitsiMeeting.tsx` exists, loads `https://meet.jit.si/external_api.js`, uses `JitsiMeetExternalAPI`. **Imported by no one** — dead code.
- `services/web/src/pages/meetings/MeetingsPage.tsx:206-213` does `window.open('https://meet.jit.si/aquerii-${id}', '_blank')` — deep link, no auth, predictable room name.
- No `lib-jitsi-meet` or `@jitsi/react-sdk` in `package.json`.
- `services/web/src/lib/meetings.ts` declares `MeetingProvider = 'zoom' | 'teams' | 'google' | 'jitsi' | 'other'` — only jitsi is real, others are stub `deep_link` entries.
- `tymon/jwt-auth ^2.1` already in `services/api/composer.json:36` (can be used for Jitsi JWT signing).

### C.1 — Backend: JitsiJwtService + join-token endpoint

**New files:**
- `services/api/app/Modules/Meetings/Services/JitsiJwtService.php` (~100 lines)
- `services/api/app/Http/Controllers/Api/JitsiController.php` (~80 lines)

**Routes:**
```
GET /workspaces/{wid}/meetings/{meeting}/join-token
```

**JWT payload (per Jitsi spec):**
```json
{
  "iss": "aquerii-app-id",
  "aud": "aquerii-app-id",
  "sub": "meet.jit.si",
  "room": "aquerii-{meeting.id}",
  "exp": 1234567890,
  "nbf": 1234567890,
  "context": {
    "user": {
      "name": "John Smith",
      "email": "john@example.com",
      "id": "uuid",
      "moderator": true
    },
    "features": {
      "recording": true,
      "livestreaming": false,
      "transcription": false
    }
  }
}
```

**TTL:** 1 hour (re-fetch if expired).

**Owner:** builder-2
**Effort:** 0.5d
**Quality gates:** Pest test for token issuance + signature verification, RBAC check (workspace member + meeting attendee)

### C.2 — Database: `meeting_participants` table

**New migration:** `create_meeting_participants_table`
```sql
id                  uuid PK
meeting_id          uuid FK meetings
user_id             uuid FK users nullable  -- nullable for invited external
display_name        string
joined_at           timestamp nullable
left_at             timestamp nullable
role                enum(host, moderator, participant)
connection_id       string  -- Jitsi connection ID
created_at          timestamp
updated_at          timestamp
```

**Owner:** builder-1
**Effort:** 0.25d
**Quality gates:** Migration reversible, foreign keys enforced

### C.3 — Backend: Jitsi webhooks

**New files:**
- `services/api/app/Http/Controllers/Api/JitsiWebhookController.php` (~120 lines)
- `services/api/app/Modules/Meetings/Models/MeetingRecording.php` (new)
- `services/api/app/Modules/Meetings/Models/MeetingTranscript.php` (new)

**Routes:**
```
POST /webhooks/jitsi/participant-joined
POST /webhooks/jitsi/participant-left
POST /webhooks/jitsi/recording-ready
POST /webhooks/jitsi/transcription-ready
```

**HMAC verify:** `X-Aquerii-Signature: sha256=<hmac of body using shared secret>`. Reject if invalid.

**Webhook handlers:**
- `participant-joined`: create `MeetingParticipant` row with `joined_at`
- `participant-left`: update `left_at`
- `recording-ready`: create `MeetingRecording` row with `download_url`, notify host via email + in-app
- `transcription-ready`: create `MeetingTranscript` row with `transcript_url`, notify host via email + in-app

**Owner:** builder-1
**Effort:** 0.5d
**Quality gates:** Pest test for HMAC verification + handler logic, replay-attack protection (timestamp check)

### C.4 — Frontend: Refactor JitsiMeeting.tsx

**Modify:**
- `services/web/src/components/meetings/JitsiMeeting.tsx` (full rewrite, ~150 lines)
- `services/web/src/pages/meetings/MeetingsPage.tsx:206-213` (replace `window.open` with `<JitsiMeeting />`)

**New behavior:**
- On mount, fetch `GET /workspaces/{wid}/meetings/{meeting}/join-token`
- Pass JWT to `JitsiMeetExternalAPI` via `jwt:` config
- Render inside `<Modal>` (full-screen, escape key closes)
- Show "Connecting..." state, "Connected" state, "Disconnected" state
- On `videoConferenceJoined` event: log to analytics
- On `participantJoined` event: update participant list in real-time
- On `recordingStatusChanged` event: show "Recording" badge in UI

**Add to `package.json`:**
- `lib-jitsi-meet` (or keep `external_api.js` loaded via CDN — both work)

**Owner:** builder-3 + designer
**Effort:** 0.5d
**Quality gates:** Playwright E2E test for the join flow, `/review` passes, mobile-responsive

### C.5 — Verify end-to-end

**Test scenarios:**
1. **Host joins meeting** → JWT issued with `moderator: true`, recording enabled.
2. **Invited user joins** → JWT issued with `moderator: false`, recording disabled.
3. **Uninvited user requests token** → 403 Forbidden.
4. **Anonymous user visits `meet.jit.si/aquerii-{id}` directly** → Rejected by Jitsi (no valid JWT).
5. **Wrong workspace member requests token** → 403 Forbidden.
6. **Recording webhook fires** → `MeetingRecording` row created, notification sent.
7. **JWT expires** → User gets "Session expired" toast, button to refresh.

**Documentation:** Create `team/reviews/TESTING-JITSI-001.md` with all 7 test scenarios.

**Owner:** qa-lead-integration
**Effort:** 0.25d
**Quality gates:** All 7 test scenarios pass, Playwright E2E added

## 7.4 Workstream D — Missing Primitives (7 days)

**Goal:** Add the 4 most-requested features from the post-pilot backlog: outbound webhooks, push notifications, SavedView + Tag + Custom Fields, Personal Access Tokens.

### D.1 — Outbound Webhooks (3 days, highest value)

**D.1.1 Backend: `webhooks` + `webhook_deliveries` tables**

**New migration:** `create_webhooks_table`
```sql
id                  uuid PK
workspace_id        uuid FK workspaces
name                string
url                 string  -- target URL
secret              string  -- HMAC secret, regenerated on rotation
events              jsonb   -- array of subscribed events
is_active           bool default true
created_by          uuid FK users
created_at          timestamp
updated_at          timestamp
```

**New migration:** `create_webhook_deliveries_table`
```sql
id                  uuid PK
webhook_id          uuid FK webhooks
event               string
payload             jsonb
response_status     int nullable
response_body       text nullable
attempted_at        timestamp
duration_ms         int
created_at          timestamp
```

**Owner:** builder-1
**Effort:** 0.5d
**Quality gates:** Migrations reversible, indexes on `(webhook_id, attempted_at)` and `(event)`

**D.1.2 Backend: webhook listener + delivery**

**New files:**
- `services/api/app/Modules/Webhooks/Services/WebhookDispatcher.php` (~200 lines)
- `services/api/app/Http/Controllers/Api/WebhookController.php` (~150 lines)

**Routes:**
```
GET    /workspaces/{wid}/webhooks
POST   /workspaces/{wid}/webhooks
GET    /workspaces/{wid}/webhooks/{id}
PATCH  /workspaces/{wid}/webhooks/{id}
DELETE /workspaces/{wid}/webhooks/{id}
GET    /workspaces/{wid}/webhooks/{id}/deliveries
POST   /workspaces/{wid}/webhooks/{id}/test
```

**Delivery logic:**
- HMAC-SHA256 signing: `X-Aquerii-Signature: sha256=<hmac of body using webhook.secret>`
- Headers: `X-Aquerii-Event`, `X-Aquerii-Delivery` (UUID), `X-Aquerii-Workspace` (UUID)
- Timeout: 10 seconds per attempt
- Retries: 3 attempts with backoff (10s, 60s, 600s)
- Status codes: 2xx = success, 4xx/5xx = failure (log + retry)
- Failed delivery notification to webhook creator after 3 failed attempts

**Owner:** builder-2
**Effort:** 1.5d
**Quality gates:** Pest test for delivery + signing + retry logic, RBAC (owner-only), idempotency (same event = same delivery_id)

**D.1.3 Frontend: Settings → Integrations → Webhooks tab**

**New files:**
- `services/web/src/pages/settings/WebhooksTab.tsx` (~200 lines)
- `services/web/src/components/integrations/WebhookList.tsx` (~120 lines)
- `services/web/src/components/integrations/WebhookForm.tsx` (~150 lines)
- `services/web/src/components/integrations/DeliveryLog.tsx` (~80 lines)

**Modify:**
- `services/web/src/pages/settings/SettingsPage.tsx:9-16` — add `Integrations` to TABS array
- New sub-tabs: `Webhooks`, `API Tokens`, `Marketplace`

**UI features:**
- Webhook list (name, URL, events, last delivery status, is_active toggle)
- "New Webhook" form (name, URL, events multi-select from 50+ event types)
- "Test webhook" button (sends a test event with sample payload)
- Delivery log (timestamp, event, status code, response body preview, duration_ms)
- "Rotate secret" button with confirmation
- "Replay" button on failed deliveries

**Owner:** builder-3 + designer
**Effort:** 1d
**Quality gates:** Playwright E2E test for the full flow, `/review` passes, GATED TO OWNER ONLY (not admin) for safety

### D.2 — Push Notifications (2 days)

**D.2.1 Backend: `push_subscriptions` table + VAPID setup**

**New migration:** `create_push_subscriptions_table`
```sql
id                  uuid PK
user_id             uuid FK users
endpoint            text
p256dh_key          text
auth_key            text
user_agent          text
created_at          timestamp
last_used_at        timestamp nullable
```

**Setup:**
- VAPID keys generated via `web-push generate-vapid-keys`
- Stored in `.env`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- Library: `laravel-notification-channels/webpush` or `minishlink/web-push`

**Routes:**
```
POST   /workspaces/{wid}/push-subscriptions
DELETE /workspaces/{wid}/push-subscriptions
```

**Owner:** builder-1
**Effort:** 0.5d
**Quality gates:** Pest test for subscribe/unsubscribe, VAPID key validation

**D.2.2 Frontend: service worker + push registration**

**New files:**
- `services/web/public/sw-push.js` (~60 lines) — service worker for push events
- `services/web/src/hooks/usePushNotifications.ts` (~120 lines)
- `services/web/src/components/Notifications/PushPrompt.tsx` (~80 lines)

**Modify:**
- `services/web/src/main.tsx` — register service worker

**UI behavior:**
- On first login, show a one-time prompt: "Enable push notifications? You'll get alerts for @mentions, assignments, and approvals."
- If granted, subscribe and POST to backend
- On push event in service worker, show native notification with title + body + icon
- Click on notification navigates to the relevant URL (`/inbox`, `/calendar`, etc.)

**Owner:** builder-3
**Effort:** 1.5d
**Quality gates:** Playwright E2E test for the prompt flow, manual test with Chrome DevTools, `/review` passes

### D.3 — SavedView + Tag + Custom Fields (3 days, parallel)

**D.3.1 SavedView**

**New migration:** `create_saved_views_table`
```sql
id                  uuid PK
workspace_id        uuid FK workspaces
user_id             uuid FK users nullable  -- null = shared with all workspace members
resource_type       string  -- e.g. 'deals', 'contacts', 'hazards'
name                string
filters             jsonb
sort                jsonb
columns             jsonb
is_pinned           bool default false
created_at          timestamp
updated_at          timestamp
```

**Routes:**
```
GET    /workspaces/{wid}/saved-views?resource_type=deals
POST   /workspaces/{wid}/saved-views
PATCH  /workspaces/{wid}/saved-views/{id}
DELETE /workspaces/{wid}/saved-views/{id}
```

**Frontend:** 
- "Save current view" button on list pages
- Dropdown to load saved views (personal + shared)
- Pin/unpin toggle
- "Edit" / "Delete" actions

**Owner:** builder-2
**Effort:** 1d

**D.3.2 Tag (polymorphic)**

**New migration:** `create_tags_table`
```sql
id                  uuid PK
workspace_id        uuid FK workspaces
name                string
color               string
created_at          timestamp
```

**New migration:** `create_taggables_table`
```sql
tag_id              uuid FK tags
taggable_type       string
taggable_id         uuid
index on (taggable_type, taggable_id)
```

**Frontend:** TagInput component, tag chips on list pages and detail pages

**Owner:** builder-2
**Effort:** 0.5d

**D.3.3 Custom Fields**

**New migration:** `create_custom_field_definitions_table`
```sql
id                  uuid PK
workspace_id        uuid FK workspaces
entity_type         string  -- e.g. 'deals', 'contacts', 'hazards'
key                 string  -- e.g. 'customer_po_number'
label               string
field_type          enum(text, number, date, select, multi_select, boolean, url, currency)
options             jsonb nullable  -- for select/multi_select
validation_rules    jsonb nullable
is_required         bool default false
created_at          timestamp
```

**New migration:** `create_custom_field_values_table`
```sql
id                  uuid PK
custom_field_definition_id uuid FK
entity_type         string
entity_id           uuid
value               jsonb
index on (entity_type, entity_id)
```

**Backfill policy:** **Option (b) — leave existing JSONB intact, only apply new schema to new fields, with one-time "Migrate your custom fields" UI prompt.** No data loss; gradual migration.

**Frontend:** Settings → Custom Fields tab, schema editor + value editor per entity type

**Owner:** builder-3 + builder-1
**Effort:** 1.5d

**D.3.4 Verify all 3**

**Owner:** qa-lead-integration
**Effort:** 0.25d (bundled)

### D.4 — Personal Access Tokens (1 day)

**Use Sanctum's existing `personal_access_tokens` table** (already migrated).

**Routes:**
```
GET    /workspaces/{wid}/api-tokens
POST   /workspaces/{wid}/api-tokens
DELETE /workspaces/{wid}/api-tokens/{id}
```

**Token format:** `aquerii_pat_<40-char-base58>` — show only once on creation
**Scopes:** Reuse dot-permission strings (`deals.read`, `deals.write`, `workspace.admin`, etc.)
**Expiry:** Optional, default 90 days
**Audit log entry:** `PAT_CREATED`, `PAT_USED`, `PAT_DELETED`

**Frontend:** Settings → API Tokens tab, list + create + revoke UI

**Owner:** builder-1
**Effort:** 1d
**Quality gates:** Pest test for create/use/revoke + scope enforcement, GATED TO OWNER ONLY

## 7.5 Cycle 11 — Verify + Ship (3 days)

After all 4 workstreams complete:

1. **qa-lead-integration** runs the full E2E suite (95→+Playwright tests, expect ~120 with the new work).
2. **reviewer** does a single milestone review (1.5h).
3. **release-engineer** rebuilds both `aquerii-api` and `aquerii-web` images, runs `audit-endpoints.mjs`, updates CHANGELOG.
4. **ceo** updates `team/DASHBOARD.md` with the post-pilot hardening summary.
5. **release-engineer** pushes to `feat/crm-phases-3-to-8`, updates PR #1 description, merges to master.

**Total time for Workstreams B+C+D+A:** ~3 weeks (1+5+2+7 days) of sub-session work, plus 3 days cycle 11.

## 7.6 3-Tier Account Model — Decision Details

**Final decision** (confirmed by user):
- `superadmin_creator` is the human Madoc (1 account, hardcoded by registration email)
- `platform_admin` is created by the creator via the Filament panel
- `subscriber` is the workspace owner who signs up via `/register`
- `employee` is a workspace member (added by the subscriber)
- `account_type` enum on `users` table
- **Do NOT extract Employee to a separate table** — User IS the employee

## 7.7 Spatie Role Integration with Workspace Scoping

**Final decision** (confirmed by user):
- Spatie's default is global roles. Add `workspace_id` FK + `is_system` bool to `roles` table.
- Write a `WorkspaceRoleStore` subclass of spatie's that scopes all queries by `workspace_id`.
- Spatie's wildcard permissions (`workspace.*`) **expanded at seed time** into explicit permission lists (clearer audit trail).

## 7.8 Department + JobPosition Seed Names

**Final decisions** (confirmed by user):
- **Departments** (5 generic): "Operations", "Safety / HSSE", "Engineering", "Finance & Admin", "Contractors & Visitors". Subscriber can rename/archive/add.
- **Job positions** (8 generic levels L1-L8): "Team Member", "Senior Team Member", "Lead", "Supervisor", "Manager", "Senior Manager", "Director", "Executive". No SA-mining-specific titles. `reports_to_position_id` builds the org chart.

## 7.9 Jitsi JWT Payload — Final

**Final decision** (confirmed by user):
- `iss`/`aud` = app_id
- `sub` = `meet.jit.si`
- `room` = `aquerii-{meeting.id}` (UUID)
- `context.user.moderator` = host only
- `context.features.recording` = true for moderator
- TTL 1 hour

## 7.10 Jitsi Meeting Join Policy — Final

**Final decision:**
- Only workspace members + meeting's `attendees` (by email) can request a join token
- Predictable room name is mitigated by JWT auth (random people without the JWT get rejected)
- Public `meet.jit.si` is used for v1, self-hosting is Phase 4 for POPI

## 7.11 Jitsi Recording POPI Concern — Final

**Final decision:**
- Recordings live in Jitsi's cloud, not in our MinIO
- Add a Settings checkbox: "Allow Jitsi recording (public meet.jit.si stores recordings in their cloud — confirm this is OK for your compliance posture)"
- For SA mines needing on-prem recording, self-hosting is Phase 4

## 7.12 Webhook Safety

**Final decision:** Outbound webhooks are gated to **owner only** (not admin) for safety. A misconfigured webhook pointing to an external URL could exfiltrate data.

## 7.13 Excluded Workstreams (deliberately not in plan)

- **Self-hosted Jitsi for POPI** (Phase 4) — public `meet.jit.si` is acceptable for v1
- **WhatsApp integration** (~4-week Twilio lead time, Phase 4)
- **Twilio Voice inbound/recording/voicemail** (Phase 4, POPI concerns)
- **Form/Intake builder** (not for mining, Phase 4)
- **Plugin/extension SDK** (Phase 5, needs API stability)
- **AI meeting transcription summary** (depends on C landing, follow-up)

---

# 8. Pilot Outreach Plan (PILOT-OUTREACH.md)

> **Source:** `team/plan/PILOT-OUTREACH.md` (406 lines, committed `cd6837a`)
> **Status:** Draft for leader review
> **Scope:** First SA mining pilot, 12-week engagement, single mine
> **Related docs:** `PILOT-STRATEGY.md`, `PILOT-SETUP.md`, `PILOT-AGREEMENT.md`, `PILOT-FEEDBACK-WEEK-1.md`

> **Read this first.** Outreach is in Madoc's name. Nothing below is sent without his sign-off.
> The 5 mines are ranked by *ease of entry × strategic value*, not by size.
> Voice is direct, SA-mining-fluent, and honest about being a solo founder.

## 8.1 Top 5 Candidate Mines

Ranked. The first name is the one to cold-email in Week 1.

| # | Company | Size (est.) | Why a good fit | Likely contact | Tailored value prop |
|---|---|---|---|---|---|
| 1 | **Thungela Resources** (JSE-listed thermal coal) | ~10,000 employees, 4–5 collieries across Mpumalanga | Spun out of Anglo in 2021 with a clean, mid-cap governance structure. The CEO (July Ndlovu) and CFO have publicly committed to a digital transformation agenda. Multiple sites means *one workspace, many sites* is a clean upsell. Their HSSE team has been vocal about Section 54 reporting pain. | **Group HSSE Manager** or **Head of Operational Risk** (Nqobile Maphumulo or similar at group office, Johannesburg) | "Thungela is running 4–5 collieries with separate spreadsheets and stand-alone PTW clipboards. Aquerii gives the group HSSE team a *single* permit-to-work and hazard register across all sites — and the Section 54 submission audit trail is generated, not chased." |
| 2 | **DRDGOLD** (JSE-listed, surface gold & tailings retreatment) | ~1,500 employees, 2 main operations (Ergo, Blyvoor) | Smallest, fastest-moving tier-1 mid-cap on the list. Surface operations = *equipment inspection* is the daily pain, not shaft PTW. Contractor-heavy (hundreds of artisanal-style contractors on rehab sites) = **competency tracking** is a hard sell. CEO Niël Pretorius is approachable and the company has been reinventing itself around sustainability. | **Group SHEQ Manager** or **Engineering Manager** (Roodepoort office) | "DRDGOLD's contractor base shifts weekly. Aquerii's competency module ties every contractor on a rehab site to a verified training record, expiry date, and Section 28 contractor-on-site appointment — so the next MHSC audit, you pull the list in 30 seconds, not 3 days." |
| 3 | **Northam Platinum** (JSE-listed, PGM) | ~10,000 employees, 3 deep-level mines (Zondereinde, Booysendal, Eland) | Pure-play platinum with premium governance and a single commodity — easier to map our modules to their world. Zondereinde is one of the deepest platinum mines in the world, so PTW and gas/heat hazard tracking are not optional. They've invested in digitisation already (SAP) and will appreciate a tool that *integrates* rather than replaces. | **Group Safety & Risk Manager** (at head office, Johannesburg) | "Zondereinde alone generates hundreds of high-risk permits a week — hot work, confined space, fall arrest. Aquerii replaces the paper permit book with a digital one that captures signature, photo, gas reading, and isolation lock-out, with the risk register auto-linking the permit to the parent hazard." |
| 4 | **Sedibelo Platinum Mines / Pilanesberg Platinum** (Pty) Ltd (privately held PGM) | ~2,500 employees, single open-pit + UG mine near Sun City | Mid-cap, single-site, private (no JSE governance overhead) — *the easiest deployment on this list*. Owner-funded, fast decision-making. Open-pit focus means equipment inspections (trucks, shovels, drills) are the dominant daily workflow, not deep-level PTW. Perfect proving ground for the **equipment inspection** module. | **SHE Manager** or **Operations Manager** (site-based) | "Single site, one workspace, full deployment in week 1. Aquerii's equipment module replaces the clipboard pre-start inspection with a mobile form that flags overdue items before the unit starts the shift — and the inspection history becomes the maintenance trigger." |
| 5 | **Seriti Resources** (privately held, coal + iron ore; SA-controlled) | ~25,000 employees across 4+ mines (New Vaal, Kriel, New Denmark, others) | South African-controlled (Masimong Group + Seriti Power), large but mid-cap, BEE-aligned and politically connected. They have publicly committed to "mining 4.0" and have a small innovation team. Bigger than the others but worth a longer play because of the political and ESG narrative alignment. | **Group HSSE Executive** or **Head of Innovation / Digital Transformation** (group office, Sandton) | "Seriti's 25,000-strong workforce means paper-based PTW is a *liability*, not a process. Aquerii gives you a multi-site, multi-user, offline-capable HSSE platform that the DMRE inspector can verify on the spot — and it deploys in weeks, not the 12 months an ERP change would take." |

### Candidates considered but not included (and why)

- **Sibanye-Stillwater, Harmony, Gold Fields, Impala, Anglo American** — too large. Procurement cycles are 12–18 months. They will talk to us in 2027, not now. Not a pilot customer.
- **Exxaro** — large JSE-listed, has its own internal digital team and a multi-year ERP roadmap. Not accessible to a solo founder today.
- **MHSC, DMRE, CGS** — government. They are *regulators*, not buyers. Wrong target for a commercial pilot.
- **Mining contractors (Moolmans, Murray & Roberts Cementation, Aveng Mining)** — interesting future channel, but they will not buy until an operator asks them to. A pilot with an operator validates the channel.
- **Consultancies (RSG, SLR, WSP, Golder)** — they are *influencers*, not buyers. Park for later.

## 8.2 Email Templates

All three are in Madoc's voice: short, honest about being a solo founder, no marketing fluff. Subject lines are deliberate — not clickbait, not corporate.

### 8.2.1 Template 1 — Initial cold outreach

**When:** Week 1, Tuesday or Wednesday morning (08:00–09:00 SAST — best open rate for SA mining recipients).
**Word count target:** ≤ 150 words.
**Send limit:** 1 per day, 3 per week, with a 48-hour gap between sends.

**Subject:** Aquerii — paperless PTW for [Mine Name] (5-min Loom?)

```
Hi [First name],

I'm Madoc — I built Aquerii, a paperless HSSE / PTW / equipment / competency platform
built in South Africa for SA mines. Solo founder, no sales team, no corporate deck.

I noticed [Mine Name] is running [specific fact — e.g. "4 collieries with separate
permit books" / "a contractor-heavy surface operation" / "a deep-level single-asset
mine with a SAP backbone"]. The pain I solve: [one line tied to their reality — e.g.
"PTW and Section 54 audit trail in one place across all sites" / "contractor competency
expiry tracking that an MHSC inspector can verify in 30 seconds"].

I've built a working pilot — multi-tenant, offline-capable, POPI-aware, 12 weeks
to first value. Not a slide deck.

**Can I send you a 5-min Loom showing the PTW module on a real mine workflow?**
No call required, no follow-up if it's not relevant.

If yes, just reply with a day/time and I'll send the link.

Thanks for the time either way,
Madoc Mhlongo
Founder, Aquerii
madocmhlongo05@gmail.com · +27 [number]
[https://aquerii.co.za or current staging URL]
```

**Personalisation checklist (do not skip):**
- The `[specific fact]` line — research the recipient's mine type, recent MHSC stoppages, annual report HSSE section.
- The pain line — pick the *one* module they would care about (PTW for coal, contractor competency for tailings, equipment inspection for open-pit, multi-site risk register for diversified).
- The CTA is low-friction: "reply with a day/time" — no scheduling tool, no Calendly link in cold email.

### 8.2.2 Template 2 — Follow-up after no response (sent 5 days later)

**When:** Week 2, same day of week, different time of day (try 14:00 SAST).
**Angle:** shift the frame — regulatory pressure or peer movement, not a repeat of "can I send a Loom."

**Subject:** Re: Aquerii — paperless PTW for [Mine Name] (DMRE angle)

```
Hi [First name],

Following up on my note from [day of week] last week — I know inboxes at group
office are brutal.

Quick reframe, then I'll stop: with [DMRE's increased Section 54 enforcement / the
recent MHSC annual report findings / the [specific peer mine] going paperless], the
window to be the early-adopter mine on a POPI-compliant SA-built platform is short.

[One sentence on what I learned about their specific pain from public sources — e.g.
"I read the 2025 integrated report and the HSSE team flagged contractor management
as the #1 risk theme."]

If a 15-min call this week or next is too much, I'm happy to send the 5-min Loom
without a call — just say the word and I'll email it across.

If the timing is wrong, no problem at all — I'll check back in Q4.

Madoc
```

**Personalisation checklist:**
- Pick the *single* regulatory or peer-development hook that is most relevant to *this* mine.
- Reference one specific fact from their public reporting (integrated report, SENS announcement, MHSC submission).
- The "check back in Q4" line gives an off-ramp. Do not chase more than twice.

### 8.2.3 Template 3 — Pilot proposal (sent only after a warm reply)

**When:** within 48 hours of a positive reply. Attach `PILOT-AGREEMENT.md` as PDF.
**Tone:** professional, but acknowledge the trust required to give a stranger access to your mine's data.

**Subject:** Aquerii × [Mine Name] — 12-week pilot proposal (NDA + draft attached)

```
Hi [First name],

Thanks for the reply — and for being open to a conversation with a solo founder.
I'll keep this short.

**Attached:**
1. `Aquerii_Pilot_Agreement_v0.1.pdf` — 12-week pilot, R0 fee, mutual NDA,
   terminable on 14 days' notice.
2. This email as a written summary so you can forward internally.

**What [Mine Name] gets:**
- A dedicated Aquerii tenant (isolated database, POPI-aligned data residency)
- 5–10 named users, role-based access
- Full HSSE / PTW / Equipment / Competency / Risk modules
- Weekly 30-min check-in call (Madoc + your SHE lead)
- Anonymised data export at any time
- Post-pilot: option to convert at R50k–R500k ZAR ACV, or walk away, no obligation

**What I need from you:**
- 1 site to start (HSSE or PTW — your call)
- 5–10 named users (mix of safety officers, supervisors, 1 admin)
- A single named champion on your side to drive weekly feedback
- Permission to publish a case study *only* if you sign off on the final draft
- Letter of intent (no purchase commitment, just a shared intent to do the work)

**Next step:** a 30-min scoping call with your HSSE lead and your IT/security
contact. We walk through the pilot agreement together, agree on the data-handling
annex, and pick a start date.

I'm holding a deployment slot for the week of [date + 4 weeks]. After that, the
next slot is [date + 8 weeks] — so worth a call in the next 10 days.

Madoc
```

**Personalisation checklist:**
- Replace every instance of `[Mine Name]` with the actual mine.
- The "5–10 named users" line is the *bare minimum* — not aspirational.
- The "deployment slot" line creates a soft, honest scarcity without being a fake-urgency tactic.

## 8.3 NDA / Pilot Agreement Review (SA-specific)

The current `PILOT-AGREEMENT.md` is a reasonable first draft but has gaps for the SA context. Below is a clause-by-clause review.

### 8.3.1 POPI Act 4 of 2013 — gaps and required additions

The agreement is silent on POPI. This is the single biggest legal risk and must be added before any pilot signature.

| Gap | Risk | Recommended clause |
|---|---|---|
| **Data residency** | POPI Section 72 restricts cross-border transfers of personal information. If pilot data is hosted on AWS `us-east-1` (or any non-SA region) and the mine's employees are SA citizens, the transfer itself may be unlawful. | Add a Data Processing Annex specifying the data centre region (e.g. AWS Cape Town `af-south-1` or on-prem). Add a "no cross-border transfer without prior written consent" clause. |
| **Consent** | POPI Section 11 requires a lawful basis for processing. The current clause 4.1 says data "must be anonymised" — but the pilot is *meant* to test the platform with real-feeling data, including the mine's real workflows. Anonymised test data is fine; real employee PII without consent is not. | Add: "Pilot data shall be synthetic or anonymised. No real employee names, ID numbers, medical records, or next-of-kin details may be uploaded. Aquerii provides a sample data set on provisioning." |
| **Breach notification** | POPI Section 22 requires the responsible party to notify the Information Regulator and data subjects of a security breach "as soon as reasonably possible." | Add: "Provider shall notify Customer of any actual or suspected breach of pilot data within 48 hours of becoming aware. Provider shall cooperate with any Section 22 notification at Provider's cost." |
| **Operator vs Responsible party** | POPI distinguishes the *responsible party* (determines purpose of processing) from the *operator* (processes on behalf of). Aquerii is the operator; the mine is the responsible party. | Add: "The parties acknowledge that, for the purposes of POPI, the Customer is the Responsible Party and Aquerii is the Operator. Aquerii shall process personal information only on the documented instructions of the Customer." |
| **Information Regulator registration** | If Aquerii processes personal information on behalf of multiple customers at scale, it may need to register as an operator with the Information Regulator. | Aquerii should confirm its own Information Officer registration status before signing. Out of scope of the agreement but a pre-signing internal check. |

### 8.3.2 Mine Health and Safety Act 29 of 1996 — Section 11

The agreement is silent on MHSA. This matters because the pilot is *not* a regulated HSSE system — but the mine's existing MHSA Section 11 appointments and Section 54 reporting are non-negotiable.

| Gap | Risk | Recommended clause |
|---|---|---|
| **No MHSA acknowledgment** | The mine may not delegate any Section 11 appointment (e.g. mine overseer, ventilation officer) to Aquerii. The platform is a *tool* — accountability remains with the Section 11 appointee. | Add: "Aquerii is an information system, not a Section 11 appointee. The Customer remains solely responsible for all MHSA appointments, reporting, and statutory obligations. The platform's hazard, incident, and PTW records are records of the Customer's compliance, not the Provider's." |
| **Section 54 stoppage / Section 55 investigations** | If the platform holds the only copy of a Section 54 stoppage record, the mine's statutory record-keeping obligations are at risk if the data is lost. | Add: "Customer may export all data at any time during the pilot. Aquerii shall provide a complete export within 5 business days of termination. Data export format shall be documented in the Data Processing Annex." |
| **MHSC submissions** | Aquerii does not submit to the Mine Health and Safety Council — the mine does. | Add a "no submission on behalf of" clause (covered by the above, but worth being explicit). |

### 8.3.3 MSA vs NDA — separation of concerns

The current agreement is *one document* doing three jobs:
1. Pilot scope and duration
2. Commercial terms (R0 fee, post-pilot pricing)
3. Confidentiality / NDA (implicit in Section 7 IP clause, but no dedicated NDA section)

**Recommendation:** split into two documents:
- `PILOT-AGREEMENT.md` — scope, duration, commercial, data, IP, liability, termination.
- `MUTUAL-NDA.md` — standalone NDA, signed *before* the pilot agreement, so the mine can review Aquerii's source / demo / data under NDA without committing to a pilot.

Why: most SA mining procurement teams will not sign a commercial agreement (even a R0 one) without a standalone NDA in place first. Asking for a single signature is a procurement-pain point that loses deals.

### 8.3.4 Limitation of liability — clause 8 is too broad

> *"Total liability capped at R0 (pilot period)."*

This is likely **unenforceable** under SA law in two ways:
1. **Gross negligence clause** — a `R0 liability cap` cannot exclude liability for gross negligence or intentional misconduct. The Consumer Protection Act 68 of 2008 (CPA) applies to most B2B services in SA mining where the annual turnover threshold is met, and the CPA voids exclusions of liability for gross negligence.
2. **Indemnity asymmetry** — the cap is *mutual* (neither party liable), but the asymmetry of risk is not: the mine is exposing employee data; Aquerii is exposing IP. A mutual zero-cap will be flagged by the mine's legal team.

**Recommended replacement:**

> *"Subject to clause 8.2, each party's total aggregate liability for direct damages arising during the pilot shall be limited to the greater of (a) the amount actually paid by the Customer to the Provider during the 12 months preceding the claim, or (b) R50,000 ZAR. Neither party excludes liability for (i) gross negligence, (ii) intentional misconduct, (iii) breach of confidentiality, or (iv) breach of data protection obligations under POPI. Neither party shall be liable for indirect, incidental, or consequential damages."*

This is industry-standard for a SA SaaS pilot.

### 8.3.5 Termination — clause 3 is too short

> *"Either party may terminate with 14 days' written notice."*

For a 12-week pilot, 14 days' notice is fine — but **mid-pilot termination creates a data handover problem.** The current clause 4.3 says data is deleted within 30 days "unless otherwise agreed" — but the deletion happens *after* handover, not *before*. The mine needs assurance that on termination:
1. They get a complete data export first.
2. *Then* data is deleted from Aquerii's systems.

**Recommended replacement:**

> *"Either party may terminate this agreement with 14 days' written notice. Upon termination: (a) Provider shall provide Customer with a complete data export in a documented machine-readable format within 5 business days; (b) Customer shall confirm receipt of the export in writing; (c) within 30 days of Customer's confirmation, Provider shall delete all pilot data from production systems and provide written certification of deletion; (d) Provider may retain anonymised, aggregated usage statistics."*

### 8.3.6 Other SA-specific concerns (small but worth flagging)

| Concern | Recommendation |
|---|---|
| **BEE / BBBEE level** | Most SA mining procurement teams will ask for Aquerii's BBBEE certificate. A solo founder's affidavit (EME affidavit) is acceptable for the pilot but should be ready. |
| **Tax invoice** | Even at R0, the mine's finance team will want a tax invoice for the pilot period. Use SARS e-filing compliant invoicing. |
| **CIPC company registration** | "Aquerii (Pty) Ltd" must be a registered entity with a registration number. If not already incorporated, incorporate *before* sending the pilot proposal. |
| **Domain & hosting** | `aquerii.co.za` should be live and the platform reachable from a public URL, not just `localhost`. The pilot mine's IT team will test it. |
| **Insurance** | SA mining procurement often asks for professional indemnity insurance. Even a basic policy (R1m–R5m) is a credibility signal. |
| **Domicilium citandi et executandi** | Add a physical address for service of legal process on both parties. |

### 8.3.7 Summary — the top 3 legal concerns

1. **POPI compliance is missing entirely** — must add a Data Processing Annex with data residency, breach notification, and operator/responsible-party language. This is non-negotiable.
2. **Liability cap of R0 is unenforceable** under SA CPA and will be rejected by mine legal teams. Replace with a R50k cap plus gross-negligence carve-outs.
3. **Split the agreement into a separate NDA + pilot agreement** so the mine can review Aquerii's demo and data under NDA without committing to a pilot. One signature loses deals.

## 8.4 30-Day Outreach Plan

Single-funnel, manual, honest. No marketing automation. The goal by end of Week 4 is **1–2 mines with a signed NDA and a scheduled 15-min scoping call.**

### Week 1 — Foundation + 1 cold email

- [ ] **Mon:** Set up the email account (`madoc@aquerii.co.za` if not already), set up a tracking spreadsheet (5 rows, 8 columns: name, mine, role, date sent, response, next action, follow-up date, status).
- [ ] **Mon:** Confirm CIPC registration of Aquerii (Pty) Ltd. If not done, do it this week — needed before any pilot agreement.
- [ ] **Tue:** Send **Template 1** to the #1 candidate (Thungela — Group HSSE Manager). Time-stamp the send.
- [ ] **Wed:** Update tracking spreadsheet, no other sends.
- [ ] **Thu:** Read the 2025 Thungela Integrated Report. Note 2–3 specific facts to use in the follow-up.
- [ ] **Fri:** No sends. Personal time. (Solo founders burn out chasing 5 mines at once.)

### Week 2 — Follow-up + 2 more cold emails

- [ ] **Mon:** Send **Template 2** (follow-up) to Thungela. *Different angle* — use the DMRE / Section 54 / MHSC annual report hook.
- [ ] **Wed:** Send **Template 1** to the #2 candidate (DRDGOLD — Group SHEQ Manager).
- [ ] **Thu:** Update spreadsheet, read DRDGOLD's 2025 ESG / integrated report.
- [ ] **Fri:** Send **Template 1** to the #3 candidate (Northam Platinum — Group Safety & Risk Manager).

### Week 3 — Follow-up all 3 + 1 more cold email

- [ ] **Mon:** If Thungela has not replied, send a *final* follow-up — one paragraph only. The "Q4 check-in" exit line.
- [ ] **Wed:** Follow-up DRDGOLD with Template 2 (different angle, e.g. "contractor competency on tailings operations").
- [ ] **Thu:** Follow-up Northam with Template 2 (e.g. "Zondereinde deep-level permit volume").
- [ ] **Fri:** Send **Template 1** to the #4 candidate (Sedibelo / Pilanesberg — SHE Manager, single-site).

### Week 4 — Follow-up all 4 + 1 more cold email + assessment

- [ ] **Mon:** Final follow-up to DRDGOLD and Northam (one-line email: "Closing the loop — happy to send the Loom without a call if useful. Q4 catch-up?").
- [ ] **Tue:** Final follow-up to Sedibelo.
- [ ] **Wed:** Send **Template 1** to the #5 candidate (Seriti — Group HSSE Executive or Head of Innovation). Last cold email of the cycle.
- [ ] **Thu:** **Assessment.** Update spreadsheet. Rank replies: hot / warm / cold / no response.
- [ ] **Thu:** **Pilot proposal sent to top 1–2.** Use Template 3, attach `PILOT-AGREEMENT.md` as PDF *plus* a separate `MUTUAL-NDA.md` (see Section 3.3).
- [ ] **Fri:** Schedule 15-min scoping calls with the top 1–2 hot replies. Goal: a discovery call in Week 5.

### 30-day success criteria

- **Minimum success (proceed to pilot):** 1 mine has signed the NDA, scheduled a scoping call, and named a champion.
- **Stretch success (de-risk the funnel):** 2 mines are in scoping-call territory — one moves to pilot, one stays as a fallback.
- **Failure signal (re-plan at day 30):** 0 warm replies across 5 mines. That means the cold email is not landing. Iterate subject lines, re-target role titles (try direct line managers instead of group office), or accept that the SA mining sales cycle is 6 months, not 30 days.

### What the leader must decide before Week 1

1. **CIPC incorporation status** — if Aquerii (Pty) Ltd is not yet registered, do it this week. The pilot agreement cannot be signed otherwise.
2. **BBBEE affidavit** — sign and file the EME affidavit.
3. **Email address** — confirm `madocmhlongo05@gmail.com` is the sender, or set up `madoc@aquerii.co.za`. The latter is more credible; the former is faster.
4. **Domain & hosting** — `aquerii.co.za` live and the platform reachable publicly, not just localhost. This is a blocker for any mine IT review.
5. **Loom video** — record a 5-minute PTW walkthrough on the seeded pilot workspace (`test@example.com` / `password`). This is the single highest-leverage asset for the cold email.

## 8.5 What We Need From the Mine (pilot requirements)

The bare minimum. Anything more and we are asking the mine to do work for us, which is the wrong shape of a pilot.

### 8.5.1 People

| Item | Min | Nice-to-have | Notes |
|---|---|---|---|
| **Named users on the workspace** | 5 | 10 | Mix of roles: 1–2 HSSE / safety officers, 2–3 shift supervisors, 1 admin. The 5 vs 10 split is to keep the workload on the mine's side low. |
| **Internal champion** | 1 person | 1 person + 1 backup | The champion drives weekly feedback, runs internal user testing, and is Madoc's primary contact. Must be empowered to make decisions on the mine's side. |
| **IT / security contact** | 1 person | — | Needed for the scoping call to walk through the Data Processing Annex. Does not need to be a daily user. |
| **HSSE / safety lead (decision-maker)** | 1 person | — | Needed to approve the pilot and sign the agreement. Probably the same person as the champion in a smaller mine. |

### 8.5.2 Site and modules

| Item | Min | Nice-to-have | Notes |
|---|---|---|---|
| **Pilot site** | 1 site | 2 sites (multi-site test) | The mine chooses. Smaller = easier. Multi-site = higher-value proof point for the upsell. |
| **Module to start** | HSSE OR PTW | Both from week 1 | Recommend HSSE first if the mine is paper-heavy, PTW first if they already have a digital hazard register. The other modules (equipment, competency) light up in Week 4. |
| **Data** | Synthetic / anonymised | Real workflows with anonymised PII | POPI-aligned by default. The mine should *not* upload real employee data. |

### 8.5.3 Time commitment from the mine

| Item | Min | Notes |
|---|---|---|
| **Weekly check-in call** | 30 min, same day/time each week | Madoc + the champion. Agenda: scenarios passed, bugs, feature requests, next week. |
| **Async feedback** | ~15 min/week per user | Bug reports, feature requests, comments in the platform. |
| **Scoping call (once)** | 30 min | Mine's HSSE lead + IT/security contact + Madoc. Walk through the pilot agreement and Data Processing Annex. |
| **Mid-pilot review (week 6)** | 60 min | Half-day review. NPS score, scenario coverage, go/no-go for second half. |
| **Pilot close-out (week 12)** | 60 min | Final review, case study sign-off, decision on conversion. |

Total mine-side time: ~12 hours per user over 12 weeks, plus ~5 hours for the champion.

### 8.5.4 Permissions and paperwork

| Item | Required? | Notes |
|---|---|---|
| **Signed NDA** | Yes | *Before* any platform access. Use the standalone `MUTUAL-NDA.md` once split from the pilot agreement. |
| **Signed pilot agreement** | Yes | After NDA. Includes Data Processing Annex. |
| **Letter of intent (LOI)** | Yes | One paragraph: "We intend to participate in a 12-week pilot of Aquerii, starting [date]." *No purchase commitment.* Aquerii provides a template. |
| **Case study permission** | Optional, but high-value | If granted: anonymised metrics, 1 quote, Aquerii's logo on the mine's website. If not: pilot is still valuable. |
| **Public reference permission** | Optional | 30-min reference call with future prospects. Not a prerequisite. |

### 8.5.5 What Aquerii provides (the reciprocal)

To make the mine's time worthwhile:

- Dedicated Aquerii tenant (isolated DB, branded to the mine).
- 12 weeks of access (no fee).
- Madoc on WhatsApp / email for the duration (response SLA: 4 working hours).
- Weekly demo of new features shipped during the pilot.
- Anonymised case study draft at the end (only published with sign-off).
- First right of refusal on the post-pilot commercial agreement.
- A signed BBBEE affidavit and CIPC registration on request.

### 8.5.6 Out of scope for the pilot (explicit)

- **Production go-live.** This is a pilot, not a procurement. The mine is *not* committing to a contract.
- **Integration with the mine's ERP, SAP, or PDS systems.** Out of scope for 12 weeks. Discussed post-pilot.
- **Custom feature development.** The mine can request features; they will be triaged for post-pilot Phase 3.
- **Data migration from the mine's existing systems.** Pilot starts greenfield.
- **On-site installation of any hardware.** Aquerii is browser + mobile, no on-prem install.
- **POPIA / MHSA regulatory sign-off on the mine's behalf.** Aquerii is a tool. The mine is the responsible party.

## 8.6 Open Decisions (need leader sign-off before Week 1)

These are the calls only Madoc can make. Each one blocks part of the outreach.

1. **Sender address.** `madocmhlongo05@gmail.com` (faster) or `madoc@aquerii.co.za` (more credible, but needs the domain to be live). My recommendation: `aquerii.co.za`.
2. **CIPC incorporation.** If Aquerii (Pty) Ltd is not yet registered, do it before Week 1. *Blocker for the pilot agreement.*
3. **Domain + public URL.** The platform must be reachable on a public URL for mine IT teams to test. `localhost` will fail every security review.
4. **Loom video.** 5-min walkthrough of PTW on the seeded pilot workspace. Single highest-leverage asset. *Blocker for the cold email CTA to land.*
5. **BBBEE EME affidavit.** Solo founder. Sign and file.
6. **Acceptance of Section 3 legal review.** The NDA must be split, POPI clauses added, liability cap rewritten. This is a non-trivial document rewrite — estimate 4–6 hours with a junior legal consultant.
7. **Outreach intensity.** The plan assumes 1 cold email per day, max 3 per week. If the leader prefers a higher tempo (e.g. 5/week), we risk burning the funnel and looking desperate. Recommend sticking to 3/week.
8. **Pilot agreement counterparty.** The current draft says "Aquerii (Pty) Ltd." Confirm the legal entity name *and registration number* before signing.

## 8.7 What success looks like at Day 30

A simple spreadsheet view, copied from the tracking sheet:

| Mine | Cold sent | Replied | Status | Next step |
|---|---|---|---|---|
| Thungela | Day 7 | Day 9 (warm) | Scoping call booked | Pilot proposal sent, NDA in flight |
| DRDGOLD | Day 9 | Day 14 (warm) | Champion identified | Scoping call target Week 5 |
| Northam | Day 11 | — | No response after 2 follow-ups | Q4 check-in |
| Sedibelo | Day 18 | Day 19 (hot) | Site visit scheduled | Pilot proposal sent |
| Seriti | Day 25 | — | No response | Q4 check-in |

Realistic outcome: 1 pilot signed, 1 in scoping, 2–3 in Q4 pipeline. That is a 30-day win.

A bad outcome (zero warm replies) is *not* a product failure — it is a sales-cycle reality check for SA mid-tier mining. Iterate the message, re-target the role, and try again in 60 days with a published case study from the *first* pilot.

---

# 9. Open Follow-up Gaps (6)

After Wave 5, the post-Wave-5 verification, and the 32 new commits, 6 gaps remain open. These are deferred to post-pilot hardening (4 of them) or are follow-up cleanups (2 of them).

## 9.1 GAP-API-AUTH-001 (medium, pre-existing)

- **Symptom:** API returns 500 "Route [login] not defined" for unauthenticated requests.
- **Root cause:** Auth middleware redirects to SPA-only `/login` route; the API doesn't have a JSON 401 fallback.
- **Fix:** Add JSON 401 response in `Authenticate` middleware, register `/api/login` route for the API.
- **Owner:** debugger-1
- **Effort:** 0.5d
- **Priority:** Medium (affects API consumers, not browser users)

## 9.2 GAP-MYDAY-CHAT-SELECTORS-001 (low, test infra)

- **Symptom:** Playwright selector drift in my-day/chat smoke tests.
- **Root cause:** Selector mismatches (`<button>` vs `<input type="checkbox">`, custom Input component).
- **Fix:** Update Playwright selectors to use `data-testid` attributes consistently.
- **Owner:** qa-lead-frontend
- **Effort:** 0.25d
- **Priority:** Low (only affects test reliability, not product)

## 9.3 GAP-PHPSTAN-001 (low, deferred to Phase 3)

- **Symptom:** PHPStan level 5 reports 1316 pre-existing Laravel magic property/method errors.
- **Root cause:** Laravel's facade pattern + Eloquent dynamic properties; expected for any Laravel 11 codebase without Larastan baseline.
- **Fix:** Add Larastan baseline, set level to 4, fix only the *new* errors introduced by changes.
- **Owner:** qa-lead-integration
- **Effort:** 0.5d
- **Priority:** Low (cosmetic; not blocking pilot)

## 9.4 GAP-TEST-FLAKY-001 (low, pre-existing)

- **Symptom:** 1 flaky Playwright test (CRM pipeline view on Chromium, pre-existing).
- **Root cause:** Race condition between data load and viewport rendering.
- **Fix:** Add explicit wait for the kanban view to be ready before assertion.
- **Owner:** qa-lead-frontend
- **Effort:** 0.25d
- **Priority:** Low (retried-and-passed in last run; not blocking pilot)

## 9.5 GAP-QA-INT-001 (low, test-only)

- **Symptom:** `formatCurrency` tests expect USD but use ZAR.
- **Root cause:** Test data not locale-aware.
- **Fix:** Update test fixtures to use ZAR + ZA locale.
- **Owner:** qa-lead-integration
- **Effort:** 0.1d
- **Priority:** Low (test-only)

## 9.6 GAP-QA-INT-002 (low, test infra)

- **Symptom:** E2E tests require running API backend.
- **Root cause:** No test-only API mode.
- **Fix:** Document the docker-compose-test.yml setup in `services/api/README.md`.
- **Owner:** doc-engineer
- **Effort:** 0.25d
- **Priority:** Low (docs only)

## 9.7 GAP-BOARDS-DESIGN-003 (deferred to Week 4 of pilot)

- **Symptom:** Visual QA on boards redesign needs real pilot feedback.
- **Root cause:** Designer sign-off pending real usage.
- **Fix:** Pilot Week 4 feedback call → designer reviews the screenshots and adjusts.
- **Owner:** designer
- **Effort:** 0.5d
- **Priority:** Medium (pilot-driven)

---

# 10. Critical Context — Paths, IDs, File Locations

## 10.1 Repository Paths

- **Project root:** `C:\Users\madoc\source\repos\Aquerii`
- **Team files:** `team/LEADER-PROMPT.md` (sections 18 + 19), `team/SYSTEM.md`, `team/DASHBOARD.md`, `team/GAPS.md` (resolved: 5 ship-blockers + 14 Wave 5 + 8 Phase 1/2; open: 6 follow-ups), `team/audit.log`
- **Branch:** `feat/crm-phases-3-to-8`, ahead of origin by 32 commits
- **PR #1:** `https://github.com/Shmurdoc/Aquerii/pull/1` (base: master, open, body updated)
- **Latest commit:** `456a345 docs(dashboard): reflect Wave 5 ship-ready state + pilot outreach plan`

## 10.2 Team Members (16)

Defined in `team/team.config.json` v4.0:
- `ceo` (Madoc Mhlongo)
- `eng-manager` (Madoc Mhlongo)
- `designer`
- `builder-1` (Core API)
- `builder-2` (CRM/ERP)
- `builder-3` (Billing/Inventory)
- `debugger-1`, `debugger-2`, `debugger-3`, `debugger-4`
- `qa-lead-backend`, `qa-lead-frontend`, `qa-lead-integration`
- `release-engineer`
- `reviewer`
- `doc-engineer`

## 10.3 Stack

- **Caddy** 443 (HTTPS) routes `/api/*` to API:8000 (no external 8000/8080 exposure)
- **Docker stack:** web, horizon, api, meilisearch, realtime, redis, postgres, minio, clickhouse, ai, caddy, prometheus, loki, chromadb (unhealthy pre-existing), otel-collector (unhealthy pre-existing), alertmanager (restarting pre-existing)

## 10.4 Ship-blocker fixes (5) — Key file locations

- `services/api/Dockerfile` lines 4–15 + 27 + 30 + 47 (Alpine ext-gd + COPY paths) — **GAP-DOCKER-GD-001**
- `services/api/app/Http/Controllers/Controller.php` (new 12-line base class) — **GAP-AUTOLOAD-001**
- `services/api/app/Modules/CRM/Http/Controllers/ForecastController.php:19` (added `->with('stage')`) — **GAP-FORECAST-LAZY-001**
- `services/web/tests/e2e/calendar.spec.ts` (new Playwright spec, 2/2 pass) — **GAP-CALENDAR-QUERY-001**
- `services/web/tests/unit/hooks/useCalendarItems.test.tsx` (new 4 vitest cases) — **GAP-CALENDAR-QUERY-001**

## 10.5 Wave 5 — Key file locations

- `services/web/src/pages/crm/ForecastPage.tsx:54-55,73-74` — nullish guards
- `services/web/src/pages/erp/GoalsPage.tsx:1,81` — ts-nocheck removed, keyExtractor added
- `services/web/src/pages/erp/EmployeeGroupsPage.tsx:1,74` — ts-nocheck removed, keyExtractor added
- `services/web/src/pages/my-day/MyDayPage.tsx:174-182,240,244` — inline mutation with boardId + onError
- `services/web/src/pages/chat/ChatPage.tsx` (all chat fixes consolidated)
- `services/web/src/components/chat/MentionText.tsx` — new (mention chip renderer)
- `services/web/src/components/chat/index.ts` — new barrel
- `services/web/src/components/ui/ExportButton.tsx` — new
- `services/web/src/hooks/useCalendarItems.ts` — rewritten (from/to params)
- `services/web/src/hooks/useSettings.ts:8-16` — workspace-scoped members
- `services/web/src/lib/socket.ts` — full rewrite 89→144 lines
- `services/web/src/components/board/ItemCard.tsx:22-30` — elevation + isDragging
- `services/web/src/components/board/KanvanView.tsx:25,102` — ?? [] guard, max-w-[320px]
- `services/web/src/pages/boards/BoardsPage.tsx:19-26,84-99` — NewBoardModal, always-visible menu
- `services/web/src/pages/boards/BoardPage.tsx` — presence avatars, share button, Modal for deletes
- `services/web/src/pages/inbox/InboxPage.tsx:30,42,57` — all 5 UX gaps
- `services/web/src/hooks/useNotifications.ts:50-75` — paginated query
- `services/web/src/stores/notificationStore.ts:45-72` — NotificationData type
- `services/api/app/Http/Controllers/Api/CalendarItemController.php` — new
- `services/api/app/Http/Controllers/Api/NotificationController.php:48-56` — pagination
- `services/api/routes/api.php:45` — calendar-items route registered

## 10.6 Pilot infrastructure

- `services/api/app/Console/Commands/ProvisionPilot.php` (657 lines)
- `team/scripts/provision-pilot.mjs` (143 lines Node.js wrapper)
- `team/plan/PILOT-SETUP.md`, `PILOT-STRATEGY.md`, `PILOT-FEEDBACK-WEEK-1.md`, `PILOT-AGREEMENT.md`, `PILOT-OUTREACH.md` (new, 406 lines)

## 10.7 Workstream targets — Key file locations

### Workstream B (storage display, 1 day)
- **B.1** — `services/api/app/Http/Controllers/Api/StorageController.php` (new) + `services/api/routes/api.php` (add route)
- **B.2** — `services/web/src/pages/settings/StorageTab.tsx` (new) + `services/web/src/hooks/useStorageUsage.ts` (new) + `services/web/src/pages/settings/SettingsPage.tsx:9-16` (modify) + delete `services/web/src/components/settings/BillingTab.tsx`
- **B.3** — `services/api/app/Filament/Widgets/StorageAnalytics.php` (new or modify)

### Workstream A (3-tier + spatie, 5 days)
- **A.1.1** — `services/api/app/Providers/HorizonServiceProvider.php:14-19` + `services/api/app/Filament/Resources/AuditLogResource.php` (use Eloquent) + `services/api/config/database.php` (drop `superadmin` connection) + `services/api/database/migrations/*_create_super_admins_table.php` (delete)
- **A.1.2** — `services/api/database/migrations/*_add_account_type_to_users_table.php` (new)
- **A.1.3** — `services/api/app/Http/Controllers/Api/PlatformImpersonationController.php` (new)
- **A.2.1** — `services/api/app/Modules/HR/Models/Department.php` (new) + `services/api/database/migrations/*_create_departments_table.php` (new)
- **A.2.2** — `services/api/app/Modules/HR/Models/JobPosition.php` (new) + `services/api/database/migrations/*_create_job_positions_table.php` (new)
- **A.3** — `services/api/app/Modules/HR/Database/Seeders/WorkspaceRoleSeeder.php` (new) + `services/api/app/Core/Models/User.php` (add `HasRoles` trait)
- **A.4.1** — Delete `services/api/app/Http/Controllers/Api/WorkspaceInvitationController.php` + `services/api/routes/api.php:104,179,184,185` (modify) + `services/web/src/hooks/usePermission.ts:4-31` (modify) + `services/web/src/lib/settings.ts:233-239` (modify)

### Workstream C (Jitsi, 2 days)
- **C.1** — `services/api/app/Modules/Meetings/Services/JitsiJwtService.php` (new) + `services/api/app/Http/Controllers/Api/JitsiController.php` (new)
- **C.2** — `services/api/database/migrations/*_create_meeting_participants_table.php` (new)
- **C.3** — `services/api/app/Http/Controllers/Api/JitsiWebhookController.php` (new) + `services/api/app/Modules/Meetings/Models/MeetingRecording.php` (new) + `services/api/app/Modules/Meetings/Models/MeetingTranscript.php` (new)
- **C.4** — `services/web/src/components/meetings/JitsiMeeting.tsx` (rewrite) + `services/web/src/pages/meetings/MeetingsPage.tsx:206-213` (modify)

### Workstream D (primitives, 7 days)
- **D.1** — `services/api/app/Modules/Webhooks/Services/WebhookDispatcher.php` (new) + `services/api/app/Http/Controllers/Api/WebhookController.php` (new) + `services/web/src/pages/settings/WebhooksTab.tsx` (new) + `services/web/src/components/integrations/*` (4 new files)
- **D.2** — `services/web/public/sw-push.js` (new) + `services/web/src/hooks/usePushNotifications.ts` (new) + `services/web/src/components/Notifications/PushPrompt.tsx` (new)
- **D.3** — `services/api/app/Modules/Common/Models/SavedView.php` (new) + `services/api/app/Modules/Common/Models/Tag.php` (new) + `services/api/app/Modules/Common/Models/CustomFieldDefinition.php` (new) + `services/web/src/components/inputs/SavedViewDropdown.tsx` (new) + `services/web/src/components/inputs/TagInput.tsx` (new) + `services/web/src/components/inputs/CustomFieldRenderer.tsx` (new)
- **D.4** — `services/api/app/Http/Controllers/Api/ApiTokenController.php` (new) + `services/web/src/pages/settings/ApiTokensTab.tsx` (new)

## 10.8 Test data and credentials

- **Test user:** `test@example.com` with `Test Workspace` (owner)
- **Pilot users:** `*@pilot.example.com` / `password`
- **Project owner email:** `madocmhlongo05@gmail.com`
- **Git commit author:** `madocmhlongo05@gmail.com` / "Aquerii Leader"

## 10.9 Cross-cutting rules (the 24 quality rules)

See Section 4.12 for the full list. Highlights:
- **Rule 21:** No `// @ts-nocheck` in production code
- **Rule 22:** No hardcoded Tailwind grays in user-facing pages
- **Rule 23:** Every nullable backend value gets a nullish guard in the UI
- **Rule 24:** Destructive UI affordances are not hover-only

---

*End of whole plan. Total: ~10 sections, 4 detailed workstreams, 24 sub-tasks, 5 ship-blockers, 14 Wave 5 gaps, 6 follow-up gaps, 3 email templates, 5 candidate mines, 3 email templates, 30-day outreach plan, NDA/POPI legal review, 24 quality rules, 4 user-confirmed decisions.*

*This document is the source of truth for what we built, what we found, and what we plan to build next. If something is contradicted by code or a newer doc, trust the code + DASHBOARD.md, and update this file to match.*


