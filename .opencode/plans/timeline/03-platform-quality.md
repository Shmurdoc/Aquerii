# 03 — Group Gamma: Platform & Quality

> **Lead Developer**: Platform & Quality
> **Responsibility**: Billing, Admin Panel, CI/CD Pipeline, Security Hardening, Performance Testing
> **Rule**: You own the platform layer that every module depends on. If it's not a feature, you own it.
> **Testing Gate**: Every change requires automated verification. No manual deployments.

---

## ROLE CONTRACT

**You are Group Gamma. You make the platform production-ready and keep it honest.**

You build the billing system that generates revenue. You maintain the admin panel that governs the platform. You write the CI/CD pipeline that prevents bad code from shipping. You harden security so the system doesn't get owned. You performance test so the system doesn't fall over.

**Your deliverables:**
- Billing: Stripe + PayFast integration, plan enforcement, subscription management
- Admin: Filament panel with workspace management, user management, feature flags, audit log
- CI/CD: 6 stages → 8 stages, E2E in CI, security scanning, performance benchmarks
- Security: SAST, dependency scanning, rate limiting audit, incident runbooks
- Performance: k6 load tests, Lighthouse audits, database query optimization

**Your non-negotiables:**
1. No deployment without CI green
2. No Stripe keys in code (Vault or .env only)
3. Every admin action logged to audit log
4. Rate limits enforced on all public endpoints
5. Load test results before every production release

---

## TASK LIST (Execute in Order)

### Phase G1: Billing System Complete

**Prompt for AI Agent:**
```
Complete the Billing module in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- BillingEvent model exists (event logging)
- BillingController with routes: show, createCheckout, createPortal, cancelSubscription, payfastCheckout
- Stripe PHP SDK installed (stripe/stripe-php ^15.0)
- WebhookController with stripe and payfast handlers
- SendBillingConfirmationEmail job exists
- BillingConfirmation mailable exists but is empty
- BillingServiceProvider registers routes
- Workspace has plan and plan_status columns
- BUT: the Stripe integration is NOT connected. No products, no prices, no subscriptions.

Tasks:
1. **Define Stripe products and prices** — In Stripe dashboard (or via API), create:
   - Free: price_$0 (always free, no Stripe subscription)
   - Starter: $9/seat/month (price_starter_monthly)
   - Growth: $14/seat/month (price_growth_monthly)
   - Business: $22/seat/month (price_business_monthly)
   - Enterprise: custom pricing
   Store price IDs in .env: STRIPE_PRICE_STARTER, STRIPE_PRICE_GROWTH, STRIPE_PRICE_BUSINESS

2. **Wire createCheckout** — POST /api/workspaces/{ws}/billing/checkout should:
   - Accept { price_id: string, success_url: string, cancel_url: string }
   - Create a Stripe Checkout Session with the price_id and workspace metadata
   - Return { url: "https://checkout.stripe.com/..." }
   - The frontend redirects the user to this URL

3. **Wire Stripe webhook** — POST /api/webhooks/stripe should:
   - Verify the Stripe webhook signature (stripe-webhook-secret from .env)
   - Handle: checkout.session.completed → update workspace.plan + plan_status = 'active'
   - Handle: customer.subscription.updated → update workspace.plan
   - Handle: customer.subscription.deleted → set plan_status = 'canceled'
   - Handle: invoice.paid → create BillingEvent record
   - Handle: invoice.payment_failed → create BillingEvent + send notification
   - Log to WebhookController (already exists)

4. **Wire cancelSubscription** — DELETE /api/workspaces/{ws}/billing/subscription should:
   - Cancel the Stripe subscription at period_end
   - Set plan_status = 'canceled'
   - Return { cancel_at_period_end: true, effective_date: "..." }

5. **Complete BillingConfirmation email** — In App/Modules/Billing/Mail/BillingConfirmation.php:
   - Accept workspace name, plan name, amount, date
   - Render a proper HTML email template
   - Send via SendBillingConfirmationEmail job (already exists)
   - The mailable should have a clear subject: "Your {plan} plan is active!"

6. **Add PayFast integration** — POST /api/workspaces/{ws}/billing/payfast/checkout should:
   - Generate PayFast form fields (merchant_id, merchant_key, return_url, cancel_url, notify_url)
   - Return { form_fields: {...}, form_action: "https://sandbox.payfast.co.za/eng/process" }
   - The frontend submits this form to PayFast
   - Create a webhook handler POST /api/webhooks/payfast that process ITN notifications
   - Handle PAYMENT_COMPLETE → update workspace.plan

7. **Add plan enforcement middleware** — Create CanAccessPlan feature:
   - A middleware that checks if the workspace's plan allows the requested feature
   - Feature matrix: free={boards: 3, members: 10, ai_credits: 100}, starter={boards: 10, members: 50, ai_credits: 500}, etc.
   - Apply to AI endpoints (check ai_credits against plan limit)
   - Apply to boards (check board count against plan limit)
   - Return 402 with upgrade_url when limit exceeded

8. **SyncStripeSubscriptionQuantity** — The job exists. Wire it to dispatch when workspace_members changes. It should update the Stripe subscription quantity to match the active member count.

9. **Write tests** — Create tests/Feature/BillingTest.php:
   - Create checkout session returns URL
   - Stripe webhook processes checkout.session.completed (mock Stripe)
   - Cancel subscription returns cancel_at_period_end
   - BillingConfirmation email renders correctly
   - Plan enforcement: free workspace with 4 boards gets 402 on 4th board creation
   - PayFast ITN processes PAYMENT_COMPLETE

After all changes:
- composer test — ALL existing + 6+ new = 85+ passing
- Verify: POST /api/webhooks/stripe with test event (use Stripe CLI: stripe trigger checkout.session.completed)
```

