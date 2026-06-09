# Testing Strategy — Reference

Overview
- Layered testing: unit → integration → contract → end-to-end → property/fuzzing → chaos.
- CI gating: fast unit/linters on PR; full integration and contract tests on merge candidate.

Checklist
- Unit tests cover core logic with >90% deterministic assertions for critical modules.
- Integration tests run against disposable environments (containers or test clusters).
- Contract tests validate API compatibility with critical consumers.
- End-to-end tests exercise real flows with seeded test data.
- Property tests and fuzzing for parsers and input-handling code.
- Flaky-test detection: quarantine tests that fail non-deterministically and create an issue automatically.

CI Patterns
- Use matrix builds for language/runtime permutations when needed.
- Cache test dependencies and artifacts to speed up repeated runs.
- Parallelize large test suites with deterministic sharding.

Test Data & Fixtures
- Use factory fixtures and versioned test data bundles.
- Avoid copying large production data; use anonymized or synthetic datasets.

Example CI snippet (conceptual)
```yaml
steps:
  - run: install
  - run: unit-tests --shard ${{ matrix.shard }}
  - run: integration-tests --env test
  - run: contract-tests --target critical-consumers
  - run: e2e-tests --profile staging-like
```

Templates
- Unit test template, integration harness, contract-test stub, flaky-test issue template.

Automation scripts
- `scripts/run_all_tests.sh` (wraps deterministic ordering), `scripts/mark_flaky.sh` (quarantines unstable tests)

Quality gates
- PR must pass `unit + lint + security quick-scan` to allow merge request to run full pipeline.
- Only `main` branch runs full regression + performance suites nightly.

Metrics
- Track test pass-rate, flakiness rate, and CI duration.
- Alert if flakiness rises above threshold.
