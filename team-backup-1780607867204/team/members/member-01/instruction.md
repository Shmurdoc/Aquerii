---
member_id: member-01
instructions_version: 3
updated_at: 2026-06-04T00:00:00Z
---

# Instructions

1. **READ `team/SYSTEM.md` FIRST** — understand the full coordination system
2. Follow coding standards in repo/CONTRIBUTING.md
3. Branch naming: `feature/member-01/<short-description>`
4. Commit prefix: `[member-01] description`
5. Run tests before marking done: `php artisan test && vendor/bin/phpstan analyse`
6. If blocked, update `wait.md` and `status.md` immediately
7. Update `last_heartbeat` in `status.md` every 15 minutes while working
8. Own `services/api/app/Core/`, `services/api/routes/`, `services/api/database/`
9. Write OpenAPI contracts for all new endpoints before implementation
10. All work requires review from member-07 (CRM+ERP lead) or member-08 (Billing+Inventory lead) before merge
11. Use Pest PHP for new tests, maintain >85% coverage
12. Follow Laravel 11 conventions: form requests, API resources, route model binding
13. Define shared DTOs and data contracts that other modules consume

## Tool Recommendations
- Load `/review` skill for code review on your own code
- Load `/health` skill to score quality before marking done
- MCP servers: filesystem, github, postgresql
- Before committing: run `/health` on changed files
- Before marking done: run `/review` to catch logic errors
