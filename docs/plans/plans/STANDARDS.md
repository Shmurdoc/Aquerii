# Naming Conventions & Standards

## Container Naming
| Type | Pattern | Examples |
|------|---------|----------|
| App Container | `{service}-web` | `inventree-web`, `erpnext-web`, `twenty-web` |
| DB Container | `{service}-db` | `inventree-db`, `erpnext-db`, `postgres-main` |
| Cache | `{service}-redis` | `inventree-redis`, `erpnext-redis` |
| Worker | `{service}-worker` | `inventree-worker`, `erpnext-worker` |
| Proxy | `caddy-proxy` | `caddy-proxy` |
| Dashboard | `homarr-dash` | `homarr-dash` |
| Monitoring | `signoz-otel` | `signoz-otel` |

## Database Naming
| DB | Name | User |
|----|------|------|
| InvenTree | `inventree_db` | `inventree_user` |
| ERPNext | `erpnext_db` | `erpnext_user` |
| Twenty | `twenty_db` | `twenty_user` |
| Gateway | `gateway_db` | `gateway_user` |

## Environment Variables
| Pattern | Examples |
|---------|----------|
| `{SERVICE}_HOST` | `INVENTREE_HOST`, `ERPNEXT_HOST` |
| `{SERVICE}_PORT` | `INVENTREE_PORT=8000` |
| `{SERVICE}_DB_*` | `INVENTREE_DB_HOST`, `INVENTREE_DB_PASSWORD` |
| `SECRET_*` | `SECRET_KEY`, `JWT_SECRET` |

## File/Directory Naming
| Type | Pattern | Example |
|------|---------|---------|
| Config files | `configs/{service}/` | `configs/inventree/` |
| Docker files | `docker/{service}.yml` | `docker/inventree.yml` |
| Plans | `plans/{phase}/` | `plans/1-core-infra/` |
| Scripts | `scripts/{purpose}.sh` | `scripts/backup.sh` |
| Logs | `logs/{service}.log` | `logs/inventree.log` |

## Network Naming
| Network | Purpose |
|---------|---------|
| `mine-frontend` | UI services (Homarr, Excalidraw) |
| `mine-backend` | API services (Gateway, InvenTree, ERPNext) |
| `mine-data` | Databases, Redis |
| `mine-monitoring` | SigNoz, telemetry |

## Image Tag Convention
- Production: `{service}:{version}` (e.g., `inventree:stable`)
- Staging: `{service}:staging`
- Local dev: `{service}:dev`

## Branch Naming (when code starts)
| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/{description}` | `feat/inventree-webhook` |
| Fix | `fix/{description}` | `fix/gateway-auth` |
| Phase | `phase/{n}/{description}` | `phase/1/caddy-setup` |