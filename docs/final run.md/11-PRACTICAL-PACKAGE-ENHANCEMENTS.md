# Practical Package Enhancements (No Bloat)

Date: 2026-05-30

## Selection rules

Add a package only if it:
- removes custom brittle code
- improves reliability or testability
- has active maintenance and clear license

## Web (npm) suggestions

1. Notification and reminders UX
- date-fns-tz for strict timezone-safe reminder UI behavior.
- usehooks-ts for battle-tested debounce/timeout hooks.

2. Collaboration UX
- react-virtuoso for large comment/chat thread virtualization.
- emoji-mart for predictable emoji/reaction picker.

3. Form and validation quality
- @hookform/resolvers + zod already present; enforce all critical forms through this stack.

4. Testing
- msw for robust API mocking in frontend tests.

## Realtime (npm) suggestions

1. Type and runtime safety
- undici (or node fetch baseline) for fetch consistency in Node runtime.
- @types/socket.io should be validated and pinned if needed by TS config behavior.

2. Reliability
- p-retry for bounded retry wrappers where needed.
- prom-client already present; expand metrics for chat/reminder fanout.

## API (PHP/composer) suggestions

1. Financial precision and templating
- keep brick/math for money-safe arithmetic.
- add a hardened templating helper layer rather than ad hoc variable interpolation.

2. Access control quality
- keep spatie/laravel-permission for role/permission operations.
- add policy test helpers to enforce authz coverage on high-risk routes.

## AI (Python) suggestions

1. Environment parity
- lock all test/runtime dependencies with pinned constraints.
- add dependency health checks in CI before test run.

2. Test reliability
- replace unsupported fakeredis eval paths with deterministic mocks where required.

## Do not add now

- Massive plugin frameworks.
- Full workflow engines that replace existing architecture.
- Heavy UI kit migration in middle of readiness closure.

## Installation discipline

- Add package in smallest scope possible.
- Add/adjust tests in same PR.
- Record reason and rollback in changelog.