**Acceptance Criteria:**
- [ ] Stripe Checkout creates subscription
- [ ] Stripe webhook handles all 5 event types
- [ ] PayFast integration complete (ZA market)
- [ ] Plan enforcement middleware active
- [ ] BillingConfirmation email renders
- [ ] SyncStripeSubscriptionQuantity wired
- [ ] 6+ new tests passing
- [ ] All existing tests green

---

### Phase G2: Admin Panel Completion

**Prompt for AI Agent:**
```
Complete the Admin panel in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- Filament 3 panel at /admin with 4 resources: WorkspaceResource, UserResource, FeatureFlagResource, AuditLogResource
- Separate super_admins guard and schema
- AdminPanelProvider configures the panel
- All resources exist with basic configuration

Tasks:
1. **Add Billing management to Admin** — Create a BillingEventResource that lists all billing_events with filters (event_type, workspace, date range). Add an action to manually update a workspace's plan (for Enterprise customers). Add a "Force Sync Subscription" action on WorkspaceResource that dispatches SyncStripeSubscriptionQuantity.

2. **Add AI usage dashboard** — Create a Filament widget that shows:
   - Total AI credits consumed this month
   - Top 5 workspaces by AI usage
   - Cost breakdown by model (Gemini vs Claude)
   - Chart of daily AI usage (7 days)
   Read from ai_usage_log table (created in Group Beta Phase B5).

3. **Add module health view** — Create a HealthResource that shows:
   - Status of all 19 Docker containers
   - Queue size (Horizon dashboard URL)
   - Failed jobs count
   - Last backup timestamp
   - Read from Docker API or cache health check results

4. **Add feature flag UI toggle** — The FeatureFlagResource exists. Add a column showing if the feature is enabled/disabled for a specific workspace. Add a bulk action to enable/disable a feature for multiple workspaces. Add a filter by scope (global vs workspace).

5. **Add audit log explorer** — AuditLogResource exists. Add:
   - Search by entity_type, entity_id, user_id, workspace_id
   - JSON viewer for old_values / new_values (expandable)
   - Export to CSV
   - Retention policy: auto-delete logs older than 90 days (scheduled job)

6. **Add admin notification** — When a critical event happens (workspace deleted, user reported, billing failure), show a notification badge on the admin top bar. Use Filament's Notification system.

7. **Write tests** — Create tests/Feature/AdminTest.php:
   - Admin login with super_admin credentials
   - Admin can view WorkspaceResource list
   - Admin can force sync subscription
   - Non-admin user gets 403 on /admin/*
   - Audit log can be searched and filtered

After all changes:
- composer test — ALL existing + 5+ new = 94+ passing
- Verify: all 4+ Filament resources are functional
- Verify: admin user can toggle feature flags
```

**MCP Tools (AdminServer — local only):**
Create `App\Mcp\Servers\AdminServer` registered with `Mcp::local()` (stdio only, no HTTP):
- ToggleFeatureFlagTool: enable/disable a feature flag by key
- RunMigrationTool: run a specific migration (dev only)
- ViewLogsTool: tail recent application logs
- AuditUserTool: view audit trail for a specific user
- Resources: AuditLogResource, HealthResource

