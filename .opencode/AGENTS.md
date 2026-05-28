# Aquerii Agent Guidelines

## Skills Directory

Skills are loaded from `.opencode/skills/` — organized by phase.

### Boot Skills (Always Loaded)
- `context-engineering/` — Context management, compression, token budgeting
- `gstack/` — Multi-agent orchestration (`/ship`, `/review`, `/guard`)
- `code-review/` — Code quality gates
- `awesome-claude-code/` — Claude Code best practices
- `awesome-vibecoding/` — Vibecoding patterns

### Phase-Specific Skills
- `architecture/` — System design, ADR creation
- `advanced-skills/` — Complex implementations
- `dev-experience/` — Developer experience
- `context-engineering/` — RAG, semantic search
- `ci-cd/` — CI/CD pipelines

### Skill Loading Protocol
Per PROJECT_MADOC_ELITE_AI_CODING_CREW.md:
- Load boot skills at start of session
- Load phase-specific skills when entering that phase
- Unload previous phase skills to conserve tokens

---

## MCP Servers

| MCP | Purpose | Status |
|-----|---------|--------|
| **filesystem** | Aquerii + Devine Brain file access | ✅ Active |
| **github** | Repo operations | ✅ Active |
| **postgresql** | Aquerii database (aquerii_test) | ✅ Active |
| **mysql** | InvenTree sidecar DB | ✅ Active |
| **graphify** | Knowledge graph mapping | ✅ Active |
| **ruflo** | Python linting | ✅ Active |
| **playwright** | E2E testing | ✅ Active |
| **fetch** | Web research | ✅ Active |

---

## SDLC Pipeline (8-Phase)

Follows PROJECT_MADOC_ELITE_AI_CODING_CREW.md:

1. **Discovery/Research** → G1: Research Brief approved
2. **Requirements** → G2: PRD + acceptance criteria
3. **Architecture** → G3: ADRs + threat model
4. **Development** → G4: Lint + typecheck + unit tests
5. **QA** → G5: Integration + E2E + performance
6. **Security** → G6: SAST + DAST + SCA + secrets
7. **Deployment** → G7: Blue/green verified
8. **Operations** → Monitoring + MTTR < 30min

---

## Quality Gates (7 Gates)

| Gate | Tool | Pass Criteria |
|------|------|---------------|
| G1 | Ruflo/ESLint | Zero errors, zero warnings |
| G2 | TypeScript/mypy | Zero type errors |
| G3 | Jest/Pytest | >85% coverage |
| G4 | Supertest | API contracts verified |
| G5 | Playwright | Critical journeys pass |
| G6 | Semgrep/Trivy | Zero critical/high CVEs |
| G7 | Lighthouse/k6 | Budgets met, WCAG 2.1 AA |

---

## Aquerii Context

- **Workspace**: `C:\Users\madoc\source\repos\Aquerii`
- **API**: Laravel 11 + PostgreSQL (with RLS) + Redis + MinIO
- **Services**: 18 Docker services (all running — caddy, api, horizon, realtime, ai, postgres, redis, meilisearch, minio, chromadb, clickhouse, mailpit, prometheus, grafana, loki, otel-collector, vault, web)
- **Tests**: 108 frontend (Vitest, 19 test files) | 12 backend (Pest PHPUnit)
- **Sidecars**: InvenTree, paperless-ngx (standalone services, not yet absorbed)
- **Progress**: Phase 4+ complete — CRM (pipelines, contacts, deals, companies, quotas, quotes, products), AI copilot (chat, streaming, credits), ERP (billing, PayFast, invoices, POs, SOs), Automation (rule builder, triggers), Meetings, Reports, Email, Documents, Marketing, Support Desk, Settings, UI component library, CSS variable theming

### Phase 1: Module Architecture

**Core -> Modules split**: `bootstrap/providers.php` registers `ModuleServiceProvider` which conditionally loads module providers based on `.env` flags (`MODULE_CRM`, `MODULE_AUTOMATION`, `MODULE_DOCUMENTS`, `MODULE_AI`, `MODULE_BILLING`, `MODULE_INVENTORY`, `MODULE_PAPERLESS`).

Each module has its own `Providers/*ServiceProvider.php` that registers:
- Module routes from `routes/modules/{module}.php` (loaded under `api` middleware)
- Module policies, observers, and model bindings
- Set `MODULE_*=false` in `.env` to disable a module (routes + policies + observers removed)

**Key files**:
- `app/Core/Providers/ModuleServiceProvider.php` — orchestrator
- `app/Modules/*/Providers/*ServiceProvider.php` — per-module providers
- `routes/modules/*.php` — extracted module route files
- `routes/api.php` — Core routes only (no module imports)
- `routes/web.php` — Core web routes only
- `app/Core/Providers/AppServiceProvider.php` — no module references
- `app/Core/Providers/AuthServiceProvider.php` — Core policies only
- `composer.json` — PSR-4: `App\` -> `app/` (for Laravel namespace detection)

### Phase 2: Admin Module (formerly super-admin service)

**Merge complete**: The standalone `services/super-admin/` service (22 files) was absorbed into `app/Modules/Admin/`. The separate Docker image is now dead — the admin panel runs inside the main API container.

**What moved**:
- `app/Core/Filament/` (dormant admin panel) → `app/Modules/Admin/Filament/` — contains WorkspaceResource, UserResource, FeatureFlagResource (Eloquent-backed, full CRUD)
- `services/super-admin/app/Models/SuperAdmin.php` → `app/Modules/Admin/Models/SuperAdmin.php`
- `services/super-admin/app/Filament/Resources/AuditLogResource*` → `app/Modules/Admin/Filament/Resources/AuditLogResource*` (read-only audit log)
- `services/super-admin/app/Providers/Filament/AdminPanelProvider.php` → merged into `app/Modules/Admin/Providers/Filament/AdminPanelProvider.php`

**Config changes**:
- `config/database.php` — added `superadmin` connection (`superadmin` PostgreSQL schema)
- `config/auth.php` — added `super_admins` guard + provider pointing to `SuperAdmin::class`
- `ModuleServiceProvider` — added `MODULE_ADMIN` toggle
- Admin panel uses `->authGuard('super_admins')` — super admins authenticate via separate model/table

**Deleted**: `app/Core/Filament/` (13 files), `services/super-admin/` (22 files — keep directory for reference until verified)

---

## Loopback Protocol

If any gate fails:
1. Inject structured JSON with location, severity, fix_hint
2. Query Context7 for similar fixes
3. Retry up to 3 times
4. If still failing → escalate to human

---

*This file loads with every session. Updates from PROJECT_MADOC_ELITE_AI_CODING_CREW.md*