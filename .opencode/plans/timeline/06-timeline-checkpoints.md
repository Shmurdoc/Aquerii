# 06 — Timeline, Milestones & Re-Evaluation Gates

> **Owner**: Project Manager (You)
> **Rule**: Every checkpoint is a go/no-go decision. If tests fail, you stop and fix before proceeding.
> **Cadence**: Weekly check-in on Mondays. Phase gate review after each phase.

---

## EXECUTION STRATEGY

### Group Execution Model

```
Weeks 1-2:  ALL GROUPS → Alpha-1 (Bug Fix Gateway)
             Single focus. Everyone helps fix E2E bugs.
             Week 2: Install Laravel MCP + Playwright MCP + .mcp.json
             Week 2: Create BoardServer + CrmServer MCP tools

Weeks 3-6:  PARALLEL EXECUTION + MCP EXPANSION
             Alpha → A2 (Auth), A3 (Realtime), A4 (Search), A5 (Notifications)
             Alpha → A6: DocumentServer, InventoryServer, AiServer, AutomationServer MCP tools
             Beta  → B1 (CRM), B2 (Documents), B3 (Inventory) + MCP tools per module
             Gamma → G1 (Billing), G2 (Admin) + BillingServer + AdminServer MCP tools

Weeks 7-8:  ALL GROUPS → Beta-4 (Automation) — Critical Path
             Beta builds the engine. Alpha wires observers. Gamma tests.
             + n8n sidecar with MCP enabled

Weeks 9-10: PARALLEL EXECUTION + EXTERNAL MCP
             Alpha → done, review + fix bugs
             Beta  → B5 (AI Complete) + AiServer MCP tools
             Gamma → G3 (CI/CD), G4 (Security), G5 (Performance)
             Gamma → Configure Stripe MCP, GitHub MCP, PostgreSQL MCP

Week 11:    FINAL BRUTAL GAUNTLET + MCP VERIFICATION
             ALL GROUPS: Full gauntlet + 30+ MCP tools + 7 servers healthy, ship.
```

---

## WEEK-BY-WEEK TIMELINE

### Week 1: Foundation Gate 🟢

**Focus**: ALL GROUPS — Bug fixes (Alpha-1)
**Files**: `01-core-engine.md` → Phase A1

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| Mon | Audit current E2E failures | All | Root cause doc |
| Tue | Fix B1-B4 (testids, config, tests) | All | 12/12 Chromium E2E passing |
| Wed | Investigate B5 (Firefox) | All | Root cause documented |
| Thu | Fix Firefox if possible | All | 12/12 Firefox E2E passing |
| Fri | **RE-EVALUATION CHECKPOINT** | PM | Full gauntlet run. Go/No-Go |

**Exit Criteria**: 12/12 Chromium + 12/12 Firefox E2E, 46/46 PHPUnit
**Decision Gate**: If E2E still failing → extend week 1. Do not proceed.

---

### Week 2: Auth Hardening + MCP Infrastructure 🔵

**Focus**: Alpha-2 (Auth), Gamma starts G1, MCP setup (All)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| Mon | Email verification middleware | Alpha | EnsureEmailIsVerified middleware |
| Tue | MFA flow (enable, verify, require) | Alpha | TOTP working end-to-end |
| Tue | Install Laravel MCP + Playwright MCP + .mcp.json | All | `composer require laravel/mcp`, MCP tools available |
| Wed | Token expiry + refresh rotation | Alpha | 30-day expiry, refresh revokes old |
| Wed | Create BoardServer MCP tools (List, Create, Update, Delete) | Alpha | App\Mcp\Servers\BoardServer with 4 tools |
| Thu | Tests: EmailVerification, Mfa, TokenExpiry + MCP tests | Alpha | 10+ new tests, all passing |
| Thu | Create CrmServer MCP tools (Search, Create, Merge) | Alpha | App\Mcp\Servers\CrmServer with 3+ tools |
| Fri | Gamma: Stripe product setup + checkout | Gamma | Stripe products created, checkout endpoint returns URL |
| Fri | **RE-EVALUATION CHECKPOINT** | PM | Full gauntlet run. Go/No-Go |

**Exit Criteria**: 54+ PHPUnit, E2E all green, MFA works, BoardServer + CrmServer MCP tools working
**Decision Gate**: Auth tests failing → don't proceed. This is the foundation.

---

### Week 3: Realtime + Billing + MCP Servers 🔵🔵

