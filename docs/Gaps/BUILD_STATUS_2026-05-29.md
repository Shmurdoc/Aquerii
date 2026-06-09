# Build Status - 2026-05-29

This file records objective build/test execution outcomes from this run.

## Workspace Build Matrix

- API (Laravel): FAILED
- Web (React/Vite): PASSED
- Realtime (Node/TS): FAILED
- AI (Python/FastAPI): FAILED

## Command Evidence

### Web
- Command: `cd services/web && npm run build`
- Exit: 0
- Result: Build completed successfully after fixing invalid Lucide import in command palette (`ChartNoAxesCombined` -> `BarChart3`).
- Notes: Bundle size warnings remain (large chunks), not a hard compile failure.

### Realtime
- Command: `cd services/realtime && npm run build`
- Exit: 1
- Result: TypeScript compile failure (23 errors).
- High-impact failures:
	- Missing global APIs/types in current TS config (`fetch`, `AbortSignal`, `setTimeout`, `clearTimeout`, `NodeJS.Timeout`).
	- Socket.IO type resolution failures across multiple files.
	- Implicit `any` errors in connection handlers.

### API
- Command: `cd services/api && composer test -- tests/Feature/Security/ScimAndFieldPermissionsTest.php tests/Feature/Security/ReadinessControlPlaneTest.php tests/Feature/Security/RealWorldReadinessTest.php tests/Unit/Scenario/ScenarioSimulationTest.php`
- Exit: 255
- Result: Runtime bootstrap failure before tests executed.
- High-impact failure:
	- Missing file in vendor tree: `vendor/filament/support/src/helpers.php`.
	- Autoloader fatal in `vendor/composer/autoload_real.php`.

### AI
- Command: `cd services/ai && python -m pytest -q` (venv path used when available)
- Exit: 1
- Result: Test suite executed but failed heavily (28 failed, 25 errors, 51 passed).
- High-impact failures:
	- Missing dependencies at runtime (`pydantic_settings`, `chromadb`).
	- `fakeredis` path does not support `eval` in current test context.
	- Router/provider module import mismatch (`app.routers.ai_routes`, `app.core.providers`).

## Blocking Issues

1. API dependency tree is corrupted/incomplete (`filament/support` helper missing), which blocks all Laravel readiness tests.
2. Realtime TypeScript config and typing setup are not build-safe under current strict compile settings.
3. AI test environment is missing required packages and has module-structure mismatches that break core test targets.
4. Docker service state command did not return usable service table output in this session, reducing confidence in container parity.

## P0-01 Truth

P0-01 is not closed. Build/test reproducibility is currently broken across API, Realtime, and AI. Only Web build is green.

## Immediate Remediation Order

1. Repair API vendor integrity and extension/runtime parity, then rerun targeted readiness tests.
2. Fix Realtime TS environment/type baseline until `npm run build` is green.
3. Install/lock AI test dependencies and resolve module import contract drift.
4. Re-run full matrix and update this file with the new evidence.
