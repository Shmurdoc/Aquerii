# Pilot Mine Workspace — Setup Guide

## Prerequisites

- Docker Desktop (or compatible Docker runtime)
- Git
- Node.js 18+ (for the wrapper script)

## 1. Environment Configuration

### API `.env` settings

The root `.env` at the project root is used by `docker compose`. Verify these settings:

```bash
# Ensure mail goes to log (not real SMTP) to avoid sending emails during setup
MAIL_MAILER=log

# Database credentials (defaults work for Docker)
DB_HOST=postgres
DB_DATABASE=aquerii
DB_USERNAME=aquerii_app
DB_PASSWORD=secret_app_password

# App URL for local development
APP_URL=http://localhost
APP_ENV=local
APP_DEBUG=true
```

> **Note:** The API's `.env` at `services/api/.env` is only used when running Laravel
> outside Docker. When using Docker, the root `.env` and `docker-compose.yml` environment
> variables take precedence.

## 2. Start the Stack

```bash
# From project root
docker compose up -d

# Wait for services to be healthy (especially postgres and api)
docker compose ps
```

Verify the API is responding:
```bash
curl http://localhost/api/health
# Expected: {"status":"ok"}
```

## 3. Run Migrations

```bash
docker compose exec -T api php artisan migrate --force
```

## 4. Provision Pilot Workspace

### Option A: Node.js wrapper script

```bash
node team/scripts/provision-pilot.mjs
```

Custom options:
```bash
# Custom workspace name and slug
node team/scripts/provision-pilot.mjs --workspace-name="Sishen Mine" --slug=sishen-mine

# Custom default password
node team/scripts/provision-pilot.mjs --password=pilot2024
```

### Option B: Direct artisan command

```bash
docker compose exec -T api php artisan provision:pilot
```

With options:
```bash
docker compose exec -T api php artisan provision:pilot \
  --workspace-name="Pilot Mine Workspace" \
  --slug=pilot-mine \
  --password=password
```

### Option C: Reset and re-run

If you need to reset the workspace:
```bash
# Drop and recreate the database
docker compose exec -T postgres psql -U aquerii_app -d aquerii -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-run migrations and provision
docker compose exec -T api php artisan migrate --force
docker compose exec -T api php artisan provision:pilot
```

## 5. Default Credentials

| Name | Email | Password | Role |
|------|-------|----------|------|
| Thabo Mbeki | thabo-mbeki@pilot.example.com | password | Owner |
| Lindiwe Sisulu | lindiwe-sisulu@pilot.example.com | password | Admin |
| Sipho Nkosi | sipho-nkosi@pilot.example.com | password | Admin |
| Johan Botha | johan-botha@pilot.example.com | password | Member |
| David Mokoena | david-mokoena@pilot.example.com | password | Member |
| Nosipho Dlamini | nosipho-dlamini@pilot.example.com | password | Admin |
| Fatima Patel | fatima-patel@pilot.example.com | password | Member |
| Grace Moloi | grace-moloi@pilot.example.com | password | Viewer |
| Peter van Wyk | peter-van-wyk@pilot.example.com | password | Member |
| Bongani Zuma | bongani-zuma@pilot.example.com | password | Member |

All users have `email_verified_at` set so email verification is bypassed.

## 6. Access URLs

| Service | URL |
|---------|-----|
| Web App (SPA) | http://localhost |
| API Health | http://localhost/api/health |
| API Base | http://localhost/api |
| Postgres (direct) | localhost:5432 |
| Redis | localhost:6379 |
| Meilisearch | http://localhost:7700 |
| Minio Console | http://localhost:9001 |

## 7. Seeded Data Summary

| Entity | Count |
|--------|-------|
| Workspace | 1 |
| Users | 10 |
| Workspace Members | 10 |
| HSSE Hazards | 8 |
| HSSE Incidents | 4 |
| Corrective Actions | 3 |
| CRM Deals | 8 |
| CRM Leads | 6 |
| CRM Contacts | 8 |
| CRM Companies | 8 |
| CRM Product Categories | 5 |
| Inventory Products | 10 |
| PTW Permits | 5 |
| Support Tickets | 5 |
| Board Items | 5 |

## 8. Troubleshooting

### "Class 'App\Console\Commands\ProvisionPilot' not found"

Ensure the command is registered. In Laravel 11 commands are auto-discovered
from `app/Console/Commands/`. Run:

```bash
docker compose exec -T api php artisan list
# Verify "provision:pilot" appears in the list
```

If not, run:

```bash
docker compose exec -T api composer dump-autoload --optimize
```

### "Password hash" errors

The `User` model uses `password_hash` column (not `password`). This is handled
correctly in the command.

### Mail being sent during setup

Ensure `MAIL_MAILER=log` in `.env` to silently discard all emails.

### Port conflicts

If ports 80/443 are in use, modify `docker-compose.yml` to map alternative ports:
```yaml
ports:
  - "8080:80"   # instead of 80:80
  - "8443:443"  # instead of 443:443
```

Then access the web app at `http://localhost:8080`.
