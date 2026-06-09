---
member_id: member-08
owner: Senior Lead — Billing + Inventory
area: billing-inventory
priority: high
estimated_hours: 8
created_at: 2026-06-04T01:00:00Z
updated_by: Leader
review_required: true
reviews_by: [Leader]
artifact_refs:
  - "PRODUCTION_READINESS_PLAN.md (Phase 1, Phase 3)"
  - "team/GAPS.md (HIGH-006, MED-018, MED-019)"
---

# Plan

- Objective: Fix billing confirmation email and implement inventory module foundations
- Deliverables:
  1. Fix SendBillingConfirmationEmail job — uncomment Mail::send(), create App\Mail\BillingConfirmation Mailable (HIGH-006)
  2. Create BillingConfirmation Mailable with Markdown template at resources/views/emails/billing-confirmation.blade.php
  3. Implement inventory module:
     - Create/verify product CRUD routes and controllers
     - Create Product model with SKU, pricing, categories
     - Create Inventory stock management routes
  4. Add stock level tracking and low stock alerts
- Preconditions: API base exists (member-01 delivered Core API). Billing webhooks configured.
- Acceptance Criteria:
  - [ ] SendBillingConfirmationEmail job sends real email with workspace name, plan, amount
  - [ ] BillingConfirmation Mailable renders correctly
  - [ ] Product CRUD works (GET/POST/PATCH/DELETE)
  - [ ] Stock levels API functional
  - [ ] Low stock alerts trigger correctly
  - [ ] vendor/bin/phpstan analyse level 5 passes on new code
