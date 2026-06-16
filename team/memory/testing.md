# Testing Memory — Pest/Playwright

## Patterns
- Test金字塔: many unit tests, fewer integration tests, minimal E2E tests
- Use `it()` blocks for readable test descriptions
- Group related tests with `describe()`
- Use `beforeEach()` for setup, `afterEach()` for cleanup

## Gotchas
- Playwright tests can be flaky due to timing — use `waitFor()` not `sleep()`
- Pest PHP `RefreshDatabase` runs a transaction per test
- k6 load tests need realistic data distributions
- E2E tests should test user flows, not implementation details

## Coverage
- Backend: aim for 80% line coverage
- Frontend: aim for 70% line coverage
- Critical paths: 100% coverage required
- Use coverage reports to find untested code, not as a goal
