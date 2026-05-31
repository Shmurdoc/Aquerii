# Template System Blueprint

Date: 2026-05-30

## Why this matters

Without templates, this product burns user time and fails standardization.
Templates are mandatory for repeatable execution and quality.

## Template governance model

Template lifecycle:
- draft -> review -> approved -> published -> deprecated -> archived

Controls:
- semantic versioning per template
- change log per version
- required approval for org default templates
- rollback to prior version

Template metadata:
- id, module, type, owner, reviewers, status, version, tags, locale, region, compliance scope

## Template variable system

Variable categories:
- workspace variables (company, logo, tax ID)
- user variables (name, role, signature)
- record variables (invoice number, due date, amount)
- computed variables (totals, aging bucket, SLA target)

Validation:
- required variables must resolve before publish
- unresolved variables block execution

## Invoice template pack (minimum set)

1. Modern B2B invoice
- clean layout, line items, tax block, payment terms

2. VAT/GST regional invoice
- jurisdiction-friendly tax lines and legal labels

3. Service invoice (hours and rates)
- timesheet line grouping and subtotal breakdown

4. Product invoice (SKU-heavy)
- item codes, quantities, warehouse note, shipping fields

5. Recurring subscription invoice
- billing period, proration note, next charge date

6. Credit note template
- reverse references and reason codes

7. Proforma / quote template
- non-binding wording and validity window

## Other required template families

- Quotes and proposals
- Purchase orders and GRN docs
- Sales order confirmations
- Payment receipts
- Customer support macros
- Incident communication templates
- Board/project kickoff templates
- Department handoff templates
- Approval workflow templates
- Report packs and dashboard presets
- Email sequence templates

## Template API behavior

Required operations:
- list templates by module/type
- create from template
- preview render
- validate variable resolution
- publish/deprecate
- clone and customize per workspace/team

## Practical anti-overengineering rule

Do not build a massive visual template builder first.
Phase it:

Phase 1:
- structured JSON schema + server-side renderer + approved catalog

Phase 2:
- guided editor for business users

Phase 3:
- advanced layout designer

## Completion criteria

- 20+ high-value templates shipped across core modules.
- Every launch-critical workflow has a default template.
- Template usage analytics visible by module and team.