**Focus**: Alpha-3 (Realtime), Gamma G1 (Billing continued), MCP completion

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| Mon | Create broadcasting events (BoardCreated, etc.) | Alpha | 5 event classes |
| Mon | Create DocumentServer + InventoryServer MCP tools | Alpha | 8+ MCP tools across both servers |
| Tue | Wire observers → broadcast domain events | Alpha | Every model change broadcasts |
| Wed | Configure broadcasting auth endpoint | Alpha | POST /broadcasting/auth works |
| Wed | Create AiServer MCP tools (Chat, Summarize, AutoTag) | Alpha | 5 MCP tools for AI interaction |
| Thu | Wire presence channels + frontend | Alpha | usePresence shows online users |
| Thu | Create BillingServer MCP tools | Gamma | 5+ MCP tools for billing ops |
| Fri | Gamma: Webhook handlers + plan enforcement | Gamma | Stripe webhook processes all events |
| Fri | **RE-EVALUATION CHECKPOINT** | PM | Full gauntlet + MCP health check. Go/No-Go |

**Exit Criteria**: 59+ PHPUnit, realtime broadcasting, ALL Alpha MCP servers live
**Decision Gate**: Realtime not broadcasting → don't proceed.

---

### Week 4: CRM + Admin + MCP Expansion 🔵🟢

**Focus**: Beta-1 (CRM), Gamma G2 (Admin), Alpha-4 (Search)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| Mon | CRM: audit routes, add stage reorder | Beta | Stage reorder endpoint |
| Mon | Add CRM MCP tools (MergeContacts, ReorderStages) | Beta | CrmServer expanded |
| Tue | CRM: stage validation, contact dedup | Beta | Transition validation works |
| Wed | CRM: write 8+ tests | Beta | CrmTest.php green |
| Wed | Gamma: Admin billing + AI dashboard | Gamma | BillingEventResource, AI usage widget |
| Wed | Create AdminServer (local only) with 4+ tools | Gamma | App\Mcp\Servers\AdminServer |
| Thu | Gamma: Feature flag UI, audit log explorer | Gamma | All admin features working |
| Thu | Alpha: Meilisearch Scout integration | Alpha | Searchable models configured |
| Thu | Add AutomationServer MCP tools (CreateAutomation, TestRule) | Alpha | 5 MCP tools for automations |
| Fri | **RE-EVALUATION CHECKPOINT** | PM | Full gauntlet + MCP health check. Go/No-Go |

**Exit Criteria**: 67+ PHPUnit (Beta), 64+ (Gamma), 63+ (Alpha) = ~85 total, MCP expansion on 3 new servers
**Decision Gate**: Any module failing tests → don't proceed.

---

### Week 5-6: Documents + Inventory + CI/CD 🔵🔵🔵

**Focus**: Beta-2 (Documents), Beta-3 (Inventory), Gamma G3 (CI/CD)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| Mon | Beta-2: Y.js sync + document folders | Beta | Collaborative editing via WebSocket |
| Tue | Beta-2: OCR pipeline + Paperless proxy | Beta | Upload PDF → OCR complete |
| Wed | Beta-3: Product images + barcodes | Beta | Image upload, barcode generation |
| Thu | Beta-3: Stock movements + low stock alert | Beta | Movement history, alert job |
| Thu | Gamma: composer.lock + web lint stage | Gamma | CI web stage green |
| Fri | Gamma: E2E + Semgrep + performance stages | Gamma | CI 8 stages green |
| Fri | **RE-EVALUATION CHECKPOINT** | PM | Full gauntlet. Go/No-Go |

**Exit Criteria**: 97+ PHPUnit, CI 8 stages green, documents + inventory working
**Decision Gate**: CI failing → don't proceed.

---

### Week 7-8: AUTOMATION ENGINE (Critical Path) 🔴

**Focus**: ALL GROUPS — Beta-4 (Automation)

**THIS IS THE MOST CRITICAL PHASE. THE AUTOMATION ENGINE IS THE WEAKEST MODULE.**

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| Mon | Create TriggerType + ActionType enums | Beta | Enums defined, all types listed |
| Tue | Build AutomationEngine::evaluate() | Beta | All 5 triggers evaluatable |
| Wed | Build action handlers (ChangeStatus, AssignUser, etc.) | Beta | 5 action classes |
| Thu | Wire EvaluateAutomationTriggers job to observers | Alpha | Domain events trigger automations |
| Fri | Write 12+ tests for engine + integration | Beta | AutomationTest.php green |
| Fri | **RE-EVALUATION CHECKPOINT** | PM | FULL BRUTAL GAUNTLET. Go/No-Go |

**Exit Criteria**: 109+ PHPUnit, ALL automation tests passing, engine working end-to-end
**Decision Gate**: THIS IS THE HARD GATE. If automation tests don't pass, the phase does not exit. Period.

