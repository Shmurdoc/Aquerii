# Security Baseline

## Secrets Management
| Rule | Implementation |
|------|----------------|
| No secrets in repo | Use `.env.example` with placeholder values |
| Use Docker secrets | Mount secrets as files in production |
| Rotate credentials | 90-day rotation policy for DB passwords |
| Minimize env exposure | Only inject required vars per container |

## RBAC Model
| Role | Permissions | Assigned To |
|------|-------------|-------------|
| System Admin | Full access to all services | Lead, Architect |
| Inventory Manager | InvenTree: read/write stock, parts, POs | Team Beta |
| Finance Manager | ERPNext: read/write invoices, payments | Team Beta |
| CRM Manager | Twenty: read/write customers, deals | Team Beta |
| Viewer | Read-only across all services | All employees |
| API Service | Service-to-service auth | Gateway, webhooks |
| Bot/AI | Limited write (create POs, reserves) | MS Agent, HuixiangDou |

## Authentication Strategy
| Service | Auth Method | Notes |
|---------|-------------|-------|
| Gateway | JWT + OAuth2 | Central auth for all APIs |
| InvenTree | Token-based | API tokens for service accounts |
| ERPNext | Session + API key | Use API keys for automation |
| Twenty | JWT | Standard JWT for UI and API |
| Homarr | Local auth | Dashboard access only |
| Zulip | Email + SSO (future) | ChatOps authentication |
| SigNoz | Local auth | Monitoring access |

## Network Security
| Rule | Implementation |
|------|----------------|
| Isolate data network | mine-data network internal only, no host mapping |
| TLS everywhere | Caddy handles TLS termination for all external traffic |
| Rate limiting | Gateway implements rate limiting per API key |
| CORS policy | Gateway enforces CORS for allowed origins only |

## Credential Storage Template (.env.example)
```bash
# PostgreSQL
POSTGRES_PASSWORD=changeme
INVENTREE_DB_PASSWORD=changeme
ERPNEXT_DB_PASSWORD=changeme
TWENTY_DB_PASSWORD=changeme

# JWT
JWT_SECRET=changeme
JWT_ALGORITHM=HS256

# API Keys
INVENTREE_API_TOKEN=changeme
ERPNEXT_API_KEY=changeme
GATEWAY_SERVICE_TOKEN=changeme
```

## Security Review Checklist (gstack-main review/specialists/security.md)
- [ ] No hardcoded credentials in any config
- [ ] All services use non-root containers
- [ ] TLS 1.3 enforced on Caddy
- [ ] RBAC roles tested per phase
- [ ] Network isolation verified
- [ ] Secrets rotation tested
- [ ] Audit logging enabled on Gateway