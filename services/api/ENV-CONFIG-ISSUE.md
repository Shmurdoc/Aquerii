# ENV-CONFIG-ISSUE — local dev environment regression

**Status:** Worked around. Local dev now uses `APP_ENV=production`.
**Created:** 2026-06-07. **Not committed.** Local follow-up note.

---

## TL;DR

Commit `5938e75` (`chore(dev): bind-mount API source for live reload; set APP_ENV=local default`)
did two things that interact badly on Docker Desktop for Windows:

1. **Added a bind mount** for `services/api` → `/var/www/html` for live reload.
2. **Set `APP_ENV: ${APP_ENV:-local}`** as the default in `docker-compose.yml`.

The E2E regression (95.9% → 16.3%) was blamed on (2), but the actual root cause was (1) +
the existing OPcache config, which makes every HTTP request stat thousands of source files
across the slow Windows ↔ Linux 9P bridge. The `APP_ENV=local` flip was just the most
visible diff — it did not itself break login.

We reverted `APP_ENV` to `production` and added an in-container OPcache tweak as a workaround.
The cause-of-cause (bind mount + default OPcache settings) is the real follow-up item.

---

## What actually broke E2E

When `APP_ENV=local` was set, requests still took 30–55 s end-to-end because:

- **OPcache default `validate_timestamps=1`** → PHP `stat()`s every included file on every
  request to check freshness. With ~13,000 vendor files on a bind mount, that's tens of
  thousands of slow stat calls per request.
- The Filament service provider alone took **~12 s to boot** under those conditions.
- The browser-side `fetch('/api/auth/login')` and the test's `waitForURL` (15 s) gave up
  long before the API responded → tests saw "still on /login" and reported login failure.
- The earlier-passing run almost certainly happened on a *warm* OPcache that hadn't been
  invalidated yet, or before the bind mount was wired up.

So changing `APP_ENV` from `production` → `local` was **incidental**, not causal. The
worker pool was being thrashed by FS stats either way; `APP_ENV=local` just turned on
`APP_DEBUG=true`, adding pretty traces and a bit more slowness on top of the existing
problem.

### Why `APP_ENV=local` *could* break login in principle

If anyone tries to genuinely run `APP_ENV=local` in future, expect at least these issues:

| Config              | `production` value         | `local` value usually needs                   |
| ------------------- | -------------------------- | --------------------------------------------- |
| `APP_DEBUG`         | `false`                    | `true` (acceptable locally)                   |
| `APP_URL`           | `https://localhost`        | likely `https://localhost` (unchanged)         |
| `SANCTUM_STATEFUL_DOMAINS` | default includes `localhost,localhost:3000,127.0.0.1` | usually fine, but check after env flip |
| `SESSION_DOMAIN`    | `.localhost` / null        | must match the cookie domain Caddy serves      |
| `SESSION_SECURE_COOKIE` | `true`                  | `true` (we serve over HTTPS even in dev)       |
| `SESSION_SAME_SITE` | `lax`                      | `lax` (cross-site `POST /login` still works)   |
| `MAIL_MAILER`       | smtp / mailpit             | `log` or `mailpit`                             |

So if `APP_ENV=local` is reintroduced, audit Sanctum + session settings first — those
are the most likely to silently break browser-driven auth.

---

## Decision

**Keep `APP_ENV=production` for local dev** for now. Reasons:

1. The current E2E suite, Playwright config, Caddy TLS, and seeders are all calibrated
   to that env. The team has the highest signal there.
2. Switching to `local` would require auditing Sanctum/session/Telescope/etc. configs
   to make sure the browser session still survives the Caddy hop — that's a half-day of
   work, not a config one-liner.
3. Live-reload was the original motivation for `5938e75`. The bind mount stays in
   `docker-compose.yml`; we just don't change `APP_ENV` with it.

---

## What was actually changed today (all local-only, none committed)

1. `services/api/.env`: `APP_ENV=production`, `APP_DEBUG=false`; added `SUPER_ADMIN_EMAIL` /
   `SUPER_ADMIN_PASSWORD` so `SuperAdminSeeder` does not hard-throw under
   `APP_ENV=production` (see note below).
2. Root `.env`: `APP_ENV=production`, `APP_DEBUG=false` (this is what `docker compose`
   actually reads; `services/api/.env` is *overridden* by the compose `environment:` block).
