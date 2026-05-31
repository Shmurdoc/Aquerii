# SALES - REAL-WORLD READINESS REVIEW

## Verdict
The sales module is too shallow for real order operations. Sales is not just a list of orders. It should handle quotes, approvals, fulfillment, returns, pricing control, and inventory handoff.

## What Exists Today
- Basic sales pages and navigation.
- Limited order-like workflow support.
- No evidence of a mature approval and fulfillment model.

## What Is Missing
- Quote-to-order conversion.
- Multi-step approval for discounting, credit, and large deals.
- Shipping, fulfillment, and delivery state management.
- Returns and RMA handling.
- Reservation of inventory on order confirmation.
- Sales tax, invoice handoff, and payment state sync.
- Margin controls, pricing rules, and customer-specific terms.

## Why It Fails in Real Companies
- A sales order must survive the handoff from sales to operations to finance.
- Without approvals, discounts leak margin.
- Without fulfillment state, customers and staff cannot see what is actually happening.

## Real-World Requirements
- Configurable pricing with overrides and guardrails.
- Draft, approved, fulfilled, and returned states.
- Credit checks and order holds.
- Partial shipments and split fulfillment.
- Sales reporting by rep, product, customer, and channel.

## Templates Needed
- Quote templates.
- Order templates.
- Discount approval forms.
- Return authorization templates.
- Shipping and fulfillment instruction templates.

## Automation Ideas
- Route high-value orders for approval.
- Reserve inventory automatically when orders are approved.
- Create fulfillment tasks on order release.
- Trigger invoice creation after shipment or approval.
- Block fulfillment on credit hold.
- Notify account managers when orders change.

## Fix Strategy
1. Add approval and pricing controls.
2. Connect orders to inventory and invoicing.
3. Add returns, split shipment, and status logic.
4. Add templates and operational notifications.
5. Add reports for margin and fulfillment performance.

## Done Means
- Sales can move from quote to cash without manual cleanup.
- Operations can trust order states.
- Finance can trust what was sold and when.
