# Coverage Baseline

Generated: 2026-06-05
Ticket: GAP-COV-001

## Service Coverage

| Service | Lines | Branches | Functions | Notes |
|---------|-------|----------|-----------|-------|
| API (PHP) | N/A | N/A | N/A | Requires xdebug/pcov extension locally. CI configured with pcov via shivammathur/setup-php. |
| Web (TypeScript) | 4.01% | 16.14% | 2.89% | 19 test files (4 pass, 15 fail with pre-existing failures). Coverage via @vitest/coverage-v8. |
| AI (Python) | 5% | — | — | 79 tests (51 pass, 23 fail, 25 error with pre-existing failures). Coverage via pytest-cov. |

## Configuration

- **API**: `services/api/phpunit.xml` — `<source>` includes `app/` directory. Coverage output: clover, html, text. CI uses pcov.
- **Web**: `services/web/vite.config.ts` — `test.coverage` block with v8 provider. Reporters: text, html, lcov. Coverage includes `src/**/*.{ts,tsx}`.
- **AI**: `services/ai/pytest.ini` — coverage via `--cov` flag. `pytest-cov` added to `requirements-dev.txt`. CI uses `--cov=app --cov-report=xml`.

## CI Integration

- **API** (`ci.yml` test-php job): Already has `--coverage-clover coverage.xml` with pcov, uploads to Codecov.
- **Web** (`ci.yml` test-web job): Added `--coverage` flag and Codecov upload step.
- **AI** (`ci.yml` test-python job): Already has `--cov=app --cov-report=xml -v`.

## Local Prerequisites

- **PHP**: Install xdebug (VS17) or pcov extension matching your PHP build (VS16 for herd-lite users).
- **Web**: `npm install` includes `@vitest/coverage-v8@^1.6.0`.
- **AI**: `pip install -r requirements-dev.txt` includes `pytest-cov`.

## Next Steps

- Improve coverage percentages across all services.
- Fix pre-existing test failures (14 web test files fail due to missing @testing-library/dom; 23 AI tests fail due to missing pydantic_settings).