3. In-container OPcache tweak (will be lost on container rebuild — see follow-up):
   ```ini
   opcache.validate_timestamps=0
   opcache.memory_consumption=256
   opcache.max_accelerated_files=20000
   ```
   appended to `/usr/local/etc/php/conf.d/docker-php-ext-opcache.ini`.
4. Re-cached config + restarted php-fpm. After warm-up, first request ~40 s, subsequent
   requests ~0.7–4 s. Login E2E now passes 3/3 on the focused subset.

---

## Bug found along the way: stale plan assumption

The plan stated "Reseed (migrate:fresh --seed should still work because of the
SuperAdminSeeder fix from commit `a19f0cc` — production env still gets the warning+skip,
not the throw)." This is **wrong**. Reading `database/seeders/SuperAdminSeeder.php`
post-`a19f0cc`:

```php
if (! $email || ! $password) {
    if (app()->environment('production')) {
        throw new \RuntimeException('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in production. ...');
    }
    $this->command->warn('SuperAdminSeeder skipped: ... (non-production env).');
    return;
}
```

`a19f0cc` only added the warn+skip branch for **non-production**. Production still
throws. The seeder works today only because we added `SUPER_ADMIN_*` to
`services/api/.env`.

---

## Follow-up items (defer to a separate sprint)

### Priority 1 — Persistent OPcache fix on Docker Desktop / Windows
The in-container `opcache.validate_timestamps=0` change is the difference between
~40 s and ~1 s per request. It must be persisted to survive `docker compose up
--build`. Options, in order of cleanliness:

- **Best:** add a dedicated `services/api/docker/php/opcache.ini` and `COPY` it in
  the Dockerfile (or bind-mount it via `volumes:` in compose — the user instruction
  said *don't* edit compose, so prefer the Dockerfile approach in the follow-up).
- **Acceptable:** set `PHP_OPCACHE_VALIDATE_TIMESTAMPS=0` via env and have the
  entrypoint write the ini.
- **Acceptable:** drop the bind mount in favour of a named volume + `docker exec`
  for code sync (slower DX, but eliminates the FS-stat overhead).

Also bump `opcache.memory_consumption` to 256 MB and `opcache.max_accelerated_files`
to 20000. The current defaults (128 MB / 10000) are too small for this codebase
(~13k vendor files).

### Priority 2 — Make `SuperAdminSeeder` resilient
Either:

- Move `SUPER_ADMIN_*` into `docker-compose.yml` with safe-default test creds for
  local development (gated on `APP_ENV=local`), or
- Change the seeder to also warn-and-skip in `production` when seeding from a
  `php artisan db:seed --force` (vs. a real prod boot), or
- Ship a `tests/Database/E2EDevSeeder` alternative entrypoint that doesn't go via
  `DatabaseSeeder` at all.

The current behaviour traps anyone trying to run `migrate:fresh --seed` against a
"prod-shaped" local environment.

### Priority 3 — Audit `APP_ENV=local` config drift
If/when we want `APP_ENV=local` to be a viable local dev mode, audit the table in
the section above, plus:

- `config/sanctum.php`: stateful domains are read from `SANCTUM_STATEFUL_DOMAINS`
  with a sensible default. Re-verify in `local`.
- `config/session.php`: `domain`, `secure`, `same_site` must match Caddy's TLS
  cookie domain.
- Telescope: avoid enabling in browser-driven E2E unless we want the overhead.
- Horizon: dashboard auth gate may behave differently in `local`.

### Priority 4 — Slow Filament boot
Even with OPcache warm, `Filament\FilamentServiceProvider::boot()` takes ~12 s on
cold workers. It does a lot of resource auto-discovery. Worth investigating
`filament:cache-components` or moving Filament out of the API process (e.g.,
admin runs on its own container).

### Priority 5 — Duplicate route name `products.index`
`php artisan route:cache` fails with `Another route has already been assigned
name [products.index]`. This isn't blocking today (we don't cache routes), but
it's a latent bug that will bite the first time anyone tries route caching.

---

## How to re-test

```powershell
# After any reseed, re-cache config (env() in seeders/middleware sees stale values otherwise)
docker exec aquerii-api-1 php artisan config:cache
docker exec aquerii-api-1 sh -c "supervisorctl restart php-fpm"
# Warm OPcache by hitting the API 2-3x first
for ($i=1; $i -le 3; $i++) {
    docker exec aquerii-api-1 sh -c "curl -s -o /dev/null -w '%{time_total}s\n' http://127.0.0.1:8000/api/health"
}
# Now run E2E
cd services/web; npx playwright test --project=chromium --reporter=list
```
