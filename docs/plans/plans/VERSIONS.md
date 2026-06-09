# Technology Versions

## Core Infrastructure
| Component | Version | Image/Source |
|-----------|---------|--------------|
| Docker | 24.0+ | docker.io |
| Docker Compose | 2.20+ | docker.io |
| Caddy | 2.7-alpine | caddy:2.7-alpine |
| Homarr | latest | ghcr.io/ajnart/homarr:latest |
| SigNoz | 0.26.0 | signoz/signoz:0.26.0 |

## Databases
| Component | Version | Image |
|-----------|---------|-------|
| PostgreSQL | 15-alpine | postgres:15-alpine |
| Redis | 7-alpine | redis:7-alpine |

## Business Applications
| Component | Version | Image/Source |
|-----------|---------|--------------|
| InvenTree | stable | inventree/inventree:stable |
| ERPNext | v15 | frappe/erpnext:v15 |
| Twenty CRM | latest | twentycrm/crm:latest |
| Paperless-ngx | latest | ghcr.io/paperless-ngx/paperless-ngx:latest |

## Python Environment
| Component | Version |
|-----------|---------|
| Python | 3.11+ |
| inventree-sdk | 0.1.1 |
| inventree (Python module) | latest |
| FastAPI | 0.110+ |
| pydantic | 2.0+ |
| SQLAlchemy | 2.0+ |

## Node.js / Frontend
| Component | Version |
|-----------|---------|
| Node.js | 20 LTS |
| pnpm | 8+ |
| React | 18+ |
| TypeScript | 5+ |
| Vite | 5+ |

## AI & Agents
| Component | Version |
|-----------|---------|
| Microsoft Agent Framework | latest |
| HuixiangDou | main branch |
| IBM Docling | latest |

## Monitoring Stack
| Component | Version | Image |
|-----------|---------|-------|
| SigNoz Otel Collector | 0.26.0 | signoz/otel-collector:0.26.0 |
| Prometheus | 2.45+ | prom/prometheus:v2.45 |
| Grafana | 10.0+ | grafana/grafana:10.0 |

## Version Pinning Rules
1. Production: Always pin exact version (e.g., `postgres:15.4-alpine`)
2. Staging: Allow patch updates (e.g., `postgres:15-alpine`)
3. Dev: Latest tag acceptable
4. Python deps: Use `requirements.txt` with `==` pins
5. Node deps: Use `package.json` with carets, lockfile committed