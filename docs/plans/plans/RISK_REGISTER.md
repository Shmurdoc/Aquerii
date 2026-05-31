# Risk Register

| ID | Risk | Likelihood | Severity | Mitigation | Owner |
|----|------|------------|----------|------------|-------|
| R01 | InvenTree + ERPNext sync failure | Medium | High | Use idempotency keys; retry queue; manual override | Gamma |
| R02 | Database connection pool exhaustion | Low | High | Configure pooling; monitor with SigNoz | Alpha |
| R03 | Caddy SSL certificate renewal failure | Low | Medium | Use Let's Encrypt staging first; alerts | Alpha |
| R04 | InvenTree initial setup timeout | Medium | Low | Increase Docker resources; staged setup | Beta |
| R05 | API Gateway becomes single point of failure | Low | High | Add health checks; consider HA setup later | Gamma |
| R06 | Secrets exposed in logs | Low | Critical | Sanitize logs; use secret files | Alpha/Security |
| R07 | Webhook event loop (infinite triggers) | Medium | High | Implement event deduplication; max retry count | Gamma |
| R08 | ERPNext resource consumption too high | High | Medium | Allocate 4+ CPU, 8GB RAM minimum | Beta |
| R09 | Twenty CRM startup failure | Medium | Medium | Use connection pooling; staged migration | Beta |
| R10 | HuixiangDou AI hallucination | Medium | Medium | Human-in-the-loop for critical actions | Delta |
| R11 | Data migration data loss | Low | Critical | Backup before migration; test on staging | Beta/DBA |
| R12 | Port conflicts between services | Medium | Low | Use NETWORK_MAP.md; verify before deploy | Alpha |
| R13 | Team skill gap on InvenTree SDK | Medium | Medium | Use inventree-sdk 0.1.1; pair programming | Lead/Beta |
| R14 | Docker network isolation failure | Low | High | Test network policies; use internal networks | Alpha |
| R15 | Rollback failure after bad deployment | Low | Critical | Test rollback in staging; document procedure | All |

## Risk Matrix
```
Severity →  Low  Med  High  Crit
Likely ↓
High        R04  R08  R01   R15
Medium      R12  R07  R05   R11
Low         R09  R03  R14   R06
```

## Mitigation Priority
1. **Critical**: R06, R11, R15 (Secrets, Data Loss, Rollback)
2. **High**: R01, R02, R05, R07, R14 (Sync, DB, Gateway, Events, Network)
3. **Medium**: R03, R08, R10, R13 (SSL, Resources, AI, Skills)
4. **Low**: R04, R09, R12 (InvenTree setup, Twenty startup, Port conflicts)