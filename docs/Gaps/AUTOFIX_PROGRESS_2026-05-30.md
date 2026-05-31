# Auto-Fix Progress - 2026-05-30

## Scope
This pass focused on high-risk correctness gaps that could be fixed immediately without redesigning the whole platform.

## Fixed In This Pass

### 1) OAuth schema/model drift and Linux autoload risk
- Unified active API OAuth usage to `OAuthAccount` (correct PSR-4 casing).
- Updated model fields to match active migrations/runtime usage:
  - `provider_id` (not `provider_user_id`)
  - `expires_at` (not `token_expires_at`)
- Added resilient token decryption helper supporting:
  - `Crypt::encryptString` format
  - legacy `encrypt()` format
  - legacy plaintext fallback

Files:
- `services/api/app/Core/Models/OAuthAccount.php`
- `services/api/app/Core/Http/Controllers/Auth/OAuthController.php`
- `services/api/app/Core/Models/User.php`

### 2) Calendar provider token handling reliability
- Calendar sync now uses decrypted provider tokens rather than raw DB values.
- Added fail-fast behavior when token is unavailable.

Files:
- `services/api/app/Modules/CRM/Services/CalendarSyncService.php`

### 3) OAuth provider support alignment
- Added `microsoft` to allowed OAuth providers in the active Core OAuth controller.

File:
- `services/api/app/Core/Http/Controllers/Auth/OAuthController.php`

### 4) CI quality gate hardening
- Removed test masking patterns that swallowed failures.
- Removed non-blocking flags for secrets scan, e2e, perf, and lighthouse jobs in this workflow.

File:
- `.github/workflows/ci.yml`

## Validated
- PHP syntax check passes on all modified API files.
- Editor diagnostics are clean for modified OAuth controller.
- CI workflow no longer contains:
  - `continue-on-error: true`
  - failure-swallow test commands (`|| echo ...`)

## Still Open (Not solvable in a single patch pass)
- Full P0/P1/P2 capability delivery from `Gaps/SYSTEM_GAPS_EXECUTION_BOARD.md`.
- End-to-end build matrix proof (API, Realtime, AI) in stable CI/local parity.
- Accounting SoR depth (period locks, close controls, reconciled statements).
- Cross-module template governance and versioning across all domains.
- Universal permission contract tests across all high-risk endpoints.
- Connector conformance hardening and replay conformance for all providers.

## Next Execution Wave (Recommended)
1. Repair and green the runtime matrix (API/Realtime/AI) with strict pass gates.
2. Deliver finance lock semantics + accounting reconciliation tests.
3. Expand template governance to invoices/quotes/docs/support/reports.
4. Add endpoint-level permission contract suite and fail release on regressions.
5. Add provider conformance tests for Google/Microsoft/Stripe webhooks and replay.
