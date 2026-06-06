---
project: "Aquerii"
purpose: "Team orchestration onboarding documentation"
last_updated: "2026-06-04T21:17:47.815Z"
---

# team-orch — Team Orchestration System

## Quick Start
```bash
team-orch init --preset standard
team-orch status
team-orch assign builder-1 "Implement auth endpoints"
team-orch unlock builder-1
```

## Presets
- `standard` — ceo + eng-manager + designer + reviewer + 4 debuggers + qa-lead + release-engineer + doc-engineer
- `minimal` — eng-manager + builder (for solo projects)
- `full-stack` — standard + 2 builders
- `aquerii` — 16 typed members specific to Aquerii project

## Commands
- `team-orch types` — List available agent types
- `team-orch init --preset <name>` — Initialize from preset
- `team-orch add <id> --type <type>` — Add a typed member
- `team-orch remove <id>` — Remove a member
- `team-orch assign <id> "task"` — Assign task
- `team-orch unlock <id>` — Unlock member
- `team-orch done <id>` — Mark done
- `team-orch block <id> "reason"` — Mark blocked
- `team-orch status` — Show status
- `team-orch dashboard` — Show dashboard
- `team-orch spawn debugger --ticket X --context ...` — Spawn debugger
- `team-orch close <id> --resolution ...` — Close dynamic member
- `team-orch validate` — Validate files
- `team-orch enforce` — Run enforcement
- `team-orch recover` — Recover crashes
- `team-orch doctor` — Diagnose config

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

## How It Works
Each member gets a `team/members/<id>/` directory with:
- `plan.md` — Current task and objectives (with context_files for strict scope)
- `instruction.md` — Role-specific rules and tools (merged from base + type overlay)
- `status.md` — Current state (idle/running/done/blocked)
- `wait.md` — Dependencies on other members

## Agent Types
| Type | Role | Skills |
|------|------|--------|
| ceo | Strategic direction | /office-hours, /plan-ceo-review |
| eng-manager | Leader | /plan-eng-review, /retro, /plan-tune |
| designer | UX/product design | /design-shotgun, /design-consultation |
| builder | Implementation | /review, /health |
| reviewer | Code review | /review, /health |
| debugger | Root-cause analysis | /investigate, /review |
| qa-lead | Test/QA | /qa, /browse, /investigate |
| release-engineer | Ship/deploy | /ship, /land-and-deploy, /canary |
| doc-engineer | Documentation | /document-generate, /document-release |

## Created
2026-06-04T21:17:47.815Z
