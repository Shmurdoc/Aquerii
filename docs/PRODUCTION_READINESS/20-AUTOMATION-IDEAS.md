# AUTOMATION IDEAS - BUSINESS BANK

This file is intentionally specific. The goal is to stop thinking about automation as a vague feature and start treating it as operational leverage.

## CRM Automations
1. Auto-create a follow-up task when a deal stage changes.
2. Notify sales leadership when a high-value deal goes stale.
3. Reassign deals when ownership is inactive.
4. Push won deals into onboarding.
5. Flag duplicate companies and contacts.
6. Create tasks when a forecast slips.
7. Trigger win/loss analysis requests after deal close.
8. Populate account plans from template.

## Lead Automations
9. Score leads from form fields, source, and activity.
10. Route leads by territory, product, or round-robin.
11. Suppress spam and low-quality submissions.
12. Start nurture sequences automatically.
13. Alert SDRs on high-intent behavior.
14. Escalate uncontacted leads after SLA breach.
15. Merge duplicate leads before assignment.
16. Convert qualified leads to opportunity tasks.

## Email Automations
17. Send a welcome email after signup.
18. Send reminders for abandoned quotes.
19. Trigger invoice delivery after approval.
20. Stop sequences when a reply is received.
21. Pause campaigns on bounce spikes.
22. Unsubscribe contacts automatically on compliance events.
23. Route shared inbox messages by intent.
24. Create support tickets from flagged emails.

## Invoicing Automations
25. Generate recurring invoices on schedule.
26. Send payment reminders before and after due dates.
27. Escalate overdue invoices to collections.
28. Create credit notes for approved refunds.
29. Flag invoices that need manual tax review.
30. Notify finance on payment failures.
31. Sync paid invoices into accounting.
32. Lock invoice edits after posting.

## Sales Automations
33. Reserve inventory when a sales order is approved.
34. Route large orders for approval.
35. Generate shipping tasks on fulfillment readiness.
36. Trigger return workflows on RMA creation.
37. Auto-apply approved discounts only.
38. Block shipment when credit checks fail.
39. Notify account managers on order exceptions.
40. Create handoff tasks for operations.

## Purchasing Automations
41. Generate purchase orders from reorder points.
42. Route POs for approval by amount.
43. Alert buyers on delayed supplier responses.
44. Match receipts against POs automatically.
45. Flag three-way match exceptions.
46. Notify finance when supplier terms change.
47. Create replenishment tasks from low stock.
48. Escalate overdue vendor confirmations.

## Accounting Automations
49. Post approved invoices into the ledger.
50. Match bank transactions to open items.
51. Flag reconciliation breaks.
52. Freeze closed periods automatically.
53. Send monthly close checklists.
54. Alert on abnormal journal entries.
55. Generate tax review queues.
56. Distribute financial statements on schedule.

## Inventory Automations
57. Reorder stock at threshold.
58. Alert on negative inventory.
59. Auto-create transfer orders for stock imbalances.
60. Generate cycle count tasks.
61. Flag serial and lot mismatches.
62. Notify on shrinkage anomalies.
63. Reserve stock for confirmed orders.
64. Recalculate warehouse risk after demand changes.

## Support Automations
65. Assign tickets by skill, language, or priority.
66. Escalate SLA breaches.
67. Suggest knowledge base articles before agent reply.
68. Auto-close resolved tickets after delay.
69. Trigger CSAT surveys after resolution.
70. Route major incidents to leadership.
71. Create bug tickets from recurring customer issues.
72. Pull account context into the ticket view.

## Marketing and Reporting Automations
73. Launch campaigns on segment membership change.
74. Pause campaigns when consent is withdrawn.
75. Generate weekly performance reports.
76. Send dashboard snapshots to executives.
77. Alert on campaign conversion drops.
78. Refresh report caches on schedule.
79. Rebuild scenarios when assumptions change.
80. Trigger budget warnings when thresholds are crossed.

## Platform Automations
81. Log every automation run with inputs and outputs.
82. Retry transient failures with backoff.
83. Send alerts when workflows exceed runtime limits.
84. Require approval before destructive actions.
85. Keep version history for automation edits.
86. Test workflows against sample data before activation.
87. Pause automations on integration outages.
88. Queue work during temporary provider failures.

## Missing Today
- The system needs a real execution engine, not just workflow-shaped configuration.
- Branching, timers, retries, and idempotency must be native.
- Every automation needs observability, replay, and rollback support.
- Human approval steps are mandatory for real companies.

## Rule of Thumb
If a business process can be repeated twice, it should be automatable. If it can lose money when it fails, it needs logs, retries, and approvals.
