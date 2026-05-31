# INTEGRATIONS ROADMAP - PRIORITY ORDER

If Aquerii does not connect to the systems businesses already use, it will remain isolated and secondary.

## Tier 1 - Must Have
- Stripe for payments, subscriptions, invoices, refunds, and payment links.
- Google Workspace for calendar, mail, contacts, and files.
- Microsoft 365 for calendar, mail, contacts, and files.
- Email delivery provider such as SendGrid, SES, or Mailgun.
- Webhooks for inbound and outbound event handling.
- OAuth and secure secret storage.

## Tier 2 - Core Business Systems
- Slack and Microsoft Teams for notifications and workflow alerts.
- QuickBooks or Xero export paths for finance handoff.
- Accounting-grade CSV and ledger export.
- DocuSign or equivalent e-signature provider.
- Twilio for SMS and phone workflows.
- WhatsApp or similar messaging channels where relevant.

## Tier 3 - Sales and Marketing
- HubSpot-style import and sync for CRM migration.
- LinkedIn and enrichment services for prospecting.
- Marketing email and broadcast providers.
- Landing page and form integrations.
- Attribution and analytics connectors.

## Tier 4 - Operations
- Shipping carriers and label services.
- Inventory and warehouse connectors.
- Procurement and supplier portals.
- BI tools such as Power BI, Looker, or Metabase exports.
- File storage and document signing backends.

## Tier 5 - Technical and Platform
- SSO providers such as Google, Microsoft, and SAML.
- SCIM or lifecycle provisioning where enterprise use requires it.
- Zapier, Make, and n8n-compatible webhooks.
- Observability tooling for errors and sync failures.
- Data warehouse exports.

## Integration Principles
- Every integration must show sync health.
- Every sync must log success, failure, retry, and last update time.
- Every credential must be rotatable.
- Every integration should support field mapping.
- Conflicts need a defined resolution policy.
- Import and export should never be an afterthought.

## Missing Today
- No serious ecosystem depth.
- Too many workflows are trapped inside the UI.
- There is no clear integration marketplace structure.
- There is no priority path for the integrations that actually unlock revenue.

## Priority Build Order
1. Stripe.
2. Google Workspace.
3. Microsoft 365.
4. Email delivery provider.
5. Webhooks.
6. Slack and Teams.
7. DocuSign.
8. Finance exports.
9. CRM migration tools.
10. BI and warehouse export paths.
