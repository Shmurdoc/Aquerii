#!/bin/sh
cd /var/www/html
echo "=== Running pest LoginTest ==="
php -d memory_limit=384M vendor/bin/pest tests/Feature/Auth/LoginTest.php --no-coverage 2>&1
echo "=== EXIT_CODE=$? ==="