**Acceptance Criteria:**
- [ ] Billing management resource (events, subscriptions, invoices)
- [ ] AI usage dashboard with tile widgets
- [ ] Feature flag toggle page with scope
- [ ] Audit log explorer with filters
- [ ] Health view with service status
- [ ] AdminServer with 4+ tools + 2 resources (local only)
- [ ] 5+ new tests
- [ ] All existing tests green

---

### Phase G3: CI/CD Pipeline Hardening

**Prompt for AI Agent:**
```
Harden the CI/CD pipeline in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- 6-stage CI pipeline in .github/workflows/ci.yml (Static Analysis, Unit Tests, Security, Docker Build, Integration, Publish)
- composer.lock is NOT committed (cache miss on every run)
- No web frontend lint/test stage
- No E2E stage in CI
- No Semgrep SAST scanning
- No performance tests
- Publish stage only runs on main branch push

Tasks:
1. **Fix composer.lock** — Run `composer install` in services/api/ and commit the resulting composer.lock. This fixes the CI cache miss.

2. **Add web frontend stage** — Add a `lint-web` job after `lint-node`:
   - Runs on ubuntu-latest
   - `cd services/web && npm ci`
   - `npm run lint` (eslint)
   - `npm run build` (TypeScript check + Vite build)
   - This catches TypeScript errors and lint issues before they ship

3. **Add web test stage** — Add a `test-web` job:
   - Needs: lint-web
   - `cd services/web && npm test` (vitest, if any unit tests exist)
   - If no vitest tests exist yet, add at minimum a smoke test that verifies the app compiles

4. **Add E2E stage** — Add an `e2e` job:
   - Needs: docker-build (we need the API running)
   - Services: Spin up postgres + redis via docker compose
   - Run migrations + seed
   - `cd services/web && npx playwright test --project=chromium --workers=1`
   - Store Playwright report as artifact
   - Note: This requires the web server to be running. Set BASE_URL to the Docker Compose URL.

5. **Add Semgrep SAST stage** — Add a `sast` job between Security and Docker Build:
   - `semgrep ci` with config: auto (default rules)
   - Scan for: SQL injection, XSS, hardcoded secrets, command injection
   - Fail on any blocking finding

6. **Add performance benchmark stage** — Add a `performance` job (optional, non-blocking):
   - Needs: docker-build
   - Run a simple k6 smoke test against the health endpoint
   - Record response times as artifact
   - This gives us a performance baseline over time

7. **Add workflow dispatch for manual deploy** — Add workflow_dispatch trigger with input:
   - environment: staging | production
   - version: string (default: github.sha)
   - This allows manual deployment from the GitHub UI

8. **Optimize CI caching** — Add proper cache keys:
   - PHP: key: composer-${{ hashFiles('services/api/composer.lock') }}
   - Node (realtime): key: npm-${{ hashFiles('services/realtime/package-lock.json') }}
   - Node (web): key: npm-${{ hashFiles('services/web/package-lock.json') }}
   - Python: key: pip-${{ hashFiles('services/ai/requirements.txt') }}
   - Docker: Use GHA cache-to type=gha for layer caching

After all changes:
- Push to a test branch and verify CI runs all 8+ stages green
- Verify E2E stage produces Playwright report artifact
- Verify Semgrep scan produces output (zero findings is expected)
```

**GitHub MCP (external — for AI agent CI/CD automation):**
Configure GitHub MCP server for development:
```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "ghcr.io/github/github-mcp-server"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```
The AI agent uses this to: create PRs, run workflows, check CI status, review diffs, manage issues.
Toolsets: repos,issues,pull_requests,code_security,actions

**Acceptance Criteria:**
- [ ] composer.lock committed
- [ ] Web lint + build stage in CI
- [ ] Web test stage in CI
- [ ] E2E stage in CI (Playwright)
- [ ] Semgrep SAST stage in CI
- [ ] Performance benchmark stage (optional)
- [ ] Manual deploy via workflow_dispatch
- [ ] Cache optimized for all languages
- [ ] CI pipeline green on test branch
- [ ] GitHub MCP configured for AI agent PR/CI automation

---

### Phase G4: Security Hardening

