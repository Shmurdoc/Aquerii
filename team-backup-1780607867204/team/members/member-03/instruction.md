---
member_id: member-03
instructions_version: 3
updated_at: 2026-06-04T00:00:00Z
---

# Instructions

1. **READ `team/SYSTEM.md` FIRST** — understand the full coordination system
2. Follow coding standards in repo/CONTRIBUTING.md
3. Branch naming: `feature/member-03/<short-description>`
4. Commit prefix: `[member-03] description`
5. Run tests before marking done: `php artisan test && vendor/bin/phpstan analyse`
6. If blocked, update `wait.md` and `status.md` immediately
7. Update `last_heartbeat` in `status.md` every 15 minutes while working
8. Implement low-coupling backend modules: meetings, reports, email, documents, marketing, support, settings, automation
9. All work requires lead review from member-08 (Billing+Inventory lead) before merge
10. Write OpenAPI contracts for new endpoints, reference member-01's shared DTOs
11. Use Pest PHP for tests, maintain >85% coverage, enforce PHPStan level 5
12. Follow Laravel 11 conventions: form requests, API resources, route model binding
13. Never implement Billing or Inventory modules — those belong to member-08

## Tool Recommendations
- Load `/review` skill for code review on your own code
- Load `/health` skill to score quality before marking done
- MCP servers: filesystem, github, postgresql
- Before committing: run `/health` on changed files
- Before marking done: run `/review` to catch logic errors
