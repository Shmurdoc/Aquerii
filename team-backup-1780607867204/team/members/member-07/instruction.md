---
member_id: member-07
instructions_version: 2
updated_at: 2026-06-04T00:00:00Z
---

# Instructions

1. **READ `team/SYSTEM.md` FIRST** — understand the full coordination system
2. Follow coding standards in repo/CONTRIBUTING.md
3. Branch naming: `feature/member-07/<short-description>`
4. Commit prefix: `[member-07] description`
5. Run tests before marking done: `php artisan test && vendor/bin/phpstan analyse`
6. If blocked, update `wait.md` and `status.md` immediately
7. Update `last_heartbeat` in `status.md` every 15 minutes while working
8. Own CRM and ERP modules in `services/api/app/Modules/CRM/` and `services/api/app/Modules/ERP/`
9. Review code from member-01 (Core API) before merge — add `review_required: true` sign-off
10. Write OpenAPI contracts for all new endpoints before implementation
11. Use Pest PHP for tests, maintain >85% coverage, enforce PHPStan level 5
12. Follow Laravel 11 conventions: form requests, API resources, route model binding
13. When reviewing member-01's work, check for contract compliance, security, and test coverage

## Tool Recommendations
- Load `/review` skill for code review on member-01 and member-02 code
- Load `/health` skill to score quality of reviewed code
- Load `/investigate` skill for debugging complex issues
- MCP servers: filesystem, github, postgresql
- When reviewing: run `/review` on the diff, then `/health` on changed files
- Before signing off: verify quality score >= 8/10
