# Aquerii Super-Plan — Index & Executive Summary

> **Version:** 1.0 · **Date:** 2026-05-25 · **Status:** Active

---

## Executive Summary

Aquerii is an all-in-one enterprise SaaS platform combining project management, CRM, ERP, HR, meetings, and AI assistance into a single product designed to run a company end-to-end. Built on a Laravel API + React/Vite frontend + Node realtime layer + Python AI service monorepo, the platform already has 53 production-readiness issues and 25 security findings resolved. The current gap is completeness: several backend modules (ERP, HR, Reports, Settings) are partially or entirely unbuilt, a handful of frontend features are missing (auth refresh, OAuth, AI chat, column management, subitems, PayFast), and the RBAC system needs to be hardened end-to-end across all new surfaces. This super-plan is the single authoritative blueprint to take Aquerii from its current state to a 10/10 production-ready product that surpasses competitors aesthetically and functionally across six 2-week sprints.

---

## How to Use This Super-Plan

Read the documents in order on first pass. Each subsequent document assumes the decisions in the ones before it.

| # | File | Purpose | Read When |
|---|------|---------|-----------|
| 00 | `00-index.md` *(this file)* | Orientation, status, critical path | Start here |
| 01 | `01-ceo-vision.md` | Why we're building this, pricing, 90-day roadmap | Before any planning |
| 02 | `02-rbac-architecture.md` | Permission model that governs every feature | Before backend or frontend work |
| 03 | `03-backend-gaps.md` | Missing routes, migrations, models, controllers | Backend implementation |
| 04 | `04-frontend-gaps.md` | Missing components, hooks, pages | Frontend implementation |
| 05 | `05-design-system.md` | Colors, typography, spacing, component specs, UX per page | Any UI work |
| 06 | `06-qa-testing-plan.md` | Pest / Vitest / pytest / Playwright coverage | QA and CI setup |
| 07 | `07-engineering-execution.md` | Sprint-by-sprint execution, DoD, performance targets | Sprint planning |

**Key dependencies:**
- `02` (RBAC) must be understood before implementing anything in `03` or `04`
- `05` (design system) should be set up before new frontend components are built
- `06` (QA) runs in parallel with implementation sprints — tests written alongside features
- `07` (execution) is the scheduler that sequences everything in `03`–`06`

---

## Current Status

### Backend Modules

| Module | Area | Status | Notes |
|--------|------|--------|-------|
| Authentication | Auth | Done | JWT, refresh needed |
| Projects & Tasks | Core | Done | Subitems missing |
| CRM — Contacts | CRM | Done | — |
| CRM — Companies | CRM | Not started | Model, routes, UI all missing |
| CRM — Pipelines | CRM | Not started | Deal stages, kanban missing |
| Invoices | ERP | Not started | Full CRUD + PDF generation |
| Purchase Orders | ERP | Not started | Approval workflow |
| Sales Orders | ERP | Not started | Linked to CRM deals |
| Inventory | ERP | Not started | SKU, stock levels, movements |
| Chart of Accounts | ERP | Not started | Double-entry accounting |
| Employees | HR | Not started | Profiles, contracts, documents |
| Attendance | HR | Not started | Clock-in/out, timesheets |
| Leave Management | HR | Not started | Requests, approvals, balances |
| Expense Claims | HR | Not started | Receipts, reimbursement flow |
| Meetings | Meetings | Not started | Agenda, minutes, action items |
| Reports | Reports | Not started | Cross-module analytics, exports |
| Platform Settings | Settings | Partial | Company config gaps |
| Notifications | Platform | Not started | In-app + email + realtime |
| RBAC Policies | Platform | Partial | Policies exist; new modules unguarded |

### Frontend Modules

| Feature | Status | Notes |
|---------|--------|-------|
| Auth token refresh | Not started | Silent refresh + 401 interceptor |
| OAuth (Google/Microsoft) | Not started | Login and account linking |
| Column management (tasks) | Not started | Show/hide, reorder, persist |
| AI chat interface | Not started | Streaming, context-aware |
| Task subitems | Not started | Nested tasks, progress rollup |
| CRM Companies UI | Not started | Tied to backend gap |
| CRM Pipeline / Kanban | Not started | Drag-and-drop deal stages |
| PayFast integration | Not started | Subscription billing UI |
| In-app notifications | Not started | Bell icon, notification center |
| ERP module UIs | Not started | All screens for invoices/PO/SO/inventory |
| HR module UIs | Not started | Employee portal, leave, attendance |
| Meetings UI | Not started | Agenda builder, minutes editor |
| Reports dashboard | Not started | Charts, filters, exports |

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Missing backend routes (estimated) | ~120 |
| New database tables needed | ~35 |
| Missing frontend pages/views | ~40 |
| New React components needed | ~80 |
| Test files to write (backend Pest) | ~30 |
| Test files to write (frontend Vitest) | ~25 |
| E2E Playwright flows | ~20 |
| Total sprints planned | 6 (12 weeks) |
| Estimated backend dev effort | ~18 sprint-days |
| Estimated frontend dev effort | ~16 sprint-days |
| Estimated QA/infra effort | ~6 sprint-days |

---

## Critical Path

The following sequence is non-negotiable. Blocking dependencies are marked.

```
1. RBAC hardening (02)
   └── Blocks: every new module — policies must exist before routes are registered

2. Database migrations for all new modules (03)
   └── Blocks: models, seeders, tests, frontend integration

3. Auth token refresh + 401 interceptor (04)
   └── Blocks: all frontend work in authenticated flows

4. Design system tokens + base components (05)
   └── Blocks: building any new UI without visual debt

5. ERP core (invoices → PO → SO → inventory) (03 + 04)
   └── Blocks: accounting, reports, PayFast billing

6. HR core (employees → attendance → leave → expenses) (03 + 04)
   └── Blocks: HR reports, payroll prep

7. CRM extensions (companies + pipelines) (03 + 04)
   └── Blocks: sales reporting, deal-linked SO

8. Meetings module (03 + 04)

9. Reports & analytics (03 + 04)
   └── Depends on: all modules above having data

10. PayFast billing + subscription management
    └── Depends on: auth, RBAC, invoices

11. Notifications (realtime + email)
    └── Can run in parallel from Sprint 3 onward

12. QA pass + performance tuning (06 + 07)
    └── Final gate before production launch
```

---

## Glossary

| Term | Definition |
|------|-----------|
| **Platform Owner** | Aquerii superadmin; manages all companies on the platform |
| **Company Owner** | Tenant root user; full access within their company |
| **Manager** | Can manage team members, approve requests, view reports within their scope |
| **Employee** | Standard user; access limited to assigned projects/tasks and personal HR data |
| **RBAC** | Role-Based Access Control — the permission system governing all feature access |
| **Monorepo** | Single repository containing Laravel API, React/Vite app, Node realtime service, Python AI service |
| **ERP** | Enterprise Resource Planning — invoices, purchase orders, sales orders, inventory, accounting |
| **HR** | Human Resources — employee profiles, attendance, leave, expense claims |
| **Super-plan** | This set of seven documents forming the complete implementation blueprint |
| **DoD** | Definition of Done — the criteria a feature must meet before it is considered complete (see `07`) |
| **Sprint** | 2-week development cycle; 6 sprints = 12-week total timeline |
| **PayFast** | South African payment gateway used for Aquerii subscription billing |
| **Pest** | PHP testing framework used for Laravel backend tests |
| **Vitest** | Unit/integration test runner for the React frontend |
| **Playwright** | End-to-end browser test framework for full user-flow coverage |
