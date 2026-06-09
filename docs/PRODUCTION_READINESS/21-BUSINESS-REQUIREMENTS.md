# BUSINESS REQUIREMENTS - NON-NEGOTIABLES

This file defines what business owners will not compromise on. If the system cannot satisfy these rules, it is not a serious business platform.

## 1. Control
- Every sensitive action needs a clear owner, timestamp, and history.
- Financial actions require approval states, not hidden side effects.
- Users must know what changed, who changed it, and why.
- Draft, review, approved, posted, and archived states must be explicit where relevant.

## 2. Verity
- Reports must reconcile with source records.
- Totals, balances, and counts must be traceable.
- No silent data rewriting.
- No magic automation that cannot be inspected.

## 3. Reliability
- Core workflows must survive retries and partial failures.
- Emails, invoices, automations, and sync jobs need durable logs.
- Failed jobs must be visible, actionable, and recoverable.
- No critical business process should depend on a single fragile screen interaction.

## 4. Auditability
- Keep immutable event history for important objects.
- Record approvals, exports, imports, deletes, and state changes.
- Provide audit filters by user, time range, module, and entity.
- Support evidence export for finance, legal, and operations.

## 5. Permission Boundaries
- Role-based access control is mandatory.
- Row-level and module-level permissions are required for real companies.
- Sensitive fields need masking or restricted visibility.
- Delegation, impersonation, and admin override must be logged.

## 6. Templates
- Users need templates for invoices, quotes, emails, reports, support replies, board structures, and documents.
- Templates must support variables, defaults, versioning, and ownership.
- Template usage should be measurable.

## 7. Automation Safety
- Automations need triggers, conditions, branches, waits, retries, and exits.
- Every run must be logged.
- Every automation must be testable before activation.
- Human approval steps must be supported.

## 8. Reporting Truth
- Management reports must match operational data.
- Metrics need definitions, not vague labels.
- Scheduled reports must be reproducible from saved logic.
- Users should be able to drill down from summary to source record.

## 9. Integrations
- Real companies expect Google, Microsoft, Stripe, email providers, messaging, accounting export, and webhook support.
- Integration failures must surface clearly.
- Credentials and secrets need secure handling.

## 10. Navigation and Search
- The UI must provide a search-first way to find anything.
- After the search bar, the user should be able to jump to modules, records, actions, templates, reports, and recent items.
- Navigation cannot force users to memorize where everything lives.
- A command palette is useful, but business users need visible, searchable structure too.

## 11. Data Ownership
- Import and export must be built-in.
- Deletion must be controlled and reversible where required.
- Companies must be able to recover from mistakes.
- System-of-record data should never be trapped.

## 12. Multi-Company Reality
- The platform must support multiple subsidiaries, brands, regions, and business rules.
- Users need workspace-level and company-level isolation.
- Reporting and permissions must handle group structures.

## 13. Real-Life Usability
- Common tasks should not require excessive clicks.
- Screens must support bulk actions, filters, and saved views.
- Mobile access matters for managers, sales, and field teams.
- Fast search is not optional.

## Acceptance Test
A company should be able to say yes to the following:
- We can run our daily work here.
- We can trust the numbers.
- We can prove what happened.
- We can automate repeatable work.
- We can recover from mistakes.
- We do not need a second system for the same job.
