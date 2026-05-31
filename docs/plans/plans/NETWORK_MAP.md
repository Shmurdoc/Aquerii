# Network Map & Port Allocation

## Docker Networks
| Network Name | Subnet | Purpose |
|-------------|--------|---------|
| mine-frontend | 172.20.0.0/24 | UI services (Homarr, Excalidraw) |
| mine-backend | 172.20.1.0/24 | API services (Gateway, InvenTree, ERPNext) |
| mine-data | 172.20.2.0/24 | Databases, Redis |
| mine-monitoring | 172.20.3.0/24 | SigNoz, telemetry |

## Port Allocation Matrix
| Service | Container Port | Host Port | Network | Notes |
|---------|----------------|-----------|---------|-------|
| Caddy | 80, 443 | 80, 443 | mine-frontend | SSL termination |
| Homarr | 3000 | 3000 | mine-frontend | Dashboard |
| InvenTree Web | 8000 | 8100 | mine-backend | Inventory UI |
| InvenTree Worker | - | - | mine-backend | Background tasks |
| InvenTree Redis | 6379 | 6379 | mine-data | Cache |
| ERPNext Web | 8000 | 8200 | mine-backend | ERP UI |
| ERPNext Redis | 6379 | 6380 | mine-data | Cache |
| Twenty CRM Web | 3000 | 8300 | mine-backend | CRM UI |
| Twenty DB | 5432 | - | mine-data | Internal only |
| Paperless-ngx | 8000 | 8400 | mine-backend | Documents UI |
| FastAPI Gateway | 8000 | 8000 | mine-backend | Main API |
| PostgreSQL Main | 5432 | - | mine-data | Internal only |
| SigNoz UI | 3300 | 3300 | mine-monitoring | Monitoring |
| SigNoz Otel | 4317, 4318 | 4317, 4318 | mine-monitoring | Telemetry |
| Zulip | 80 | 8500 | mine-frontend | ChatOps |
| Excalidraw | 3000 | 8600 | mine-frontend | Whiteboard |
| Flowchart AI | 8000 | 8700 | mine-backend | Diagram AI |
| HuixiangDou | 8000 | 8800 | mine-backend | AI Assistant |

## Network Topology (ASCII)
```
                     ┌─────────────┐
                     │   Caddy     │
                     │  (Proxy)    │
                     └──────┬──────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│mine-frontend │    │mine-backend  │    │mine-data     │
│Homarr:3000   │    │Gateway:8000  │    │Postgres:5432 │
│Zulip:8500    │    │InvenTree:8100│    │Redis:6379    │
│Excalidraw:8600│   │ERPNext:8200  │    └──────────────┘
└──────────────┘    │Twenty:8300   │
                    │Paperless:8400│
                    └──────────────┘
                            │
                    ┌───────┴───────┐
                    │mine-monitoring │
                    │SigNoz:3300     │
                    └───────────────┘
```

## Host Port Conflicts to Avoid
- 80, 443: Caddy only
- 5432: PostgreSQL (internal)
- 6379: Redis (internal)
- 8000: Gateway (external), InvenTree/ERPNext/Paperless (internal)

## Service Discovery
| Service | Internal DNS Name | Port |
|---------|-------------------|------|
| InvenTree | inventree-web | 8000 |
| ERPNext | erpnext-web | 8000 |
| Twenty | twenty-web | 3000 |
| Gateway | gateway-api | 8000 |
| PostgreSQL | postgres-main | 5432 |
| Redis | redis-main | 6379 |