---

### Week 9: AI Complete 🔵

**Focus**: Beta-5 (AI)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| Mon | Add streaming SSE to chat endpoint | Beta | /ai/chat streams tokens |
| Tue | Add context injection + prompt caching | Beta | Workspace-aware AI, Redis cache |
| Wed | Add fallback provider (Gemini → Claude) | Beta | Circuit breaker for AI |
| Thu | Add cost tracking + credit exhaustion UX | Beta | ai_usage_log, upgrade modal |
| Fri | **RE-EVALUATION CHECKPOINT** | PM | Full gauntlet. Go/No-Go |

**Exit Criteria**: 115+ PHPUnit, AI streaming works, caching reduces calls
**Decision Gate**: AI not streaming or credits not enforced → don't proceed.

---

### Week 10: Security + Performance + MCP External Integrations 🟢

**Focus**: Gamma G4 (Security), Gamma G5 (Performance), External MCP config

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| Mon | RLS audit + fix gaps | Gamma | All tables have RLS |
| Mon | Configure Stripe MCP for billing operations | Gamma | Stripe MCP live in .mcp.json |
| Tue | Rate limit audit + CORS + file upload hardening | Gamma | All endpoints rate-limited |
| Tue | Configure GitHub MCP for CI/CD | Gamma | GitHub MCP in .mcp.json |
| Wed | Token expiry enforcement + incident runbook | Gamma | Security tests pass |
| Wed | Configure PostgreSQL MCP for DB introspection | Gamma | PG MCP in .mcp.json |
| Thu | k6 load tests + N+1 detection + ClickHouse | Gamma | Performance tests pass |
| Fri | **RE-EVALUATION CHECKPOINT** | PM | Full gauntlet + all 5 MCP servers healthy. Go/No-Go |

**Exit Criteria**: 120+ PHPUnit, security tests pass, load tests pass, N+1 fixed, 5 MCP servers healthy
**Decision Gate**: Security issues found → fix before proceeding. MCP server failures = warning.

---

### Week 11: FINAL BRUTAL GAUNTLET + MCP Verification 🏆

**Focus**: ALL GROUPS — Full system validation

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| Mon | Run FULL PHPUnit suite (120+ tests) | All | 120+ tests, 0 failures |
| Mon | Run MCP server health check (all 7 web + 1 local) | All | All MCP servers respond to tools/list |
| Tue | Run FULL E2E suite (Chromium + Firefox) | All | 20+ tests, 0 failures |
| Wed | Run load test (100 concurrent users) | Gamma | All SLOs met |
| Wed | Verify MCP tools work end-to-end | All | AI agent creates board, searches CRM, checks billing |
| Thu | Run security scan (full suite) | Gamma | 0 Critical, 0 High |
| Thu | Verify Playwright MCP + GitHub MCP + Stripe MCP operational | Gamma | External MCP servers respond |
| Fri | **FINAL RE-EVALUATION CHECKPOINT** | PM | Production readiness decision |

---

## RE-EVALUATION CHECKPOINT PROTOCOL

Every Friday at 4:00 PM, run this exact process:

### Step 1: Run the Gauntlet

```bash
# 1. PHP Unit Tests
cd services/api && composer test > /tmp/phpunit-results.txt

# 2. E2E Tests
cd services/web && npx playwright test --project=chromium --workers=1 > /tmp/e2e-chromium-results.txt
cd services/web && npx playwright test --project=firefox --workers=1 > /tmp/e2e-firefox-results.txt

# 3. Security
cd services/api && composer audit > /tmp/security-php.txt
cd services/web && npm audit > /tmp/security-node.txt

# 4. MCP Health Check
php artisan mcp:inspect --server=boards 2>&1 | head -20
php artisan mcp:inspect --server=crm 2>&1 | head -20
# Check external MCP servers respond
curl -s -o /dev/null -w "%{http_code}" http://localhost:8931/mcp/health 2>/dev/null || echo "Playwright MCP not running"

# 5. Load Test (if k6 available)
k6 run services/tests/load/smoke-test.js > /tmp/load-test-results.txt
```

### Step 2: Record Results

