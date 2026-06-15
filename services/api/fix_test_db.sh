#!/bin/sh
# Rebuild the aquerii_test database schema from scratch.
#
# Prerequisite: the aquerii_test database must already exist in PostgreSQL.
# If it does not exist or needs to be recreated, run this from the HOST:
#
#   docker exec aquerii-postgres-1 psql -U aquerii_app -d postgres \
#     -c "SELECT pid, pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='aquerii_test' AND pid <> pg_backend_pid(); DROP DATABASE IF EXISTS aquerii_test; CREATE DATABASE aquerii_test OWNER aquerii_app;"
#
set -e
echo '==> Running migrations on aquerii_test...'
DB_DATABASE=aquerii_test php artisan migrate:fresh --force
echo '==> Done.  The test database schema is fresh.'
