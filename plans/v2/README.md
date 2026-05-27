# Aquerii Production Plan v2

> **Mission**: Transform Aquerii from a feature-rich modular monolith into a production-ready SaaS platform with tiered subscription plans, a powerful creator dashboard, company owner accounts with employee management, and bulletproof reliability.

## The Gap

The codebase is **feature-rich but commercially incomplete**:
- 80+ migrations, 60+ models, 50+ controllers, 43 frontend pages — all implemented
- Full ERP (Invoicing, Purchasing, Sales, Inventory, Accounting)
- Full CRM (pipelines, deals, contacts, sequences, quotas, forecast)
- Email, Support, Marketing, AI modules — all working
- **BUT**: No subscription tiers, no feature gating, no creator dashboard, no company→employee hierarchy, no DB space allocation

## Execution Strategy

| Phase | Focus | Deliverables | CI Gate |
|-------|-------|-------------|---------|
| **0** | Platform Foundation | Super-admin table, subscription engine, feature flag system, plan tiers | `php artisan test --testsuite=Feature` |
| **1** | Company Hierarchy | Company owner role, employee groups, role hierarchy migration, invitation system | All tests pass |
| **2** | Creator Dashboard | Filament admin resources: logs, subscriptions, features, DB space, tickets, email tracking | E2E smoke test |
| **3** | Frontend Design System | Design tokens, component library, settings overhaul, subscription UI | Lighthouse CI |
| **4** | Production Hardening | Security audit, performance tests, docs sync, CI/CD pipeline finalization | Full CI green |

## Rule: One feature per commit. Commit → Push → CI → Next.
No batching. No shortcuts. Every feature stands alone and is verified.