```markdown
## Checkpoint: Week X — 2026-MM-DD

### Status: 🟢 PASS / 🟡 WARN / 🔴 FAIL

### Test Results
| Suite | Pass | Fail | Trend |
|-------|------|------|-------|
| PHPUnit | 46 | 0 | +0 from last week |
| E2E Chromium | 12 | 0 | +7 from last week |
| E2E Firefox | 0 | 12 | +0 from last week |
| Security (composer) | 0 adv | — | — |
| Security (npm) | 0 adv | — | — |
| Load test | SLOs met | — | — |
| MCP Boards | 4 tools online | — | +4 from last week |
| MCP CRM | 4 tools online | — | +4 from last week |
| MCP Stripe (ext) | connected | — | +1 from last week |
| Playwright MCP | connected | — | — |

### Blockers
1. [Blocker description] — Owner: [name] — ETA: [date]

### Decisions
- [Decision made this week]

### Next Week Plan
- [What the team will work on next]

### Go/No-Go for Next Phase: [GO / NO-GO]
```

### Step 3: Make the Call

| If | Then |
|----|------|
| ALL tests pass + no P0/P1 bugs + MCP servers healthy | 🟢 GO — proceed to next phase |
| Tests pass but P2/P3 bugs exist | 🟡 GO WITH WARNINGS — log bugs, fix within 1 week |
| Any test suite has failures | 🔴 NO-GO — fix failures before any new work |
| Security scan has Critical/High | 🔴 NO-GO — fix vulnerabilities before any new work |
| MCP server down (internal) | 🟡 WARNING — fix within 1 week. Feature still works via REST |
| MCP server down (external Stripe/GitHub/PG) | ⚪ NO EFFECT — dev convenience tools only |

---

## MILESTONE MAP

```
Week 1:  🟢 Foundation Gate       — E2E 12/12 Chromium + Firefox green, Playwright MCP installed
Week 2:  🔵 Auth + MCP Gate       — MFA, email, token, BoardServer+CrmServer MCP tools live
Week 3:  🔵 Realtime + MCP Gate   — Broadcasting + Document/Inventory/Ai/Billing MCP servers
Week 4:  🟢 CRM+Admin+MCP Gate    — CRM+Admin features + AdminServer+AutomationServer MCP
Week 5-6: 🟢 Docs+Inventory+CI Gate — OCR, stock, CI 8 stages + Document/Inventory MCP servers
Week 7-8: 🔴 AUTOMATION GATE       — Engine + n8n sidecar + AutomationServer MCP
Week 9:  🔵 AI Gate               — Streaming, caching, fallback + AiServer MCP
Week 10: 🟢 Security+Ext MCP Gate — RLS, rate limits + Stripe/GitHub/PG MCP external servers
Week 11: 🏆 SHIP GATE             — Full gauntlet + 7 MCP servers healthy, production-ready
```

---

## KPI TRACKING

| Metric | Current | Target | Phase Target |
|--------|---------|--------|-------------|
| PHPUnit tests | 46 | 120+ | +74 new tests |
| E2E Chromium | 5/12 | 20+/20+ | 100% passing |
| E2E Firefox | 0/12 | 20+/20+ | 100% passing |
| CI stages | 6 | 8 | +E2E + SAST |
| Security advisories | 0 | 0 | Maintain zero |
| Load test SLOs | Not measured | All met | P50 < 100ms, P99 < 500ms |
| N+1 queries | Not measured | 0 | All endpoint queries optimized |
| API routes tested | ~50% | 100% | Every endpoint has a test |
| Bug count (P0/P1) | 5 | 0 | All fixed |
| Code coverage | ~30% | 80%+ | Measured via PHPUnit coverage |
| MCP servers (web) | 0 | 7 | All modules exposed as MCP tools |
| MCP servers (local) | 0 | 1 | AdminServer (local only) |
| MCP servers (external) | 0 | 3 | Stripe, GitHub, PostgreSQL |
| MCP tests | 0 | 10+ | Mcp::fake() tests for every server |
| MCP tools total | 0 | 30+ | Across all 7 web + 1 local server |
| n8n sidecar | Not deployed | Running | Workflow automation with MCP enabled |

---

## WHAT SUCCESS LOOKS LIKE

At the end of Week 11:

1. **120+ PHPUnit tests** all green
2. **20+ E2E tests** all green on Chromium + Firefox
3. **CI pipeline** 8 stages, all green, runs on every PR
4. **Security scan** — 0 Critical, 0 High
5. **Load test** — all SLOs met at 100 concurrent users
6. **7 web MCP servers + 1 local + 3 external** all healthy:
   - BoardServer (4 tools) — AI manages boards end-to-end
   - CrmServer (4 tools) — AI manages deals/pipelines
   - DocumentServer (4 tools) — AI creates/searches documents
   - InventoryServer (4 tools) — AI tracks stock/products
   - AutomationServer (5 tools) — AI creates/tests automations
   - AiServer (5 tools) — AI chats, summarizes, auto-tags
   - BillingServer (5 tools) — AI manages subscriptions/invoices
   - AdminServer (4 tools, local) — AI manages feature flags/logs
   - Stripe MCP (external) — AI creates products/prices
   - GitHub MCP (external) — AI automates CI/CD/PRs
   - PostgreSQL MCP (external) — AI introspects/optimizes DB
   - Playwright MCP (external) — AI debugs E2E with live browser
