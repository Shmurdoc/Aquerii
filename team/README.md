---
project: "Aquerii"
purpose: "Team orchestration onboarding documentation"
version: "5.0"
last_updated: "2026-06-11T00:00:00Z"
---

# team-orch — Team Orchestration System

## Quick Start

```bash
# Validate all state files
node team/scripts/validate.mjs

# Route a task (auto-discovers context files)
node team/scripts/route-task.mjs "Fix calendar endpoint 404"

# Sync member status files
node team/scripts/sync.mjs

# Capture learnings from a sub-session
node team/scripts/update-memory.mjs builder "Pattern: always eager-load relationships"

# Rebuild context graph from codebase
node team/scripts/build-context.mjs
```

## Architecture

This is a **sub-session orchestration system with persistent memory.** The Leader does not implement application code. Every unit of work is delegated to a sub-session via the `task` tool.

```
Leader → route-task.mjs → spawn sub-session → sub-session works → return structured summary
         ↓                                                        ↓
    sync.mjs ← update-memory.mjs ← audit.jsonl ← learnings captured
```

## State Layer

All state is in `team/state/` as JSON files:

- `roster.json` — Single source of truth for all 17 member states
- `gaps.json` — Structured gap tracker (deduplicated)
- `task-registry.json` — Hierarchical task tree with dependencies
- `audit.jsonl` — Append-only event log
- `dashboard.json` — Computed status (never hand-edited)

## Memory Layer

Persistent memory across sub-sessions in `team/memory/`:

| Area | File | When to update |
|------|------|----------------|
| Backend | memory/backend.md | After Laravel/PHP discoveries |
| Frontend | memory/frontend.md | After React/TypeScript discoveries |
| Infra | memory/infra.md | After Docker/CI/CD discoveries |
| Testing | memory/testing.md | After Pest/Playwright discoveries |
| Design | memory/design.md | After UI pattern discoveries |
| Security | memory/security.md | After auth/CORS/JWT discoveries |

## Context Layer

Auto-discovered file relationships:

- `context/rules.json` — Task-type → file-pattern rules
- `context/graph.json` — File relationships (imports, routes)

## Scripts

| Script | Purpose |
|--------|---------|
| `validate.mjs` | Validates all state/*.json schemas + member consistency |
| `sync.mjs` | Reconciles status.md ↔ roster.json |
| `route-task.mjs` | Auto-routes tasks to members with context discovery |
| `update-memory.mjs` | Extracts learnings from sub-session returns |
| `build-context.mjs` | Scans codebase, builds context/graph.json |

## Members

- **ceo** (ceo): Strategic direction and decomposition — `docs/strategy/`
- **eng-manager** (eng-manager): Planning and execution framing (Leader) — `team/`
- **designer** (designer): UX and product-design decisions — `docs/design/, services/web/src/components/`
- **builder-1** (builder): Implementation — Core API / Integration — `services/api/`
- **builder-2** (builder): Implementation — Feature Modules (CRM/ERP) — `services/api/app/Modules/CRM/, services/api/app/Modules/ERP/`
- **builder-3** (builder): Implementation — Feature Modules (Billing/Inventory) — `services/api/app/Modules/Billing/, services/api/app/Modules/Inventory/`
- **reviewer** (reviewer): Code quality and review (Senior Lead) — `team/reviews/`
- **debugger-1** (debugger): Root-cause analysis #1 (on-call) — `src/`
- **debugger-2** (debugger): Root-cause analysis #2 — `src/`
- **debugger-3** (debugger): Root-cause analysis #3 — `src/`
- **debugger-4** (debugger): Root-cause analysis #4 (overflow) — `src/`
- **qa-lead-backend** (qa-lead): QA — Backend (PHP/Pest, API integration) — `services/api/tests/`
- **qa-lead-frontend** (qa-lead): QA — Frontend (Playwright, Vitest, React) — `services/web/tests/`
- **qa-lead-integration** (qa-lead): QA — Integration (k6 load, E2E, CI) — `tests/, .github/workflows/`
- **release-engineer** (release-engineer): Release readiness and publishing flow — `infra/, deploy/`
- **doc-engineer** (doc-engineer): Documentation and handoff quality — `docs/`
- **dev-ops** (dev-ops): Infrastructure, CI/CD, Docker, deploy pipelines, monitoring, security — `infra/, .github/, docker-compose.yml, Dockerfile*, team/scripts/`

## Agent Types

| Type | Role | gstack Skills |
|------|------|---------------|
| ceo | Strategic direction | /office-hours, /plan-ceo-review |
| eng-manager | Leader | /plan-eng-review, /investigate |
| designer | UX/product design | /design-shotgun, /design-html, /design-review |
| builder | Implementation | /browse, /qa |
| reviewer | Code review | /review |
| debugger | Root-cause analysis | /investigate, /browse |
| qa-lead | Test/QA | /qa, /qa-only, /browse |
| release-engineer | Ship/deploy | /ship, /canary, /land-and-deploy |
| dev-ops | Infrastructure | /canary, /benchmark, /cso |
| doc-engineer | Documentation | /document-generate, /document-release |

## Created
2026-06-04T21:17:47.815Z