**Prompt for AI Agent:**
```
Harden security in Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- SetWorkspaceTenant middleware sets app.current_workspace_id for RLS
- All tenant tables have RLS policies
- Sanctum token-based auth
- Rate limiting configured for auth and AI endpoints
- Idempotency middleware on all mutating endpoints
- Caddy security headers (HSTS, X-Content-Type-Options, X-Frame-Options)
- Internal secrets for AI and realtime services

Tasks:
1. **Audit RLS policies** — Run the query from handoff.md section 14:
   `SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public';`
   Verify EVERY tenant table has an RLS policy. Tables that MUST have RLS:
   workspace_members, boards, board_columns, board_groups, items, comments, files,
   notifications, activity_log, documents, document_folders, crm_pipelines,
   crm_pipeline_stages, crm_deals, crm_contacts, crm_companies, automations,
   automation_runs, ai_credits, scanned_documents, inventory_categories, products, stock_items
   Report any missing RLS policies.

2. **Audit rate limits** — Every public endpoint must have a rate limit. Check:
   - /api/auth/login: 5/min ✅
   - /api/auth/register: 10/min ✅
   - /api/auth/forgot-password: 3/min ✅
   - /api/auth/reset-password: 5/min ✅
   - /api/auth/refresh: 10/min ✅
   - /api/ai/*: 30/hour per workspace ✅
   - All general /api/*: 120/min per user 🔴 (CONFIGURE THIS)

3. **Add CORS enforcement** — The Caddyfile doesn't restrict CORS origins. Add CORS headers:
   - In production: allow only the production domain
   - In dev: allow localhost:3000 and the Docker domain
   - Block all other origins with 403

4. **Harden file uploads** — The FileController@store and ScannedDocumentController@store accept uploads:
   - Add file type whitelist: only allow images (jpeg, png, gif, webp), PDF, text, CSV
   - Add file size limit: 100MB max (already has |max:102400)
   - Add virus scanning placeholder: log a warning if file is a potential threat
   - Store files with UUID filenames (prevent path traversal)

5. **Add SQL injection protection** — All queries use Eloquent ORM (parameterized). But there may be raw JSON path queries on items.column_values. Search for `DB::raw(`, `whereRaw(`, `orderByRaw(` in the codebase. If any accept user input, parameterize them.

6. **Add session timeout** — Sanctum tokens never expire (bug logged as B5 priority). Implement:
   - Token expiry: 30 days on login token
   - Refresh token: 7 days
   - Long-lived API tokens: configurable (7, 30, 90, 365 days)
   - Add `auth:token-expiry` middleware that checks token age

7. **Write incident runbook** — Create `. opencode/runbooks/incident-response.md`:
   - P0: Service down, data loss — notify Lead, fix within 1 hour
   - P1: Feature broken for all users — fix within 4 hours
   - P2: Feature broken for some users — fix within 24 hours
   - P3: Cosmetic or non-critical — fix within 1 week
   - Runbook template: Detection → Triage → Fix → Verify → Postmortem

8. **Write tests** — Create tests/Feature/SecurityTest.php:
   - File upload rejects invalid MIME type (422)
   - File upload rejects oversized file (413)
   - CORS blocks unknown origin (403)
   - Expired token returns 401
   - RLS blocks cross-workspace query (404)

After all changes:
- composer test — ALL existing + 3+ new = 98+ passing
- Run: k6 run services/tests/load/smoke-test.js (verify no crashes)
- Run the DB query test and fix any N+1 issues
```

**PostgreSQL MCP (external — for AI agent DB optimization):**
Configure PostgreSQL MCP server for AI agent database introspection:
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://aquerii:${DB_PASSWORD}@localhost:5432/aquerii"]
    }
  }
}
```
The AI agent uses this to: introspect schemas, analyze query plans, detect N+1 patterns,
suggest indexes, monitor slow queries. Tools: introspect_schema, run_query (read-only),
explain_query, suggest_indexes, detect_slow_queries.

**Acceptance Criteria:**
- [ ] k6 load test scripts created (smoke, load, stress)
- [ ] SLO targets defined and enforced in tests
- [ ] N+1 query detection tests (board + item list)
- [ ] ClickHouse analytics wired to domain events
- [ ] Lighthouse performance targets defined
- [ ] PostgreSQL MCP configured for AI agent DB introspection
- [ ] 3+ performance regression tests
- [ ] All existing tests green

---

### Phase G5: Performance Testing & Optimization

**Prompt for AI Agent:**
```
Add performance testing infrastructure to Aquerii at C:\Users\madoc\source\repos\Aquerii.

Current state:
- No load testing infrastructure
- No performance benchmarks
- No database query monitoring
- 46 PHP unit tests (not performance-optimized)
- ClickHouse running but not used for analytics

Tasks:
1. **Add k6 load testing** — Create services/tests/load/ directory with:
   - smoke-test.js: 1 virtual user, 30s, hits /api/healthz and a few CRUD endpoints
   - load-test.js: ramp up 0→100 VUs over 5min, sustain 100 VUs for 10min, ramp down
   - stress-test.js: ramp up 0→200 VUs over 10min (2x expected peak)
   - Endpoints to test: GET /api/workspaces/{ws}/boards, POST create item, GET search
   - Run with: `k6 run services/tests/load/smoke-test.js`

2. **Add SLO measurement** — Define SLO targets in tests/load/slos.js:
   - P50 latency: < 100ms
   - P99 latency: < 500ms
   - Error rate: < 0.1%
   - All endpoints at 100 concurrent users
   - Test should FAIL if any SLO is breached

3. **Add database query monitoring** — Run a test that enables DB query logging:
   - `DB::enableQueryLog()` before the test
   - Execute a board list + item list (the most common dashboard query)
   - Assert N+1 queries don't exist: total queries for loading a board with 20 items < 10
   - If N+1 exists, add `->with()` eager loading to fix

4. **Add ClickHouse analytics** — Wire the UpdateClickHouseAnalytics job:
   - The job already exists in App/Core/Jobs/
   - It should fire on every domain event (board created, item created, etc.)
   - Write to clickhouse.aquerii_analytics.events table
   - Verify: create an item → check ClickHouse for the event record

5. **Add Lighthouse performance testing** — Create services/tests/performance/lighthouse.js:
   - Run Lighthouse against the SPA (web:80)
   - Performance score target: > 85
   - Accessibility score target: > 90
   - Best Practices score target: > 90
   - Note: this requires the full stack running

6. **Write performance regression tests** — Create tests/Feature/PerformanceTest.php:
   - Board list query count: assert < 10 queries
   - Item list with comments: assert < 15 queries (eager loading)
   - Item create: assert < 5 queries
   - These fail CI if regressions introduce N+1 queries

After all changes:
- composer test — ALL existing + 6+ new = 89+ passing
- Verify: POST /api/webhooks/stripe with Stripe CLI triggers webhook handler
- Verify: GET /api/workspaces/{ws}/billing returns plan info
```

**MCP Tools (BillingServer — new):**
Create `App\Mcp\Servers\BillingServer` with:
- CreateCheckoutSessionTool: create Stripe checkout for plan upgrade
- GetSubscriptionTool: get current subscription status and next billing date
- UpdatePlanTool: change subscription plan
- CancelSubscriptionTool: cancel at period end
- ListInvoicesTool: list recent invoices with status
- Resources: SubscriptionResource, InvoiceResource

**Stripe MCP (external — for AI agent billing operations):**
Configure external Stripe MCP server for development:
```json
{
  "mcpServers": {
    "stripe": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "STRIPE_SECRET_KEY", "mcp/stripe", "--api-key=sk_test_..."],
      "env": { "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}" }
    }
  }
}
```
The AI agent uses this to: create test products/prices, verify subscriptions, simulate webhook events.

**Acceptance Criteria:**
- [ ] Stripe products and prices created (starter, growth, enterprise)
- [ ] Stripe checkout flow works end-to-end
- [ ] PayFast checkout works
- [ ] Stripe webhook handles all events (checkout.completed, invoice.paid, etc.)
- [ ] Plan enforcement middleware works (over-limit users get 403)
- [ ] Billing portal returns user to workspace
- [ ] BillingServer with 5+ tools + 2 resources
- [ ] Stripe MCP configured for AI agent billing operations
- [ ] 6+ new tests
- [ ] All existing tests green

---

## GROUP GAMMA EXIT GATE

Before Group Gamma work is considered complete:

| Check | Criteria | Verified By |
|-------|----------|-------------|
| Billing complete | Stripe + PayFast + plan enforcement | 6+ new tests |
| Billing MCP | BillingServer with 5+ tools, Stripe MCP configured | MCP Inspector |
| Admin complete | All resources + billing mgmt + AI dashboard | 5+ new tests |
| Admin MCP | AdminServer with 4+ tools (local only) | MCP Inspector |
| CI/CD hardened | 8 stages, all green, GitHub MCP configured | CI pipeline run |
| Security hardened | RLS audit, rate limits, CORS, file upload, token expiry | 5+ new tests |
| Performance tested | k6 scripts, N+1 detection, SLO targets, PG MCP | 3+ new tests |
| PHPUnit green | 98+ tests, 0 failures | composer test |
| No regression | Existing 46 tests still pass | composer test |
