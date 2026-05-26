#!/bin/sh
set -e

# Ensure .env exists (may be absent when env vars are injected via Docker; prevents PHP Dotenv warning)
touch /var/www/html/.env

# Run artisan cache commands at startup when APP_KEY is available
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations automatically in non-production or when AUTORUN_MIGRATIONS=true
if [ "${AUTORUN_MIGRATIONS:-false}" = "true" ]; then
    php artisan migrate --force --no-interaction
fi

exec "$@"
