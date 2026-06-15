# Changelog

All notable changes to Aquerii are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-06-15 — Pre-Pilot Release

### Added

#### Phase 0 — Unblock (12 items)
- Runtime crash fixes: `ItemController::storeSubitem()`, `addAssignee()`, `removeAssignee()` implemented
- `WorkspaceController::store()` implemented (onboarding flow)
- `OAuthController` model reference casing fixed (Linux compatibility)
- `config/services.php`: stripe, payfast, ai, realtime service blocks added
- AIController config key inconsistency resolved (standardised to `services.ai.url` + `secret`)
- `@hookform/resolvers` added to frontend dependencies
- React Query v4→v5 syntax migration in Settings tabs (BillingTab, TeamTab, SecurityTab)
- API Docker support files created (supervisord.conf, nginx.conf, php-fpm.conf)
- Realtime `/health` endpoint implemented (Docker healthcheck fix)
- Caddy port mismatches fixed (realtime 3000→3001, AI 8080→8002)
- `services/api/.env.example` created
- `services/web/.env.example` created

#### Phase 1 — Core Wiring (10 items)
- `show()` methods added to 4 controllers (BoardColumn, BoardGroup, Automation, Company)
- `EvaluateAutomationTriggers` job implemented with real action execution
- `App\Mail\BillingConfirmation` mailable created and wired
- CommandPalette search result navigation implemented
- Registration → onboarding flow fixed
- Workspace invite-by-email flow (invitations table, mail, accept route)
- CORS locked down to `FRONTEND_URL`
- `DealController::move()` and `::score()` route wiring
- `StageController::reorder()` route wiring
- Rate limiting on authenticated routes (60/min) and AI endpoints (10/min)

#### Phase 2 — UI Completeness (10 items)
- Delete Board UI (context menu, confirmation dialog)
- Delete Item UI (ItemDetailModal footer)
- Group Management UI (create, rename, delete groups)
- CRM Deal Detail Modal (edit, stage, delete)
- CRM Contacts & Companies tabs (full CRUD)
- Document Title Inline Editing
- User Profile Editing (name, avatar via `PUT /me`)
- Sidebar workspace switcher
- Notification preferences backend + UI (persisted across sessions)
- Presence indicators (online user avatar stack)

#### Phase 3 — Infrastructure & Security (13 items)
- K8s Deployment and Service manifests (api, web, realtime)
- Super-admin service resolved (absorbed into Admin module)
- `SUPER_ADMIN_APP_KEY` placeholder removed
- Alertmanager wired with routing config
- Prometheus exporters for Postgres, Redis, Node
- `SimpleSpanProcessor` → `BatchSpanProcessor` in realtime OTel
- Jaeger/OTel trace export fixed
- TTL on `room_members` Redis keys (24h)
- Presence heartbeat wired (30s interval)
- Dead realtime code deleted (broadcaster, documentHandlers, JWT auth)
- Zod validation on socket event payloads
- `docker-compose.override.yml` created (dev tools separation)
- CORS origins for realtime service configurable via env

#### Phase 4 — Clean-up & Polish (8 items)
- Dead-code stores and packages removed (`boardStore`, `itemStore`, `documentStore`, `MutationQueue`, `idb`, `immer`)
- Empty `CRMControllers.php` deleted
- `useDocuments.ts` URL corrected (workspace-scoped)
- `trivy-action` pinned to specific version
- Duplicate CI file removed
- `useUpdateItem` hook usage in `ItemDetailModal`
- `DocumentFolder` model resolved (routes added or removed)
- User profile refresh on app load (`GET /me` on mount)

#### Pilot Readiness
- PILOT-STRATEGY.md created (12-week pilot plan, 10 success scenarios, personas)
- PILOT-SETUP.md created (workspace provisioning, Docker compose, seeded data)
- PILOT-AGREEMENT.md created (legal boilerplate)
- PILOT-DEPLOYMENT.md created (deployment sequence, rollback, monitoring, milestones)
- RELEASE-CHECKLIST.md created (go/no-go criteria, security, data integrity, monitoring)
- VERSION set to 0.1.0

---

## [Unreleased] — Planned

- Phase 2 remaining UI polish (editable documents, calendar view)
- Phase 3 remaining infra (SCIM, Vault integration, Helm charts)
- E2E test suite with Playwright
- Post-pilot conversion features (paid plans, tenant billing)

<!-- Version comparison links -->
[Unreleased]: https://github.com/anomalyco/Aquerii/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/anomalyco/Aquerii/releases/tag/v0.1.0
