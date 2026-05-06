#!/bin/bash
# 00_render_roles.sh
# Renders 00_roles.sql by substituting environment variable placeholders
# and executes the result via psql.
#
# Required environment variables:
#   AQUERII_APP_PASSWORD         — password for the aquerii_app role
#   AQUERII_SUPERADMIN_PASSWORD  — password for the aquerii_superadmin role
#
# This script is placed in /docker-entrypoint-initdb.d/ and runs automatically
# during PostgreSQL container first-init (before 01_schema.sql etc.).

set -euo pipefail

: "${AQUERII_APP_PASSWORD:?AQUERII_APP_PASSWORD environment variable is required}"
: "${AQUERII_SUPERADMIN_PASSWORD:?AQUERII_SUPERADMIN_PASSWORD environment variable is required}"

SQL_TEMPLATE="$(dirname "$0")/00_roles.sql"

# Render the template — replace placeholders with actual passwords
RENDERED=$(sed \
  -e "s/__APP_PASSWORD__/${AQUERII_APP_PASSWORD}/g" \
  -e "s/__SUPERADMIN_PASSWORD__/${AQUERII_SUPERADMIN_PASSWORD}/g" \
  "$SQL_TEMPLATE")

echo "Executing rendered 00_roles.sql..."
echo "$RENDERED" | psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"
echo "Roles created successfully."
