FROM php:8.3-fpm-alpine AS base

# System deps
RUN apk add --no-cache \
    git curl unzip libpq-dev libzip-dev icu-dev \
    oniguruma-dev libxml2-dev linux-headers \
    supervisor nginx

# PHP extensions
RUN docker-php-ext-install \
    pdo pdo_pgsql pgsql \
    zip bcmath intl xml opcache \
    pcntl sockets

# Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# OpenTelemetry extension
RUN pecl install opentelemetry && docker-php-ext-enable opentelemetry

# Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --prefer-dist --no-dev

# ── Development image ─────────────────────────────────────────
FROM base AS development
COPY --from=deps /var/www/html/vendor ./vendor
COPY . .
RUN composer dump-autoload --optimize
RUN cp .env.example .env 2>/dev/null || true
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

# ── Production image ──────────────────────────────────────────
FROM base AS production
ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr

COPY --from=deps /var/www/html/vendor ./vendor
COPY . .
RUN composer dump-autoload --optimize --classmap-authoritative \
 && php artisan config:cache \
 && php artisan route:cache \
 && php artisan view:cache

COPY infra/docker/api/supervisord.conf /etc/supervisord.conf
COPY infra/docker/api/nginx.conf /etc/nginx/nginx.conf
COPY infra/docker/api/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf

EXPOSE 8000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
