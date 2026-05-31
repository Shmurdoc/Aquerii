# INFRASTRUCTURE AS CODE — Docker Compose Templates & Deployment Specs

**Version**: 2.0  
**Status**: AUTHORITATIVE  
**Owner**: Team Alpha (DevOps)  
**Location**: All Docker Compose files go in `E:\Mine System\docker\`

---

## 1. Core Infrastructure (`docker-compose.core.yml`)

```yaml
# docker/docker-compose.core.yml
# Start this FIRST — all other services depend on these

version: '3.8'

services:
  # ─── PostgreSQL per service ───────────────────────────────────────────
  postgres-gateway:
    image: postgres:15.6-alpine
    container_name: mine-postgres-gateway
    restart: unless-stopped
    environment:
      POSTGRES_DB: gateway_db
      POSTGRES_USER: ${GATEWAY_DB_USER}
      POSTGRES_PASSWORD: ${GATEWAY_DB_PASS}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_gateway_data:/var/lib/postgresql/data
      - ./configs/postgres/gateway-init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks: [mine_backend]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${GATEWAY_DB_USER} -d gateway_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres-inventree:
    image: postgres:15.6-alpine
    container_name: mine-postgres-inventree
    restart: unless-stopped
    environment:
      POSTGRES_DB: inventree_db
      POSTGRES_USER: ${INVENTREE_DB_USER}
      POSTGRES_PASSWORD: ${INVENTREE_DB_PASS}
    volumes:
      - postgres_inventree_data:/var/lib/postgresql/data
    networks: [mine_backend]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${INVENTREE_DB_USER} -d inventree_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres-erp:
    image: postgres:15.6-alpine
    container_name: mine-postgres-erp
    restart: unless-stopped
    environment:
      POSTGRES_DB: erp_db
      POSTGRES_USER: ${ERP_DB_USER}
      POSTGRES_PASSWORD: ${ERP_DB_PASS}
    volumes:
      - postgres_erp_data:/var/lib/postgresql/data
    networks: [mine_backend]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${ERP_DB_USER} -d erp_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres-twenty:
    image: postgres:15.6-alpine
    container_name: mine-postgres-twenty
    restart: unless-stopped
    environment:
      POSTGRES_DB: twenty_db
      POSTGRES_USER: ${TWENTY_DB_USER}
      POSTGRES_PASSWORD: ${TWENTY_DB_PASS}
    volumes:
      - postgres_twenty_data:/var/lib/postgresql/data
    networks: [mine_backend]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${TWENTY_DB_USER} -d twenty_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres-paperless:
    image: postgres:15.6-alpine
    container_name: mine-postgres-paperless
    restart: unless-stopped
    environment:
      POSTGRES_DB: paperless_db
      POSTGRES_USER: ${PAPERLESS_DB_USER}
      POSTGRES_PASSWORD: ${PAPERLESS_DB_PASS}
    volumes:
      - postgres_paperless_data:/var/lib/postgresql/data
    networks: [mine_backend]

  # ─── Redis ────────────────────────────────────────────────────────────
  redis:
    image: redis:7.2-alpine
    container_name: mine-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks: [mine_cache]
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── MinIO (Object Storage) ───────────────────────────────────────────
  minio:
    image: minio/minio:latest
    container_name: mine-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    networks: [mine_backend]
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 10s
      retries: 5

  # ─── Vault (Secrets Management) ───────────────────────────────────────
  vault:
    image: hashicorp/vault:1.15
    container_name: mine-vault
    restart: unless-stopped
    cap_add: [IPC_LOCK]
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_DEV_TOKEN}  # Dev only! Use HA in prod
    ports:
      - "8200:8200"
    networks: [mine_backend]
    healthcheck:
      test: ["CMD", "vault", "status"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  mine_backend:
    driver: bridge
    internal: true
  mine_frontend:
    driver: bridge
  mine_cache:
    driver: bridge
    internal: true
  mine_observe:
    driver: bridge

volumes:
  postgres_gateway_data:
  postgres_inventree_data:
  postgres_erp_data:
  postgres_twenty_data:
  postgres_paperless_data:
  redis_data:
  minio_data:
```

---

## 2. FastAPI Gateway (`docker-compose.gateway.yml`)

```yaml
# docker/docker-compose.gateway.yml

version: '3.8'

services:
  gateway:
    build:
      context: ../services/gateway
      dockerfile: Dockerfile
      target: production
    image: mine-gateway:${IMAGE_TAG:-latest}
    container_name: mine-gateway
    restart: unless-stopped
    depends_on:
      postgres-gateway:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      ENVIRONMENT: ${ENVIRONMENT:-production}
      DATABASE_URL: postgresql+asyncpg://${GATEWAY_DB_USER}:${GATEWAY_DB_PASS}@postgres-gateway:5432/gateway_db
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      
      # Service URLs (internal)
      INVENTREE_URL: http://inventree:8000
      INVENTREE_TOKEN: ${INVENTREE_API_TOKEN}
      AUREUSREP_URL: http://aureusrep:8000
      AUREUSREP_TOKEN: ${ERP_API_TOKEN}
      TWENTY_URL: http://twenty-server:3000
      TWENTY_API_KEY: ${TWENTY_API_KEY}
      PAPERLESS_URL: http://paperless:8000
      PAPERLESS_TOKEN: ${PAPERLESS_API_TOKEN}
      YETIFORCE_URL: http://yetiforce:80
      YETIFORCE_API_KEY: ${YETIFORCE_API_KEY}
      
      # Auth
      JWT_PRIVATE_KEY_PATH: /run/secrets/jwt_private_key
      JWT_PUBLIC_KEY_PATH: /run/secrets/jwt_public_key
      JWT_EXPIRY_SECONDS: 3600
      
      # Observability
      OTLP_ENDPOINT: http://signoz-otel-collector:4317
      
      # Feature flags
      FEATURE_AUTO_PO: ${FEATURE_AUTO_PO:-true}
      FEATURE_AI_CLASSIFICATION: ${FEATURE_AI_CLASSIFICATION:-true}
    
    secrets:
      - jwt_private_key
      - jwt_public_key
    
    ports:
      - "8000:8000"
    networks: [mine_frontend, mine_backend, mine_cache, mine_observe]
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

secrets:
  jwt_private_key:
    file: ./secrets/jwt_private_key.pem  # In prod: use Vault agent
  jwt_public_key:
    file: ./secrets/jwt_public_key.pem
```

---

## 3. Gateway Dockerfile

```dockerfile
# services/gateway/Dockerfile

# ── Build stage ──────────────────────────────────────────────────────────
FROM python:3.11.9-slim AS builder

WORKDIR /app
RUN pip install --no-cache-dir poetry==1.8.2
COPY pyproject.toml poetry.lock ./
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes
RUN pip install --no-cache-dir --user -r requirements.txt

# ── Production stage ──────────────────────────────────────────────────────
FROM python:3.11.9-slim AS production

# Non-root user (security hardening)
RUN useradd -m -u 1000 gateway
WORKDIR /app
USER gateway

COPY --from=builder /root/.local /home/gateway/.local
COPY --chown=gateway:gateway . .

ENV PATH=/home/gateway/.local/bin:$PATH
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Run migrations then start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4"]

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
```

---

## 4. InvenTree (`docker-compose.inventory.yml`)

```yaml
# docker/docker-compose.inventory.yml

version: '3.8'

services:
  inventree:
    image: inventree/inventree:0.14.x
    container_name: mine-inventree
    restart: unless-stopped
    depends_on:
      postgres-inventree:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      INVENTREE_DB_ENGINE: postgresql
      INVENTREE_DB_NAME: inventree_db
      INVENTREE_DB_USER: ${INVENTREE_DB_USER}
      INVENTREE_DB_PASSWORD: ${INVENTREE_DB_PASS}
      INVENTREE_DB_HOST: postgres-inventree
      INVENTREE_DB_PORT: 5432
      
      INVENTREE_CACHE_HOST: redis
      INVENTREE_CACHE_PORT: 6379
      INVENTREE_CACHE_PASSWORD: ${REDIS_PASSWORD}
      
      INVENTREE_ADMIN_USER: ${INVENTREE_ADMIN_USER}
      INVENTREE_ADMIN_PASSWORD: ${INVENTREE_ADMIN_PASS}
      INVENTREE_ADMIN_EMAIL: admin@minesystem.local
      
      INVENTREE_PLUGINS_ENABLED: "true"
      
    volumes:
      - inventree_data:/home/inventree/data
      - ./configs/inventree/config.yaml:/home/inventree/data/config.yaml:ro
    
    ports:
      - "8001:8000"
    networks: [mine_frontend, mine_backend, mine_cache]
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s

  inventree-worker:
    image: inventree/inventree:0.14.x
    container_name: mine-inventree-worker
    restart: unless-stopped
    command: invoke worker
    depends_on:
      inventree:
        condition: service_healthy
    environment:
      INVENTREE_DB_ENGINE: postgresql
      INVENTREE_DB_NAME: inventree_db
      INVENTREE_DB_USER: ${INVENTREE_DB_USER}
      INVENTREE_DB_PASSWORD: ${INVENTREE_DB_PASS}
      INVENTREE_DB_HOST: postgres-inventree
    volumes:
      - inventree_data:/home/inventree/data
    networks: [mine_backend, mine_cache]

volumes:
  inventree_data:

networks:
  mine_frontend:
    external: true
  mine_backend:
    external: true
  mine_cache:
    external: true
```

---

## 5. AureusERP (`docker-compose.erp.yml`)

```yaml
# docker/docker-compose.erp.yml

version: '3.8'

services:
  aureusrep:
    build:
      context: ../aureuserp-master
      dockerfile: Dockerfile
    image: mine-aureusrep:${IMAGE_TAG:-latest}
    container_name: mine-aureusrep
    restart: unless-stopped
    depends_on:
      postgres-erp:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      APP_ENV: production
      APP_KEY: ${ERP_APP_KEY}
      APP_URL: http://aureusrep:8000
      
      DB_CONNECTION: pgsql
      DB_HOST: postgres-erp
      DB_PORT: 5432
      DB_DATABASE: erp_db
      DB_USERNAME: ${ERP_DB_USER}
      DB_PASSWORD: ${ERP_DB_PASS}
      
      CACHE_DRIVER: redis
      QUEUE_CONNECTION: redis
      SESSION_DRIVER: redis
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      
      FILESYSTEM_DISK: s3
      AWS_ENDPOINT: http://minio:9000
      AWS_ACCESS_KEY_ID: ${MINIO_ACCESS_KEY}
      AWS_SECRET_ACCESS_KEY: ${MINIO_SECRET_KEY}
      AWS_BUCKET: aureusrep-files
      
    volumes:
      - aureusrep_storage:/app/storage
    
    ports:
      - "8002:8000"
    networks: [mine_frontend, mine_backend, mine_cache]
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 90s

  aureusrep-worker:
    build:
      context: ../aureuserp-master
    command: php artisan queue:work redis --sleep=3 --tries=3 --timeout=90
    restart: unless-stopped
    depends_on:
      aureusrep:
        condition: service_healthy
    environment:
      # Same env as aureusrep
    networks: [mine_backend, mine_cache]

volumes:
  aureusrep_storage:
```

---

## 6. Caddy Reverse Proxy (`docker-compose.caddy.yml`)

```yaml
# docker/docker-compose.caddy.yml

version: '3.8'

services:
  caddy:
    image: caddy:2.7-alpine
    container_name: mine-caddy
    restart: unless-stopped
    depends_on:
      - gateway
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./configs/caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks: [mine_frontend]
    healthcheck:
      test: ["CMD", "caddy", "validate", "--config", "/etc/caddy/Caddyfile"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  caddy_data:
  caddy_config:
```

---

## 7. Observability Stack (`docker-compose.observe.yml`)

```yaml
# docker/docker-compose.observe.yml

version: '3.8'

services:
  signoz-otel-collector:
    image: signoz/signoz-otel-collector:latest
    container_name: mine-signoz-collector
    restart: unless-stopped
    volumes:
      - ./configs/signoz/otel-collector-config.yaml:/etc/otel/config.yaml:ro
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
    networks: [mine_observe]

  signoz:
    image: signoz/frontend:latest
    container_name: mine-signoz
    restart: unless-stopped
    ports:
      - "9000:3301"
    networks: [mine_observe, mine_frontend]
    environment:
      FRONTEND_API_ENDPOINT: http://signoz-query-service:8080

  signoz-query-service:
    image: signoz/query-service:latest
    container_name: mine-signoz-query
    restart: unless-stopped
    environment:
      STORAGE: clickhouse
      CLICKHOUSE_HOST: clickhouse
    networks: [mine_observe]

  clickhouse:
    image: clickhouse/clickhouse-server:23.8
    container_name: mine-clickhouse
    restart: unless-stopped
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    networks: [mine_observe]

volumes:
  clickhouse_data:
```

---

## 8. Master Start Script

```bash
#!/bin/bash
# scripts/start-all.sh
# Starts entire Mine System in correct dependency order

set -e

echo "🚀 Starting Mine System..."

# Load environment
source configs/env/.env.core

# Phase 1: Core infrastructure
echo "Starting core infrastructure..."
docker-compose -f docker/docker-compose.core.yml up -d
./scripts/wait-healthy.sh postgres-gateway 60
./scripts/wait-healthy.sh redis 30

# Phase 2: Observability (early so it captures all startup events)
echo "Starting observability stack..."
docker-compose -f docker/docker-compose.observe.yml up -d

# Phase 3: Application services (parallel)
echo "Starting application services..."
docker-compose -f docker/docker-compose.inventory.yml up -d &
docker-compose -f docker/docker-compose.erp.yml up -d &
docker-compose -f docker/docker-compose.crm.yml up -d &
docker-compose -f docker/docker-compose.docs.yml up -d &
docker-compose -f docker/docker-compose.crm2.yml up -d &
wait

./scripts/wait-healthy.sh mine-inventree 120
./scripts/wait-healthy.sh mine-aureusrep 120

# Phase 4: Gateway (after all services healthy)
echo "Starting API Gateway..."
docker-compose -f docker/docker-compose.gateway.yml up -d
./scripts/wait-healthy.sh mine-gateway 90

# Phase 5: UX layer
echo "Starting UX layer..."
docker-compose -f docker/docker-compose.ux.yml up -d
docker-compose -f docker/docker-compose.caddy.yml up -d

# Final check
echo "Running system health check..."
./scripts/health-check-all.sh

echo "✅ Mine System is UP!"
echo "Access at: https://minesystem.local"
echo "Dashboard: https://minesystem.local/dashboard"
```

---

## 9. Environment Variable Template

```bash
# configs/env/.env.core.example
# COPY to .env.core and fill in values
# NEVER commit .env.core to git

# Databases
GATEWAY_DB_USER=gateway_user
GATEWAY_DB_PASS=CHANGE_ME_GATEWAY_DB_PASS

INVENTREE_DB_USER=inventree_user
INVENTREE_DB_PASS=CHANGE_ME_INVENTREE_DB_PASS

ERP_DB_USER=erp_user
ERP_DB_PASS=CHANGE_ME_ERP_DB_PASS

TWENTY_DB_USER=twenty_user
TWENTY_DB_PASS=CHANGE_ME_TWENTY_DB_PASS

PAPERLESS_DB_USER=paperless_user
PAPERLESS_DB_PASS=CHANGE_ME_PAPERLESS_DB_PASS

# Redis
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD

# MinIO
MINIO_ACCESS_KEY=CHANGE_ME_MINIO_ACCESS
MINIO_SECRET_KEY=CHANGE_ME_MINIO_SECRET

# Vault
VAULT_DEV_TOKEN=CHANGE_ME_VAULT_TOKEN  # DEV ONLY

# Service admin accounts
INVENTREE_ADMIN_USER=admin
INVENTREE_ADMIN_PASS=CHANGE_ME_INVENTREE_ADMIN

ERP_APP_KEY=base64:CHANGE_ME_ERP_APP_KEY  # Generate: php artisan key:generate

# Service API tokens (generate after services start)
INVENTREE_API_TOKEN=CHANGE_ME_AFTER_SETUP
ERP_API_TOKEN=CHANGE_ME_AFTER_SETUP
TWENTY_API_KEY=CHANGE_ME_AFTER_SETUP
PAPERLESS_API_TOKEN=CHANGE_ME_AFTER_SETUP
YETIFORCE_API_KEY=CHANGE_ME_AFTER_SETUP

# Feature flags
FEATURE_AUTO_PO=true
FEATURE_AI_CLASSIFICATION=true
FEATURE_FLOWCHART_GEN=false

# Environment
ENVIRONMENT=production
IMAGE_TAG=latest
```

---

*Owner: Team Alpha (DevOps)*  
*Review: Update when service versions change or new services added*