7. **30+ MCP tools total** across all servers
8. **10+ MCP tests** using `Mcp::fake()` for every server
9. **n8n sidecar** running with MCP enabled
10. **All 11 modules** complete and tested:
    - Auth (email verification, MFA, token expiry, OAuth)
    - Boards (CRUD, columns, groups, items, comments, files)
    - Realtime (domain events, presence, broadcasting)
    - Search (Meilisearch, all models indexed)
    - Notifications (all 4 types, real-time delivery)
    - CRM (pipelines, stages, deals, contacts, dedup)
    - Documents (collaborative, scanned, OCR, folders)
    - Inventory (products, stock, movements, barcodes, alerts)
    - Automation (5 triggers, 5 actions, webhook, engine)
    - AI (streaming, caching, fallback, cost tracking)
    - Billing (Stripe, PayFast, plan enforcement)
11. **Security** — RLS on all tables, rate limits everywhere, CORS enforced
12. **Performance** — N+1 queries eliminated, k6 load tests passing

---

## IF THINGS GO WRONG

### Scenario: E2E tests still failing at week 2
**Response**: Stop all new feature work. Full team fixes E2E. No exceptions.

### Scenario: Automation engine can't be completed in 2 weeks
**Response**: Reduce scope. Ship with 3 triggers (ITEM_STATUS_CHANGED, ITEM_CREATED, COMMENT_ADDED) and 3 actions (CHANGE_STATUS, SEND_NOTIFICATION, CALL_WEBHOOK). Defer DUE_DATE_APPROACHING and ASSIGN_USER triggers to post-launch.

### Scenario: Stripe integration blocked (waiting on API keys)
**Response**: Gamma switches to G2 (Admin) + G3 (CI/CD) + G4 (Security). Billing deferred to week 10. Feature-flag billing routes as disabled.

### Scenario: Firefox issue unfixable
**Response**: Document as known browser limitation. Ship with Chromium-only E2E guarantee. Add a banner for Firefox users: "For the best experience, use Chrome."

### Scenario: Developer unavailable
**Response**: Tasks are written as super prompts. Any available developer can pick up any task. No single point of failure.

### Scenario: laravel/mcp package has breaking API changes
**Response**: Pin to the current working version (`composer require laravel/mcp:^0.6`). MCP servers are additive — if the package breaks, the REST API is unaffected. Document migration steps in an ADR.

### Scenario: Playwright MCP doesn't work on Windows
**Response**: Use the HTTP transport mode: `npx @playwright/mcp@latest --port 8931` and connect via URL instead of stdio. Document for the team.

### Scenario: n8n sidecar too complex for current infrastructure
**Response**: Defer n8n to post-launch. The Automation Engine handles domain reactions. n8n is for cross-system workflows only. Document in ADR. Feature-flag the n8n webhook endpoints.

### Scenario: External MCP servers (Stripe/GitHub/PG) not permitted by security
**Response**: Run all external MCP servers as Docker containers with read-only access. Stripe MCP runs with restricted API key (test mode only). GitHub MCP has repo-scoped token. PG MCP runs read-only. If still blocked, these are developer convenience tools — core functionality depends only on internal MCP servers.

---

## FILE INDEX

```
.opencode/plans/
├── plan.md                              # Master plan — MCP section 13, automation layer, plugin registry
├── handoff.md                           # System handoff (537 lines, complete spec)
└── timeline/
    ├── 00-system-architecture.md        # System design, MCP route map, container arch, route registry
    ├── 01-core-engine.md                # Group Alpha: +Playwright MCP debug, Phase A6 MCP servers, exit gate
    ├── 02-business-modules.md           # Group Beta: +MCP tools per module, n8n sidecar, exit gate
    ├── 03-platform-quality.md           # Group Gamma: +Stripe/GitHub/PG MCP, AdminServer, exit gate
    ├── 04-testing-framework.md          # Brutal testing: +MCP-augmented debugging, Han hooks, Mcp::fake()
    ├── 05-ai-super-prompts.md           # AI prompts: +MCP setup prompt, MCP-aware re-evaluation
    └── 06-timeline-checkpoints.md       # THIS FILE — MCP-aware timeline, milestones, KPI tracking
```

---

*Plan complete. Ready for execution.*
