# Pilot Strategy — Aquerii

**Date:** 2026-06-05
**Author:** Madoc (Founder)
**Status:** Draft

---

## 1. Pilot Overview

Aquerii is entering its first pilot deployment at a South African mine. The goal is to validate that a non-technical mining employee can complete core workflows, surface critical bugs, and collect qualitative feedback to derisk the broader rollout.

**Pilot mine:** (TBD — specific mine name)
**Duration:** 12 weeks

---

## 2. Success Scenarios

A non-technical mining employee should be able to complete these 10 scenarios without training.

| # | Scenario | Acceptance |
|---|---|---|
| 1 | Log in and see their workspace | User receives credentials, logs in, sees their tenant-scoped dashboard |
| 2 | Create a deal (e.g. "R500k maintenance contract") | Navigate to Deals, create a deal with amount, counterparty, status — saved and visible |
| 3 | Generate a branded PDF (quote/invoice with mine logo) | Open a deal or document, click Print/Export, choose PDF — output has mine logo and colour theme |
| 4 | Email a document to a contractor | From any entity, click Email, enter contractor address, send — recipient receives formatted document |
| 5 | Export contacts to Excel | Navigate to Contacts or related list, click Export — downloads `.xlsx` with all visible fields |
| 6 | @mention a colleague in a hazard report | In a hazard/incident note, type `@` and select a user — mention renders as a link, colleague gets notification |
| 7 | Print any entity page | Open hazard, incident, deal, ticket, etc. — click Print — browser print dialog opens with formatted page |
| 8 | Change the workspace logo and colour from settings | Go to Settings → Branding, upload logo, pick primary colour — changes apply sitewide immediately |
| 9 | Create and assign a ticket | Open Tickets, create ticket with title/description, assign to a user — assignee sees it on their dashboard |
| 10 | View and filter the risk register | Open Risk Register — table loads, user can filter by category/status/likelihood and see results |

---

## 3. Pilot User Personas

| Role | Daily Tasks |
|---|---|
| **Mine Manager** | Dashboard overview, deals pipeline, operations reports, approve permits |
| **Safety Officer (HSSE)** | Hazard/incident tracking, corrective actions, @mention colleagues on reports, close-out audits |
| **Shift Supervisor** | Issue permits, manage board items, assign tickets, log daily shift reports |
| **HR Coordinator** | Employee records management, contractor onboarding, contact directory |
| **Inventory Clerk** | Stock item tracking, inventory counts, reorder alerts, product catalog |
| **Admin** | Workspace settings, branding (logo/colour), user invites, team management |
| **Procurement Officer** | Create deals with suppliers, generate RFQ documents, track PO status |
| **Compliance Officer** | Risk register review, audit trails, document retention, regulatory reports |
| **IT Support** | Ticket triage, user account setup, integration testing with mine systems |
| **Training Lead** | Onboarding new users, running success scenario verification, collecting feedback |

---

## 4. Pilot Launch Checklist

- [ ] Pilot workspace provisioned with tenant isolation
- [ ] All 10 success scenarios verified working end-to-end
- [ ] Pilot users invited with credentials and login instructions
- [ ] NDA / Pilot agreement signed
- [ ] Week 1 feedback call scheduled
- [ ] 2nd mine NDA in progress (pipeline de-risking)
- [ ] Monitoring and error tracking enabled for pilot tenant
- [ ] Support escalation path defined (email / WhatsApp group)
- [ ] Data backup and restore verified for pilot tenant

---

## 5. Success Metrics

| Metric | Target |
|---|---|
| Scenarios completed without help | 8/10 by end of Week 1 |
| NPS score (Week 1) | ≥ 6 |
| Critical/blocker bugs | 0 open at end of Week 2 |
| Feature requests logged | Tracked, prioritised for Phase 3 |
| Pilot renewal intent | "Yes" at Week 8 midpoint check |

---

## 6. Post-Pilot Path

- **Convert pilot → paid** at R50k–R500k ZAR ACV depending on mine size
- **Expand to 2nd mine** before pilot ends (overlap for cross-validation)
- **Publish case study** with pilot mine's permission
