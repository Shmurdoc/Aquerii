---
member_id: member-04
instructions_version: 3
updated_at: 2026-06-04T00:00:00Z
---

# Instructions

1. **READ `team/SYSTEM.md` FIRST** — understand the full coordination system
2. Follow testing standards in repo/CONTRIBUTING.md
3. Branch naming: `feature/member-04/<short-description>`
4. Commit prefix: `[member-04] description`
5. Run tests before marking done: all service tests green + Playwright critical paths + k6 smoke
6. If blocked, update `wait.md` and `status.md` immediately
7. Update `last_heartbeat` in `status.md` every 15 minutes while working
8. Own `services/tests/` and test configuration files
9. Write integration tests that validate contracts between services
10. Maintain CI pipeline test stages in `.github/workflows/ci.yml`
11. Use Pest PHP for backend, Vitest for frontend, Playwright for E2E, k6 for load
12. Report test coverage trends and regressions to Leader
13. Cannot mark `state: done` until all CI checks pass

## Tool Recommendations
- Load `/browse` skill for browser-based QA testing
- Load `/qa` skill for systematic test execution
- Load `/investigate` skill for debugging failures
- MCP servers: filesystem, github, playwright
- Before marking done: run `/browse` to verify critical paths visually
- When debugging: run `/investigate` for root cause analysis
