FROM php:8.3-fpm-alpine AS base

RUN apk add --no-cache postgresql-dev nodejs npm \
    && docker-php-ext-install pdo pdo_pgsql opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist

COPY . .

RUN php artisan filament:assets \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

FROM base AS production
RUN adduser -u 1001 -D appuser
USER appuser
EXPOSE 8001
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8001"]
