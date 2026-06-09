# Training & Onboarding Plan

## Training Materials Checklist
| Material | Format | Owner | Status |
|----------|--------|-------|--------|
| InvenTree User Guide | PDF + Video | Team Beta | Planned |
| ERPNext Invoicing Guide | PDF + Video | Team Beta | Planned |
| Twenty CRM Quickstart | PDF + Video | Team Beta | Planned |
| Homarr Dashboard Tour | Video | Team Delta | Planned |
| Zulip ChatOps Commands | Cheat Sheet | Team Delta | Planned |
| QR Code Scanning Guide | PDF | Team Beta | Planned |
| RBAC & Permissions | Doc | Security Lead | Planned |

## Onboarding Flow by Persona

### Inventory Manager (Sarah)
1. **Day 1**: InvenTree basics (login, navigation)
2. **Day 2**: QR code scanning demo
3. **Day 3**: Stock checks and PO creation
4. **Day 4**: BOM management
5. **Day 5**: Zulip ChatOps ("!stock", "!po create")

### Finance Manager (Mike)
1. **Day 1**: ERPNext overview (invoicing module)
2. **Day 2**: Automated PO-to-invoice flow
3. **Day 3**: Homarr dashboard (spend tracking)
4. **Day 4**: Audit trail review
5. **Day 5**: CRM deal-to-invoice demo

### Sales Rep (Emily)
1. **Day 1**: Twenty CRM basics
2. **Day 2**: Zulip for stock queries ("!stock bolts")
3. **Day 3**: Reserve stock from deal
4. **Day 4**: Document upload (Paperless-ngx)
5. **Day 5**: Full deal-to-reserve flow

### System Admin (Alex)
1. **Day 1**: SigNoz dashboards
2. **Day 2**: RBAC configuration
3. **Day 3**: Backup & recovery (ROLLBACK_PLAN.md)
4. **Day 4**: Caddy config & SSL
5. **Day 5**: Incident response simulation

### Warehouse Worker (Joe)
1. **Day 1**: Mobile InvenTree login
2. **Day 2**: QR scanning practice
3. **Day 3**: Stock update workflow
4. **Day 4**: Zulip notifications
5. **Day 5**: Full receive-to-update flow

## Training Delivery Methods
| Method | Tool | Audience |
|--------|------|----------|
| Video tutorials | Excalidraw + Flowchart AI (diagrams) | All users |
| Cheat sheets | PDF via Paperless-ngx | Power users |
| Hands-on labs | Staging environment | All users |
| Office hours | Zulip + HuixiangDou Q&A | All users |

## Training Timeline
| Week | Activity |
|------|----------|
| Week 10 (Phase 4) | Create all training materials |
| Week 11 | Train System Admins (Alex) |
| Week 12 | Train Managers (Sarah, Mike, Emily) |
| Week 13 | Train Warehouse Workers (Joe) |
| Week 14 | Full system go-live |

## Success Metrics
- 100% of users complete onboarding checklist
- < 5 support tickets per week after go-live
- > 4/5 user satisfaction score