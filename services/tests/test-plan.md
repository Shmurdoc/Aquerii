# E2E Test Plan — Aquerii

## Prerequisites

To unskip and run the Playwright E2E smoke tests, two root causes must be resolved (see `docs/debt/PHASE_0_1_E2E_DEBT.md`):

1. **SPA unauthenticated-redirect guard** — Add a `<ProtectedRoute>` wrapper in `App.tsx` that checks for an auth token and redirects to `/login` when missing.
2. **E2ESeeder env wiring** — The CI E2E job must set `APP_ENV=testing` (or explicitly call `--class=E2ESeeder`) so the test user `test@example.com` / `password123` exists.

## Test Structure

Tests are in `services/web/tests/e2e/` (Playwright testDir):

| File | Journey | Tests |
|------|---------|-------|
| `auth.spec.ts` | Registration → Onboarding → Workspace | 9 |
| `boards.spec.ts` | Board → Group → Item → Assign | 8 |
| `crm.spec.ts` | Pipeline → Contacts → Deals | 6 |
| `documents.spec.ts` | Document → Content Edit | 6 |
| `app.spec.ts` | Legacy suite (to be migrated) | 13 |

## Page Objects (`services/web/tests/e2e/pages/`)

| Page Object | Selectors |
|-------------|-----------|
| `LoginPage` | email, password, submit, MFA, register link |
| `BoardsPage` | heading, new board button, board cards |
| `BoardPage` | view toggles (kanban/table/calendar), add item |
| `CRMPage` | deal cards, add deal button, stage headers |
| `DocumentsPage` | notes/files tabs, new note button |
| `DocumentPage` | title, contenteditable editor |
| `NavigationPage` | sidebar links (Boards/Documents/CRM/Settings) |

## CI Integration

The E2E job at Stage 6 in `.github/workflows/ci.yml`:
1. Starts API server with migrations + E2ESeeder seed data
2. Installs Node deps + Playwright Chromium
3. Runs `npx playwright test --project=chromium`
4. Tests run against `http://localhost:8000` (Laravel serve)
5. Job depends on `docker-build` stage

When unblocked, the CI job will execute 29+ Playwright tests across 4 spec files.

## API Feature Tests (Pest)

New Phase 4 test files under `services/api/tests/Feature/`:

| File | Coverage | Tests |
|------|----------|-------|
| `WorkspaceInvitationControllerTest.php` | POST/GET/DELETE invitations, accept/reject flows | 9 |
| `BoardGroupControllerTest.php` | CRUD groups, reorder positions | 8 |
| `BoardColumnControllerTest.php` | CRUD columns, reorder positions, type validation | 8 |
| `CrmContactControllerTest.php` | CRUD contacts, search by name/email, workspace isolation | 8 |
| `CrmCompanyControllerTest.php` | CRUD companies, workspace isolation | 6 |
| `CrmDealControllerTest.php` | CRUD deals, move between stages, AI scoring | 9 |
| `ProductControllerTest.php` | CRUD products, stock in/out adjustments, low stock threshold | 10 |
| `DocumentFolderControllerTest.php` | CRUD folders, nested hierarchy, tree retrieval, 404 handling | 9 |

**Patterns observed from existing tests:**
- Uses `Pest` with `test()`/`it()` functions (not PHPUnit `@test` annotations)
- `beforeEach()` creates a user, workspace, workspace member, and authenticates via `Sanctum::actingAs()`
- Routes are workspace-scoped at `/api/workspaces/{workspace}/...`
- Requests use `postJson()`, `getJson()`, `patchJson()`, `deleteJson()` with `['Idempotency-Key' => Str::uuid()->toString()]`
- Responses asserted with `assertStatus()`, `assertJsonPath()`, `assertJsonCount()`, `assertJsonFragment()`
- CRM tests define Gate policies in `beforeEach()` and use module models (e.g. `App\Modules\CRM\Models\CrmContact`)
- Board tests use `App\Core\Models\Board` and raw `DB::table()` for child entities
- `uses(TestCase::class)` is inherited from `Pest.php` setup (includes `RefreshDatabase`)

## Running Locally

```bash
cd services/web
npx playwright install chromium
npm run test:e2e
```

## Gaps & Future Work

| Priority | Gap | Target |
|----------|-----|--------|
| High | OAuth login flow (Google/GitHub) | Post-Phase 0.1 |
| High | WebSocket/presence connection test | Post-Phase 0.1 |
| High | AI prompt end-to-end integration | Post-Phase 0.1 |
| Medium | Drag-and-drop deal stage change | Post-Phase 0.1 |
| Medium | File upload flow | Post-Phase 0.1 |
| Medium | k6 performance thresholds (non-error) | Post-Phase 0.1 |
| Low | CommandPalette / keyboard shortcut | Post-Phase 0.1 |
| Low | Responsive viewport tests | Post-Phase 0.1 |
| Low | Whiteboard view | Post-Phase 0.1 |
