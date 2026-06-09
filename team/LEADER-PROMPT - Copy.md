# Leader Prompt — AI & MCP Automation Layer for Aquerii

> **Status:** Plan complete, all decisions locked. Awaiting user signal to spawn Wave W0.
> **Author:** Leader (eng-manager sub-session)
> **Date:** 2026-06-06
> **Source context:** D.slice production-readiness sweep (v0.2.0) is shipped; this document defines the next major initiative.

---

## Table of Contents

1. [Background & Motivation](#1-background--motivation)
2. [Decisions Locked](#2-decisions-locked)
3. [Architecture](#3-architecture)
4. [Per-Request Cost Ceiling](#4-per-request-cost-ceiling)
5. [Both-Gate Approval Flow](#5-both-gate-approval-flow)
6. [Both-Mode Storage](#6-both-mode-storage)
7. [stdio Sidecar Transport](#7-stdio-sidecar-transport)
8. [Phase 0 — Reconcile & Design](#8-phase-0--reconcile--design)
9. [Phase 1 — MCP Server Wiring](#9-phase-1--mcp-server-wiring)
10. [Phase 2 — New `team/` Members](#10-phase-2--new-team-members)
11. [Phase 3 — First Capability: AI Suggests Automations](#11-phase-3--first-capability-ai-suggests-automations)
12. [Phase 4 — Autonomy Tiers in Practice](#12-phase-4--autonomy-tiers-in-practice)
13. [Phase 5 — Rollout Waves](#13-phase-5--rollout-waves)
14. [Concrete File List (34 files)](#14-concrete-file-list-34-files)
15. [Risk Register](#15-risk-register)
16. [Out of Scope (Explicit)](#16-out-of-scope-explicit)
17. [Estimated Effort](#17-estimated-effort)
18. [Critical Path](#18-critical-path)
19. [Open Questions (None Remaining)](#19-open-questions-none-remaining)
20. [Execution: Next Steps](#20-execution-next-steps)
21. [Appendix A — Prior Work: D.slice Production-Readiness Sweep](#appendix-a--prior-work-dslice-production-readiness-sweep)
22. [Appendix B — Existing System Inventory](#appendix-b--existing-system-inventory)
23. [Appendix C — References](#appendix-c--references)

---

## 1. Background & Motivation

Aquerii is a multi-service application (Laravel 11 API, React/Vite web, FastAPI AI service, InvenTree sidecar). It already has:

- 28 AI endpoints across 8 routers in `services/ai`
- A working `Automation` module with triggers/actions and `AutomationEngine`
- A team orchestration system (`team/`) with 16 members using the SYSTEM.md v4.0 sub-session protocol
- Strategy documents defining MCP/AI operations: `docs/final run.md/07-MCP-AI-OPERATIONS.md` and `.opencode/plans/plan.md` §13

**However, no MCP server is currently wired into `services/ai`.** The `.opencode/AGENTS.md` lists 8 MCP servers as "Active" but a codebase grep finds zero MCP wiring in any `*.py`, `*.php`, or `*.ts` — that table is aspirational.

**This plan delivers:**
1. Real MCP server wiring (5 servers: Laravel, Playwright, PostgreSQL, GitHub, Stripe)
2. 5 new `team/` member types that consume MCP-backed capabilities
3. A 3-tier autonomy policy (Assist / Controlled / Autonomous) with audit trail
4. A first user-visible capability: AI suggests automations for user review

**Why now:** The D.slice v0.2.0 sweep is shipped and the team is idle. The AI service has empty `app/agents/__init__.py` and the Automation module has templates seeded — both are waiting for the glue that this plan provides.

---

## 2. Decisions Locked

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Rollout scope | **Full vision** (MCP wiring + new `team/` members + all 3 autonomy modes) | Maximizes leverage from existing AI endpoints and Automation module |
| 2 | First capability | **AI suggests automations** via Laravel MCP + `/ai/automation/generate` | Plays to existing infrastructure; visible win; exercises the full 3-tier flow |
| 3 | Autonomy tiers | **All three** (Assist / Controlled / Autonomous) | Implements the policy in `07-MCP-AI-OPERATIONS.md`; per-action declaration in plan.md |
| 4 | Cost control | **Per-request ceiling** (default $0.50, per-member override) | Prevents runaway LLM costs; enforced *before* LLM call |
| 5 | Draft storage | **Both** — Postgres `draft_automations` table (source of truth) + `plan.md` (human view) | Auditable queryability + human-friendly review surface |
| 6 | Approver | **Both gates** — end user via UI + `ceo` member in team system | Defense in depth; user has final say, ceo provides strategy alignment |
| 7 | MCP transport | **stdio sidecar** — one MCP server per container | Standard MCP pattern; simpler auth; well-suited to Docker Compose |

---

## 3. Architecture

```
USER (UI: "Suggest an automation for high-value deals")
   │
   ▼
[ services/web ] ──POST /api/ai/suggest-automation──▶ [ services/api ]
   │                                                       │ (Laravel)
   │                                                       ▼
   │                                              [ services/ai :8002 ]
   │                                                       │
   │                                              1. Sanitize input
   │                                              2. Check cost ceiling ($0.50)
   │                                              3. POST /mcp/laravel/list_automations (read)
   │                                              4. POST /mcp/laravel/list_deals (read)
   │                                              5. POST /ai/automation/generate
   │                                              6. Persist → draft_automations table
   │                                              7. Log AI_SUGGEST (mode=assist)
   │                                                       │
   ▼                                                       ▼
[ ceo member sub-session reviews ] ◀─── audit log entry ───┘
   │
   ▼
[ team/members/automation-builder/plan.md ] (human view, links to draft_id)
   │
   ▼
USER clicks Approve in UI  ──▶  [ services/api ]  ──▶  [ services/ai ]
                                                        │
                                                  1. Check Controlled-mode gate
                                                  2. Verify user + ceo approvals
                                                  3. POST /mcp/laravel/create_automation
                                                  4. Promote draft → automations table
                                                  5. Log AI_APPLY
                                                        │
                                                        ▼
[ agent-tester ]  ──POST /mcp/laravel/simulate_automation──▶ verifies
```

### Component Inventory

| Component | Language/Runtime | Port/Transport | Responsibility |
|-----------|------------------|----------------|----------------|
| `services/web` | TypeScript / Vite / React | 5173 (dev) / 80 (prod) | UI; renders AI suggestions; approval buttons |
| `services/api` | PHP 8.3 / Laravel 11 | 8000 | Domain logic; hosts `laravel/mcp` server; owns `draft_automations` and `automations` tables |
| `services/ai` | Python 3.11 / FastAPI | 8002 | LLM orchestration; MCP clients; policy gate; audit log writer |
| `services/mcp-laravel` | PHP 8.3 (sidecar) | stdio | Exposes Aquerii modules as MCP tools/resources |
| `services/mcp-playwright` | Node 20 (sidecar) | stdio | Browser automation; QA flows |
| `services/mcp-postgres` | Node 20 (sidecar) | stdio | Read-only DB introspection |
| `services/mcp-github` | Node 20 (sidecar) | stdio | Repo operations |
| `services/mcp-stripe` | Node 20 (sidecar) | stdio | Billing/subscription (sandbox key) |

### Internal-Trust Boundary

All MCP clients in `services/ai` are gated by:
- `X-Internal-Key` header (rotated via `INTERNAL_KEY` env var in compose)
- Member ID (must match `team.config.json`)
- Mode declaration per tool
- Per-request cost ceiling

The Laravel MCP server, in turn, re-validates the AI service's internal token before exposing any tool — **defense in depth**.

---

## 4. Per-Request Cost Ceiling

**File:** `services/ai/app/security/policy.py`

**Logic (pseudocode):**

```python
def check_cost_ceiling(member_id: str, estimated_tokens: int) -> bool:
    member = team_config.members[member_id]
    ceiling = member.autonomy.get("cost_ceiling_usd", 0.50)
    
    # Token→USD estimate (OpenAI gpt-4o-mini baseline)
    estimated_usd = (estimated_tokens / 1000) * 0.00015
    
    if estimated_usd > ceiling:
        log_audit(
            event="COST_DENIED",
            member_id=member_id,
            estimated_usd=estimated_usd,
            ceiling_usd=ceiling
        )
        return False
    
    return True
```

**Per-member override** in `team.config.json`:

```json
{
  "id": "automation-builder",
  "autonomy": {
    "default": "assist",
    "cost_ceiling_usd": 1.00,
    "allow": [...]
  }
}
```

Default $0.50 is the system-wide fallback.

---

## 5. Both-Gate Approval Flow

`draft_automations.approvals` is a JSONB column:

```json
{
  "approvals": [
    {"type": "user", "approver_id": "u_42",        "approved_at": "2026-06-06T12:34:56Z", "channel": "ui"},
    {"type": "ceo",  "approver_id": "team/ceo",    "approved_at": "2026-06-06T12:35:22Z", "channel": "team"}
  ]
}
```

**Apply** endpoint (`POST /api/draft-automations/{id}/apply`) requires **both** approvals present, else returns 409 with `{ "missing_approvals": ["user", "ceo"] }`.

**User approval** via UI: button in `AISuggestedAutomations.tsx` writes a row directly (user is authenticated via existing Aquerii session).

**CEO approval** via team system: `ceo` sub-session is spawned with the draft_id, reads `draft_automations.approvals`, and writes its own row. If `ceo` rejects, it writes a `rejection_reason` and the user must regenerate.

**Audit trail:** every approval/rejection logs `AI_APPROVE` or `AI_REJECT` with approver_id, timestamp, channel.

---

## 6. Both-Mode Storage

### Postgres: `draft_automations` table

**Migration:** `services/api/.../Migrations/2026_xx_create_draft_automations.php`

```php
Schema::create('draft_automations', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->foreignId('requested_by_user_id')->constrained('users');
    $table->string('member_id'); // e.g., "automation-builder"
    $table->text('natural_language_request');
    $table->jsonb('proposed_trigger');
    $table->jsonb('proposed_action');
    $table->jsonb('approvals')->default('{"approvals":[]}');
    $table->jsonb('rejection_reason')->nullable();
    $table->string('status')->default('pending'); // pending|approved|applied|rejected
    $table->foreignId('applied_automation_id')->nullable()->constrained('automations');
    $table->timestamps();
});
```

### Markdown: `team/members/automation-builder/plan.md`

```markdown
# TKT-AI-001 — AI-suggested automation

**Draft ID:** 42
**Status:** pending user + ceo approval

## Natural language request
"Move new high-value deals (>$10k) to Hot stage and notify sales manager"

## Proposed trigger
```json
{"type": "item.created", "module": "CRM.Deal", "filter": "value > 10000"}
```

## Proposed action
```json
{"type": "change_status", "target": "self", "value": "hot"}
{"type": "send_notification", "channel": "email", "to_role": "sales_manager"}
```

## Approvals
- [ ] user (channel: ui)
- [ ] ceo (channel: team)

## Audit log entries
- 2026-06-06T12:34:56Z AI_SUGGEST member=automation-builder mode=assist cost=$0.04
```

Both surfaces are kept in sync by `automation-builder` member — writing to the DB *and* regenerating plan.md on each material change.

---

## 7. stdio Sidecar Transport

**Pattern:** One MCP server process per container, JSON-RPC over stdio.

**Docker Compose snippet:**

```yaml
services:
  ai:
    build: ./services/ai
    depends_on:
      - mcp-laravel
      - mcp-playwright
      - mcp-postgres
    environment:
      - MCP_LARAVEL_URL=stdio://mcp-laravel
      - MCP_PLAYWRIGHT_URL=stdio://mcp-playwright
      - MCP_POSTGRES_URL=stdio://mcp-postgres
    stdin_open: true
    tty: true

  mcp-laravel:
    build: ./services/mcp-laravel
    stdin_open: true
    tty: true
    environment:
      - LARAVEL_API_URL=http://api:8000
      - INTERNAL_KEY=${INTERNAL_KEY}
```

**`services/ai/app/mcp/laravel_client.py`:**

```python
import asyncio
from mcp import ClientSession, StdioServerParameters

class LaravelMCPClient:
    def __init__(self):
        self.params = StdioServerParameters(
            command="php",
            args=["artisan", "mcp:serve", "--server=laravel"],
            env={"LARAVEL_API_URL": "http://api:8000", "INTERNAL_KEY": "..."}
        )
        self.session: ClientSession | None = None
    
    async def connect(self):
        self.session = await ClientSession(self.params).__aenter__()
        await self.session.initialize()
    
    async def list_automations(self) -> list[dict]:
        result = await self.session.call_tool("list_automations", {})
        return result.content
```

**Health check:** Each MCP client pings `ping` tool every 30s; on failure, log `MCP_DOWN` and mark all dependent endpoints as degraded (return 503 with `Retry-After`).

---

## 8. Phase 0 — Reconcile & Design

| # | Task | Why | Exit Criteria |
|---|------|-----|---------------|
| 0.1 | Resolve `.opencode/AGENTS.md` MCP table (8 listed as "Active", only filesystem is real) | Single source of truth; prevents shipping with false documentation | Table matches actual `services/ai/app/mcp/` directory contents |
| 0.2 | Add `mcp` field to v3.1 `team.config.json` schema (per-member list of granted MCP servers) | Validator v3.1 can enforce; audit-able | All 21 members (16 + 5 new) declare MCP access |
| 0.3 | Add `mode` field (assist/controlled/autonomous) per member, defaulting to `assist` | Implements 3-tier policy | All 21 members declare default mode |
| 0.4 | Define new audit log event types: `AI_SUGGEST`, `AI_APPROVE`, `AI_APPLY`, `AI_REVERT`, `MCP_CONNECT`, `MCP_DENY`, `COST_DENIED` | Auditability for autonomy tiers | `audit.log` header documents all event types |
| 0.5 | Add 5 new members to `team.config.json`: `automation-builder`, `agent-tester`, `mcp-architect`, `rag-curator`, `agent-reviewer` | Extends team from 16 → 21 members | Validate passes; 21 members total |
| 0.6 | Update `team/scripts/validate.mjs` to recognize new fields and member types | Validator must keep passing | 0 errors, 0 warnings on v3.1 config |
| 0.7 | Update `team/Leader.md` with new sub-agent mappings and MCP access patterns | Sub-sessions can be spawned correctly | Type→subagent_type table includes 5 new members |
| 0.8 | Add §"AI & MCP Lifecycle" to `team/SYSTEM.md` | Documents the new flow for all sub-sessions | Section is referenced from spawn templates |
| 0.9 | Update `docs/final run.md/07-MCP-AI-OPERATIONS.md` with Phase 1-5 callouts and link to this plan | Strategy doc stays current | Doc includes "Implementation: see team/LEADER-PROMPT - Copy.md" |
| 0.10 | Bump `CHANGELOG.md` to v0.3.0 (AI foundation release) | User-visible version marker | v0.3.0 entry added with date |

**Tickets:** TKT-PLAN-001 (whole phase)

**Members spawned:** `ceo` (1 instance, ~0.5 day)

**Reversible?** Yes — entire phase is documentation + schema; no production code changes.

---

## 9. Phase 1 — MCP Server Wiring

| # | MCP Server | Transport | Wired In | Plan §13 Phase |
|---|------------|-----------|----------|----------------|
| 1.1 | **Laravel MCP** (`laravel/mcp` PHP package) | stdio via local | New `services/api/routes/mcp.php`, gated by internal key | A2 → **P0** (anchors Phase 3 capability) |
| 1.2 | **Playwright MCP** (`@playwright/mcp` Node) | stdio | New `services/mcp-playwright/` wrapper, talks to `services/ai` via HTTP | A1 → **P0** |
| 1.3 | **PostgreSQL MCP** (`@modelcontextprotocol/server-postgres`) | stdio | New `services/mcp-postgres/` wrapper, read-only role | G5 → P1 |
| 1.4 | **GitHub MCP** (`@modelcontextprotocol/server-github`) | stdio | New `services/mcp-github/` wrapper, scoped token | G3 → P2 |
| 1.5 | **Stripe MCP** (Stripe's official) | stdio | New `services/mcp-stripe/` wrapper, sandbox key | G1 → P3 |

### Standard file pattern per server

- `services/mcp-<name>/Dockerfile` + `package.json` (or `composer.json`)
- `services/ai/app/mcp/<name>_client.py` — async client with retry + circuit breaker
- `services/ai/app/routers/mcp_<name>.py` — exposes tools as FastAPI endpoints
- `services/ai/app/security/policy.py` — per-tool mode check (3-tier gate + cost ceiling)
- `services/ai/app/audit/ai_audit.py` — logs AI_SUGGEST/APPLY/REVERT to Postgres
- `services/ai/tests/test_mcp_<name>.py` — happy path + denial + audit

### Per-server detail

#### 1.1 Laravel MCP (P0)

**Tools exposed:**
- `list_automation_templates` (read)
- `list_automations` (read)
- `list_deals` (read, paginated)
- `simulate_automation` (read, dry-run)
- `create_automation` (write, requires Controlled-mode gate)
- `disable_automation` (write, requires Controlled-mode gate)

**Auth:** Internal key only; AI service forwards `member_id` and `mode` in headers.

**Endpoints exposed by services/ai:**
- `POST /mcp/laravel/list-automation-templates`
- `POST /mcp/laravel/list-automations`
- `POST /mcp/laravel/list-deals`
- `POST /mcp/laravel/simulate-automation`
- `POST /mcp/laravel/create-automation` ← policy-gated
- `POST /mcp/laravel/disable-automation` ← policy-gated

#### 1.2 Playwright MCP (P0)

**Tools exposed:**
- `navigate`, `click`, `fill`, `screenshot`, `assert_text`, `assert_visible`, `get_console_logs`

**Auth:** Internal key; read/write by default, "headless" mode forced.

**Endpoints exposed by services/ai:**
- `POST /mcp/playwright/navigate`
- `POST /mcp/playwright/click`
- `POST /mcp/playwright/fill`
- `POST /mcp/playwright/screenshot`
- `POST /mcp/playwright/assert`
- `GET  /mcp/playwright/console-logs`

#### 1.3 PostgreSQL MCP (P1)

**Tools exposed:** `query` (SELECT only), `describe_table`, `list_tables`

**Auth:** Internal key + DB user with read-only role.

**Endpoints exposed by services/ai:**
- `POST /mcp/postgres/query` ← cost ceiling = $0 (no LLM)
- `POST /mcp/postgres/describe-table`
- `POST /mcp/postgres/list-tables`

#### 1.4 GitHub MCP (P2)

**Tools exposed:** `create_issue`, `create_pr`, `list_prs`, `get_file_contents`, `search_code`

**Auth:** Internal key + GitHub PAT scoped to org.

**Endpoints exposed by services/ai:**
- `POST /mcp/github/create-issue`
- `POST /mcp/github/create-pr`
- `POST /mcp/github/list-prs`
- `POST /mcp/github/get-file`
- `POST /mcp/github/search`

#### 1.5 Stripe MCP (P3)

**Tools exposed:** `list_subscriptions`, `get_invoice`, `simulate_charge` (sandbox only)

**Auth:** Internal key + Stripe sandbox key.

**Endpoints exposed by services/ai:**
- `POST /mcp/stripe/list-subscriptions`
- `POST /mcp/stripe/get-invoice`
- `POST /mcp/stripe/simulate-charge`

**Tickets:** TKT-MCP-001 (Laravel), TKT-MCP-002 (Playwright), TKT-MCP-003 (Postgres), TKT-MCP-004 (GitHub), TKT-MCP-005 (Stripe)

**Members spawned:** `mcp-architect` × 2 in parallel (1.1+1.2, 1.3+1.4+1.5)

**Reversible?** Yes — feature flag `MCP_<NAME>_ENABLED` per server; default false in production until W3-W6 promote each one.

---

## 10. Phase 2 — New `team/` Members

| ID | Type | Area | Mode Default | MCP Access | Tech |
|----|------|------|--------------|------------|------|
| **automation-builder** | builder | `services/api/app/Modules/Automation/`, `services/ai/app/routers/ai_routes.py` | controlled | laravel, postgresql | PHP 8.3 / Python 3.11 |
| **agent-tester** | qa-lead | `services/ai/tests/`, `services/mcp-*/tests/` | assist | laravel, playwright, postgresql | Python pytest / Node |
| **mcp-architect** | architect (new type) | `services/ai/app/mcp/`, `services/mcp-*/` | assist | all 5 | Python / Node / PHP |
| **rag-curator** | doc-engineer variant | `services/ai/app/routers/rag_routes.py`, `services/ai/chroma/` | assist | filesystem, postgresql | Python / ChromaDB |
| **agent-reviewer** | reviewer variant | `team/reviews/ai/`, `services/ai/` | controlled (read-only review) | filesystem, postgresql | Python |

### Sub-agent type mapping (added to `team/Leader.md`)

| New Member | Subagent Type (in `task` tool) |
|------------|--------------------------------|
| automation-builder | `builder` (PHP/Python split handled in task prompt) |
| agent-tester | `qa-lead` |
| mcp-architect | **new** `architect` (or reuse `eng-manager`) |
| rag-curator | `doc-engineer` |
| agent-reviewer | `reviewer` |

### `team.config.json` v3.1 entry example

```json
{
  "id": "automation-builder",
  "type": "builder",
  "role": "AI-suggested automation builder",
  "instance": 1,
  "area": "services/api/app/Modules/Automation/, services/ai/app/routers/ai_routes.py, team/members/automation-builder/",
  "tech": "PHP 8.3 / Python 3.11 / MCP",
  "quality_gates": [
    "team validate",
    "project tests",
    "linter",
    "type check",
    "policy gate check",
    "both-gate approval"
  ],
  "reviews_by": ["agent-reviewer", "ceo"],
  "strict_scope": true,
  "mcp_access": ["laravel", "postgresql"],
  "autonomy": {
    "default": "controlled",
    "cost_ceiling_usd": 1.00,
    "allow": [
      {"tool": "mcp.laravel.list_automations", "mode": "assist"},
      {"tool": "mcp.laravel.list_deals", "mode": "assist"},
      {"tool": "mcp.laravel.create_automation", "mode": "controlled", "requires_approval": true, "approver": ["user", "ceo"]},
      {"tool": "mcp.laravel.create_automation", "mode": "autonomous", "allowed_when": {"action_type": "send_notification", "value_under_usd": 100}}
    ]
  }
}
```

**Tickets:** TKT-CFG-001, TKT-CFG-002, TKT-CFG-003, TKT-CFG-004, TKT-CFG-005 (one per new member)

**Members spawned:** `doc-engineer` (1 instance, ~1 day)

**Reversible?** Yes — `team.config.json` revert; old validator still works on v3.0.

---

## 11. Phase 3 — First Capability: AI Suggests Automations

### End-to-end user flow

```
1. User navigates to Automations → "AI Suggestions" tab
2. User types: "Move new high-value deals to Hot stage and notify sales manager"
3. UI POSTs /api/ai/suggest-automation with natural_language + auth token
4. services/api forwards to services/ai with member_id="automation-builder"
5. services/ai:
   a. Sanitizer.py checks input (length, PII, injection patterns)
   b. policy.py checks cost ceiling (estimate from prompt tokens)
   c. /mcp/laravel/list-automations → existing triggers/actions
   d. /mcp/laravel/list-deals → recent deal shapes
   e. /ai/automation/generate (existing endpoint, line 88 of ai_routes.py)
   f. Persist to draft_automations table
   g. Log AI_SUGGEST (mode=assist)
6. ceo sub-session spawned with draft_id; reads plan.md
7. ceo writes plan.md analysis (strategic alignment, edge cases, risks)
8. ceo approves or rejects via audit log
9. User sees "Suggested by AI" card with Approve/Reject buttons
10. User clicks Approve → POST /api/draft-automations/{id}/approve
11. services/ai verifies both approvals, then:
    a. /mcp/laravel/create_automation (mode=controlled, both gates)
    b. Promote draft → automations table
    c. Log AI_APPLY
12. agent-tester spawned → /mcp/laravel/simulate-automation
13. agent-tester reports "simulated successfully" or "found issue: ..."
14. User sees "Applied" status with link to new automation
```

### Ticket breakdown

- **TKT-MIGRATE-001** — Create `draft_automations` migration, model, controller
- **TKT-AI-001** — Extend `/ai/automation/generate` to read Laravel MCP context (automation-builder)
- **TKT-CAP-001** — End-to-end "AI suggests automation" flow (automation-builder + agent-reviewer + agent-tester)
- **TKT-UI-001** — `AISuggestedAutomations.tsx` page with approval UI
- **TKT-UI-002** — `ApprovalBadge.tsx` shows both user + ceo approval status
- **TKT-E2E-001** — Playwright E2E: full flow from suggestion to applied automation

### Acceptance criteria

- [ ] User can describe an automation in plain English via UI
- [ ] automation-builder returns a reviewable plan.md + draft_automations row within 5 minutes
- [ ] agent-reviewer validates trigger/action types against Automation module enums (no invalid types leak through)
- [ ] Approved automations apply without manual JSON editing
- [ ] Every AI action logged to Postgres with `member_id`, `mode`, `tool`, `input_hash`, `output_hash`
- [ ] E2E test passes in CI (services/web/tests/e2e/ai-suggested-automation.spec.ts)

**Members spawned:** `automation-builder`, `agent-reviewer`, `agent-tester`, `ceo` (parallel where possible)

**Reversible?** Yes — `AI_AUTOMATION_ENABLED=false` returns 503; existing automations unaffected.

---

## 12. Phase 4 — Autonomy Tiers in Practice

### Per-action mode declaration in `team/members/<id>/plan.md`

```yaml
autonomy:
  default: assist
  allow:
    - tool: mcp.laravel.list_automations
      mode: assist
    - tool: mcp.laravel.create_automation
      mode: controlled
      requires_approval: true
      approver: user
    - tool: mcp.laravel.create_automation
      mode: autonomous
      allowed_when:
        action_type: send_notification  # low-risk only
        value_under_usd: 1000
```

### Policy gate (`services/ai/app/security/policy.py`) check order

1. **MCP server allowed for member?** → else DENY, log `MCP_DENY`
2. **Tool in member's `autonomy.allow`?** → else DENY, log `POLICY_DENY`
3. **Mode matches action's effective mode?** → else DENY
4. **Approval token present (controlled)?** → else PENDING (return 202 with `pending_approvals: ["user", "ceo"]`)
5. **Autonomous preconditions met?** → else DENY
6. **Cost ceiling check** → else DENY, log `COST_DENIED`
7. **Sanitizer passes** → else DENY, log `SANITIZER_DENY`
8. **Log action** — `AI_SUGGEST` (assist) or `AI_APPLY` (controlled/autonomous)

### Default policies by member type

| Member | Default Mode | Rationale |
|--------|--------------|-----------|
| ceo | assist | Strategic input only |
| eng-manager | assist | Orchestration only |
| designer | assist | Design suggestions only |
| builder-* | controlled | Code changes need review |
| reviewer | assist | Read-only by nature |
| debugger-* | controlled | Diagnose + propose, not auto-fix |
| qa-lead-* | assist | Reports only |
| release-engineer | controlled | Releases need approval |
| doc-engineer | assist | Docs auto-apply is fine |
| **automation-builder** | controlled | Mutates Automation tables |
| **agent-tester** | assist | Test runs, no mutations |
| **mcp-architect** | assist | Architect changes via PRs |
| **rag-curator** | assist | RAG updates via PRs |
| **agent-reviewer** | assist | Read-only review |

### Audit log format (Postgres table `ai_audit_log`)

```sql
CREATE TABLE ai_audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(32) NOT NULL,  -- AI_SUGGEST, AI_APPROVE, AI_APPLY, etc.
    member_id VARCHAR(64) NOT NULL,
    mode VARCHAR(16) NOT NULL,        -- assist, controlled, autonomous
    tool VARCHAR(128) NOT NULL,
    input_hash VARCHAR(64) NOT NULL,  -- SHA-256 of sanitized input
    output_hash VARCHAR(64),          -- SHA-256 of output
    cost_usd NUMERIC(10, 4),
    approval_chain JSONB,             -- [{type, approver_id, approved_at, channel}]
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Tickets:** TKT-MODE-001 (policy.py), TKT-MODE-002 (audit log)

**Members spawned:** `mcp-architect` (assisted by `automation-builder` for log plumbing)

**Reversible?** Yes — `AUTONOMY_ENABLED=false` downgrades all to assist-only.

---

## 13. Phase 5 — Rollout Waves

| Wave | Tickets | Members Spawned | Duration | Reversible? |
|------|---------|-----------------|----------|-------------|
| **W0** | TKT-PLAN-001 | ceo | 0.5 d | — |
| **W1** | TKT-MCP-001, TKT-MCP-002, TKT-MCP-003 + TKT-MODE-001 | mcp-architect × 2 | 3-4 d | feature flag |
| **W2** | TKT-CFG-001, TKT-CFG-002, TKT-CFG-003, TKT-CFG-004, TKT-CFG-005 | doc-engineer | 1 d | revert PR |
| **W3** | TKT-MIGRATE-001, TKT-AI-001, TKT-CAP-001, TKT-UI-001, TKT-UI-002, TKT-E2E-001 | automation-builder, agent-reviewer, agent-tester, ceo | 3-5 d | flag off |
| **W4** | TKT-MCP-004 (Postgres MCP — delayed to W4 for stability) | mcp-architect + debugger-1 | 2 d | flag off |
| **W5** | TKT-MCP-005 (GitHub), TKT-MCP-006 (Stripe) | mcp-architect + release-engineer | 3 d | flag off |
| **W6** | TKT-RAG-001 (rag-curator's first use) | rag-curator | 2 d | flag off |

### Feature flags (default off, flip after each wave's verification)

```env
# .env (services/ai)
AI_AUTOMATION_ENABLED=false         # W3+ enables
MCP_LARAVEL_ENABLED=false            # W1+ enables (Laravel)
MCP_PLAYWRIGHT_ENABLED=false         # W1+ enables
MCP_POSTGRES_ENABLED=false           # W4+ enables
MCP_GITHUB_ENABLED=false             # W5+ enables
MCP_STRIPE_ENABLED=false             # W5+ enables
AUTONOMY_ENABLED=false               # W3+ enables; gates Controlled/Autonomous
COST_CEILING_USD=0.50                # system-wide default
```

### Rollback plan

- Disable `AI_AUTOMATION_ENABLED` → all AI-suggested-automation endpoints return 503
- Disable `MCP_*_ENABLED` → specific MCP route returns 503
- Existing automations (direct DB writes) are NOT affected — they're not AI-mediated

---

## 14. Concrete File List (34 files)

### Phase 0 (7 files)

1. `team/team.config.json` — bump v3.0 → v3.1, add `mcp` + `autonomy` fields, 5 new members
2. `team/scripts/validate.mjs` — recognize v3.1 fields, new member types, `autonomy` block
3. `team/audit.log` — register new event types in header
4. `team/Leader.md` — update sub-agent type table, add MCP access patterns
5. `team/SYSTEM.md` — add §"AI & MCP Lifecycle" section
6. `docs/final run.md/07-MCP-AI-OPERATIONS.md` — link to this plan, add Phase 1-5 callouts
7. `CHANGELOG.md` — v0.3.0 (AI foundation release)

### Phase 1 (18 files)

8. `services/api/composer.json` — add `laravel/mcp: ^0.1`
9. `services/api/routes/mcp.php` — Laravel MCP server with 6 tools
10. `services/mcp-playwright/Dockerfile` + `package.json` + `playwright.config.ts` (3 files, counts as 1 entry)
11. `services/mcp-postgres/Dockerfile` + `package.json` (2 files, counts as 1 entry)
12. `services/ai/app/mcp/laravel_client.py`
13. `services/ai/app/mcp/playwright_client.py`
14. `services/ai/app/mcp/postgres_client.py`
15. `services/ai/app/routers/mcp_laravel.py`
16. `services/ai/app/routers/mcp_playwright.py`
17. `services/ai/app/routers/mcp_postgres.py`
18. `services/ai/app/security/policy.py` — 3-tier gate + cost ceiling
19. `services/ai/app/audit/ai_audit.py` — log AI_SUGGEST/APPLY/REVERT/MCP_DENY
20. `services/ai/requirements.txt` — add `mcp[cli]>=1.0`
21. `docker-compose.yml` — add `mcp-laravel`, `mcp-playwright`, `mcp-postgres` services
22. Tests: `services/ai/tests/test_policy.py`, `test_mcp_laravel.py`, `test_mcp_playwright.py`, `test_mcp_postgres.py`, `test_ai_audit.py` (5 files, counts as 1 entry)

### Phase 2 (5 files)

23. `team/members/automation-builder/{plan,status,wait}.md` (counts as 1)
24. `team/members/agent-tester/{plan,status,wait}.md` (counts as 1)
25. `team/members/mcp-architect/{plan,status,wait}.md` (counts as 1)
26. `team/members/rag-curator/{plan,status,wait}.md` (counts as 1)
27. `team/members/agent-reviewer/{plan,status,wait}.md` (counts as 1)

### Phase 3 (4 files)

28. `services/api/.../Migrations/2026_xx_create_draft_automations.php` + `Models/DraftAutomation.php` + `Http/Controllers/Api/DraftAutomationController.php` (3 files, counts as 1)
29. `services/ai/app/routers/ai_routes.py` (extend line 88 `/ai/automation/generate`)
30. `services/web/src/pages/automations/AISuggestedAutomations.tsx` + `services/web/src/api/ai-suggestions.ts` + `services/web/src/components/ApprovalBadge.tsx` (3 files, counts as 1)
31. `services/web/tests/e2e/ai-suggested-automation.spec.ts` (Playwright E2E)

**Total: 34 file units** for first end-to-end capability (Phase 0-3).

---

## 15. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MCP server stdio fragility in Docker | Medium | High | Use `mcp-proxy` sidecar pattern; health checks every 30s; circuit breaker in client |
| Cost runaway from LLM calls | Low | High | Per-request ceiling enforced *before* LLM call; estimate from prompt tokens; per-member override |
| Prompt injection via MCP responses | Medium | Critical | Extend `sanitizer.py` regex to MCP outputs; reject if hit; log `SANITIZER_DENY` |
| Autonomous actions with financial impact | Low | Critical | Hard USD ceiling $1000 for autonomous `create_automation`; never allowed for billing actions |
| Validator breaks on v3.1 schema | Low | Medium | Keep v3.0 parser as fallback for 1 release; bump `team.config.json` `version` field |
| Sub-session workdir bug (E:\Mine System) | High | Medium | SYSTEM.md updated to require `workdir: "C:\Users\madoc\source\repos\Aquerii"` in all sub-session prompts; pass explicitly |
| Both-gate deadlock (user + ceo never both approve) | Medium | Medium | UI shows pending ceo approval status; ceo sub-session auto-spawned within 1 min of user approval; timeout = 24h, then auto-reject |
| MCP server credential leak | Low | Critical | Internal key only; rotated via `INTERNAL_KEY` env var; never logged; secrets in `infra/secrets/` not git |
| Laravel MCP server exposes too much | Medium | High | Explicit tool allowlist; `routes/mcp.php` is the only entry point; review during agent-reviewer pass |
| Playwright MCP test pollution | Medium | Low | Use isolated test DB; reset between runs; agent-tester owns cleanup |
| Draft automations table grows unbounded | Low | Low | Retention policy: 30 days for rejected, 90 days for applied (then archived) |

---

## 16. Out of Scope (Explicit)

- **Custom MCP server for Aquerii domain logic** — use `laravel/mcp` instead
- **Training/fine-tuning custom models** — use OpenAI/Anthropic/Gemini as-is
- **Replacing existing `/ai/*` endpoints** — extend, not replace
- **Slack/Teams/Discord integration** — Phase 6+ candidate
- **Multi-tenant MCP server isolation** — Phase 1 is single-tenant
- **Auth0/Okta integration** for the policy gate — internal key only for Phase 1
- **GitHub MCP for self-hosted runners** — use SaaS only
- **Stripe live mode** — sandbox key only; live mode requires security review (G6 gate)
- **Custom UIs for each MCP server** — generic admin panel only in Phase 1
- **Cross-member learning** (agents learning from each other) — Phase 7+ research
- **Voice/voice-to-text** — no STT/TTS in Phase 1

---

## 17. Estimated Effort

| Phase | Duration | Confidence |
|-------|----------|------------|
| Phase 0 (schema + docs) | 0.5 day | High |
| Phase 1 (MCP wiring, 3 servers) | 2-3 days | Medium |
| Phase 2 (5 new members) | 0.5 day | High |
| Phase 3 (first capability) | 3-5 days | Medium |
| Phase 4 (autonomy in practice) | included in Phase 1 | High |
| Phase 5 W1-W3 (rollout) | included in Phase 1-3 | High |
| Phase 5 W4 (Postgres MCP) | 2 days | Medium |
| Phase 5 W5 (GitHub + Stripe) | 3 days | Medium |
| Phase 5 W6 (rag-curator first use) | 2 days | High |
| **Total to first AI-suggests-automation demo** | **~10-12 days** | Medium |
| **Total to full vision (W1-W6)** | **~15-18 days** | Low |

---

## 18. Critical Path

```
W0 (validate plan)  →  W1 (MCP wiring: Laravel + Playwright)  →  W2 (schema v3.1)  →  W3 (first capability, end-to-end)
                                                              │
                                                              └─▶ demo to user
                                                                   │
                                                                   ├─▶ W4 (Postgres MCP)
                                                                   ├─▶ W5 (GitHub + Stripe)
                                                                   └─▶ W6 (RAG curator)
```

The MCP wiring (W1) is the longest pole. The first end-to-end capability (W3) unblocks the `automation-builder` member's usefulness, which then accelerates everything after.

**If W1 slips:** All subsequent waves slip. Mitigation: start W1 with Laravel MCP only (P0), defer Playwright to W2 if needed.

**If W3 slips:** Demo is delayed. Mitigation: ship a UI-less curl-based demo for W3 acceptance, then add the UI in W4.

---

## 19. Open Questions (None Remaining)

All strategic questions resolved. The 7 locked decisions are:
1. Full vision scope
2. AI suggests automations (first capability)
3. All three autonomy modes
4. Per-request cost ceiling ($0.50 default)
5. Both storage (Postgres + plan.md)
6. Both gates (user + ceo)
7. stdio sidecar transport

---

## 20. Execution: Next Steps

When the user signals "exit plan mode":

1. **Wave W0** — Spawn `ceo` sub-session for TKT-PLAN-001 (validate this plan against Aquerii strategy)
   - Expected return: {"status": "done", "summary": "plan validated, recommend proceed", "files": []}
2. **Wave W1** — Spawn 2× `mcp-architect` in parallel for TKT-MCP-001, TKT-MCP-002, TKT-MCP-003
3. **Wave W2** — Spawn `doc-engineer` for 5 TKT-CFG tickets (one per new member)
4. **Wave W3** — Spawn `automation-builder` + `agent-reviewer` + `agent-tester` + `ceo` in parallel
5. **Wave W3 verification** — Playwright E2E + manual user approval test
6. **Wave W4-W6** — Sequential, each gated by prior wave's verification

**Pause/resume points:**
- After W0: confirm plan with user before W1
- After W3: demo to user before W4
- After W6: full review, plan v0.4.0

**Stop conditions:**
- 2 consecutive wave failures → escalate to user
- Any security incident → halt all MCP traffic, notify
- Cost ceiling hit 3 times in 24h → auto-pause, notify user

---

## Appendix A — Prior Work: D.slice Production-Readiness Sweep

**Status:** Shipped as v0.2.0 (2026-06-06)

### Root cause
- `services/web/src/components/ui/DataTable.tsx` — `data.slice()` / `[...data].sort()` throws on non-array
- `services/web/src/pages/DashboardPage.tsx:226-232` — double-nested grid
- `services/web/src/pages/support/TicketDetailPage.tsx:70` — TS2367 type error

### Wave 5 fixes (debugger-1 + designer)
- `DataTable.tsx`: `safeData` useMemo coercion (array→keep, `{data:[]}`→unwrap, else→`[]`)
- `DashboardPage.tsx`: removed redundant outer grid
- `TicketDetailPage.tsx:70`: `as string` cast
- `DataTable.test.tsx`: 3 regression tests added

### Wave 6 fixes (builder-1 + debugger-2 + Leader)
- TKT-API-001 (builder-1): added `upcoming_meetings` to `ReportController::dashboard()` lines 89-95/109
- TKT-API-002 (debugger-2): audit-only — found all list endpoints consistently paginated
- TKT-VAL-001 (Leader rewrote `validate.mjs` v3 schema: 0 errors/0 warnings)

### Wave 7 (reviewer + qa-lead-frontend + qa-lead-integration)
- qa-lead-frontend: 13/13 tests pass, tsc clean, build clean
- qa-lead-integration: team validate+enforce pass; 2 pre-existing gaps (GAP-QA-INT-001, GAP-QA-INT-002)
- reviewer: Leader override verdict (path-blocked sub-session)

### Wave 8 (doc-engineer + release-engineer)
- Created `CHANGELOG.md` with 0.2.0 release notes
- Bumped `services/web/package.json` version 0.1.0 → 0.2.0

### Final state
- 0 running, 9 done, 0 blocked, 7 idle
- All 8 gaps resolved
- tsc clean, vite build clean, vitest 13/13 pass, validate.mjs 0/0

### Team state at handoff
- **Active members:** ceo, eng-manager, designer (done), builder-1 (done), builder-2 (idle), builder-3 (idle), reviewer (done), debugger-1 (done), debugger-2 (done), debugger-3 (idle), debugger-4 (idle), qa-lead-backend (idle), qa-lead-frontend (done), qa-lead-integration (done), release-engineer (done), doc-engineer (done)
- **Strict-scope members:** debugger-1, debugger-2, debugger-3, debugger-4

---

## Appendix B — Existing System Inventory

### Services

```
services/
├── api/                 # Laravel 11 (PHP 8.3)
│   ├── app/
│   │   ├── Core/        # HTTP, Middleware, Models
│   │   ├── Modules/     # Auth, CRM, ERP, Billing, Inventory, Automation, etc.
│   │   └── ...
│   ├── routes/
│   ├── tests/
│   └── composer.json
├── web/                 # Vite + React 18 + TypeScript
│   ├── src/
│   │   ├── components/ui/   # DataTable, Button, etc.
│   │   ├── pages/           # DashboardPage, support/, etc.
│   │   ├── api/
│   │   └── ...
│   ├── tests/
│   └── package.json
├── ai/                  # FastAPI (Python 3.11)
│   ├── app/
│   │   ├── agents/__init__.py  # EMPTY — target for new agent implementations
│   │   ├── core/providers.py   # OpenAI/Anthropic/Gemini abstraction
│   │   ├── core/config.py      # settings: provider keys, RAG, credit costs
│   │   ├── security/auth.py    # internal token auth
│   │   ├── security/sanitizer.py  # PII/injection detection
│   │   ├── routers/            # 28 endpoints across 8 routers
│   │   │   ├── ai_routes.py    # 9 endpoints (task gen, document gen, automation gen, etc.)
│   │   │   ├── chat.py         # 1 endpoint
│   │   │   ├── crm.py          # 7 endpoints (deal score, summary, churn, etc.)
│   │   │   ├── documents.py    # 1 endpoint
│   │   │   ├── email.py        # 1 endpoint
│   │   │   ├── predictions.py  # 3 endpoints (task duration, delay risk, OKR)
│   │   │   ├── rag_routes.py   # 4 endpoints (ingest, query, etc.)
│   │   │   ├── tasks.py        # 1 endpoint
│   │   │   └── health.py       # 1 endpoint
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt        # fastapi, openai, anthropic, google-generativeai, chromadb, faiss-cpu, sentence-transformers, redis, opentelemetry
│   └── Dockerfile
├── mcp-laravel/         # Phase 1: NEW
├── mcp-playwright/      # Phase 1: NEW
├── mcp-postgres/        # Phase 4: NEW
├── mcp-github/          # Phase 5: NEW
└── mcp-stripe/          # Phase 5: NEW
```

### Existing AI endpoints (28 total)

**`routers/ai_routes.py` (9 endpoints):**
- `POST /ai/task/generate-description`
- `POST /ai/document/generate`
- `POST /ai/automation/generate` ← **extended in Phase 3**
- `POST /ai/flowchart/generate`
- `POST /internal/index`
- `POST /ai/document/analyze`
- `POST /ai/document/auto-tag`
- `POST /ai/document/link-deal`
- `POST /internal/extract-text`

**Other routers:** chat (1), crm (7), documents (1), email (1), predictions (3), rag (4), tasks (1), health (1)

### Existing Automation module

**`services/api/app/Modules/Automation/`:**
- `Models/Automation.php` — automation model with `triggers` and `actions` JSONB columns
- `Services/AutomationEngine.php` — evaluates triggers, runs actions
- `Http/Controllers/AutomationController.php` — CRUD
- `Migrations/` — schema for `automations` and `automation_runs`

**Trigger types:** `item.created`, `item.updated`, `item.deleted`, `item.status.changed`, `item.assignee.added`

**Action types:** `change_status`, `assign_user`, `send_notification`, `move_item`, `create_item`

**Templates:** seeded via `ImportAgentTemplates.php` and `ImportAgencyAgentTemplates.php` console commands

### AI security primitives

**`services/ai/app/security/sanitizer.py`:**
- PII regex patterns: SSN, CARD, EMAIL, PHONE
- Injection patterns: "ignore previous instructions", "DAN mode", etc.
- Max input length: 10,000 chars
- Output sanitization: not yet implemented (Phase 1 extension)

**`services/ai/app/security/auth.py`:**
- `X-Internal-Key` / `X-Internal-Secret` headers
- `Bearer` token support
- 24h token TTL

### Team system current state

**`team/team.config.json` v3.0 (16 members):**
- 1× ceo
- 1× eng-manager
- 1× designer
- 3× builder (1, 2, 3)
- 1× reviewer
- 4× debugger (1, 2, 3, 4)
- 3× qa-lead (backend, frontend, integration)
- 1× release-engineer
- 1× doc-engineer

**`team/scripts/`:**
- `validate.mjs` — v3, 0 errors/0 warnings
- `enforce.mjs` — passes
- `recover.mjs` — sub-session crash recovery

**`team/SYSTEM.md`** — v4.0 sub-session architecture (Leader.md, DASHBOARD.md, GAPS.md, audit.log)

### `.opencode/AGENTS.md` MCP table (aspirational)

| MCP | Purpose | Actual Status |
|-----|---------|---------------|
| filesystem | Aquerii + Devine Brain file access | ❌ Not wired in `services/ai` |
| github | Repo operations | ❌ Not wired |
| postgresql | Aquerii database (aquerii_test) | ❌ Not wired |
| mysql | InvenTree sidecar DB | ❌ Not wired |
| graphify | Knowledge graph mapping | ❌ Not wired |
| ruflo | Python linting | ❌ Not wired |
| playwright | E2E testing | ❌ Not wired |
| fetch | Web research | ❌ Not wired |

**Resolution:** Phase 0.1 will update this table to reflect actual state.

### Legacy v2 system backup

**`team-backup-1780607867204/`:**
- `team/SYSTEM.md` v2 — GStack skills + Ruflo MCP per-member mapping
- `team/LEADER-PROMPT.md` §16 — GStack & Ruflo tools table
- Member mappings: member-04 (AI service) had Ruflo for Python linting; member-01/02/03/07/08 had filesystem+github+postgresql

**Use as reference only** — not active code.

---

## Appendix C — References

### Strategy documents
- `docs/final run.md/07-MCP-AI-OPERATIONS.md` — 3-tier AI modes, MCP policy, safety controls
- `.opencode/plans/plan.md` §13 — MCP & AI AUTOMATION LAYER (phased A1/A2/G1/G3/G5)

### Code references
- `services/ai/app/main.py` — FastAPI entry
- `services/ai/app/core/providers.py` — OpenAI/Anthropic/Gemini abstraction
- `services/ai/app/security/{auth,sanitizer}.py` — internal auth + PII/injection detection
- `services/api/app/Modules/Automation/Services/AutomationEngine.php` — trigger/action evaluator
- `services/api/app/Modules/Automation/Http/Controllers/AutomationController.php` — CRUD

### Team system references
- `team/SYSTEM.md` v4.0
- `team/Leader.md` sub-agent type table
- `team/scripts/validate.mjs` v3
- `team/audit.log` — Wave 5/6/7/8 entries from D.slice sweep

### External references
- MCP protocol spec: https://modelcontextprotocol.io/
- Laravel MCP: https://github.com/laravel/mcp
- Playwright MCP: https://github.com/microsoft/playwright-mcp
- PostgreSQL MCP: https://github.com/modelcontextprotocol/server-postgres
- GitHub MCP: https://github.com/modelcontextprotocol/server-github

---

**End of plan. Awaiting user signal to exit plan mode and begin Wave W0.**
