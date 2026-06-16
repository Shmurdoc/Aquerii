# Backend Memory — Laravel/PHP

## Patterns
- Use Form Requests for validation
- Use Resources for API responses
- Use Services for business logic
- Use Events/Listeners for decoupling
- Use Policy classes for authorization

## Gotchas
- Eloquent lazy loading causes N+1 queries — always eager load
- PostgreSQL boolean casting: use `::boolean` in queries
- Carbon immutable by default in Laravel 11
- Use `DB::transaction()` for multi-model operations
- Rate limiting: use `RateLimiter` facade, not middleware

## Testing
- Pest PHP for unit/feature tests
- Use `RefreshDatabase` trait for database tests
- Mock external services with `Http::fake()`
- Use `actingAs()` for authentication in tests

- [2026-06-11] Gotcha: PostgreSQL boolean casting differs from MySQL

- [2026-06-11] always eager-load relationships to prevent lazy loading

- [2026-06-11] always use transactions for multi-model operations

- [2026-06-11] always use pagination for large datasets
