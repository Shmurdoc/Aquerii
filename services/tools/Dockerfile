# syntax=docker/dockerfile:1
#
# On-demand Node.js dev tools service for Aquerii.
# Pre-installs `pg` so team/scripts/*.mjs run without a cold-install each time.
#
# Build context is the `team/` directory (see docker-compose.yml `build.context`).
# This image is built automatically on first
#   docker compose run --rm tools <script> [args]
#
# Default command just runs the cleanup dry-run; `docker compose run`
# will override it with whatever you pass on the command line.
FROM node:22-alpine

WORKDIR /app

# Install only the runtime dependency our scripts need.
# Copy manifest first so this layer caches across script edits.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
 && apk add --no-cache tini \
 && rm -rf /root/.npm

COPY scripts/ ./scripts/

# tini gives proper signal handling (SIGTERM → graceful exit)
# when `docker compose run --rm` stops the container.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "scripts/cleanup-test-data.mjs", "--dry-run"]
