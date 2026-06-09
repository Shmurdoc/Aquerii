# SaaS Monetization & Subscription Architecture

## Core Principle
Every feature MUST be a grouped add-on that the creator can arrange into subscription plans. No module is "free" by default — the creator decides pricing.

## Plan → Feature Group Mapping

```
Subscription Plan
├── Core Platform (always enabled)
│   ├── Authentication (login, register, MFA, OAuth)
│   ├── Workspace management
│   ├── Member management
│   └── Basic profile/settings
│
├── Module Group: Project Management
│   ├── Boards (Kanban, Table, Calendar, Whiteboard)
│   ├── Items (tasks, priorities, due dates)
│   ├── Comments & activity feed
│   └── File attachments
│
├── Module Group: CRM
│   ├── Pipelines & stages
│   ├── Deals & scoring
│   ├── Contacts & companies
│   ├── Sequences
│   ├── Call logging
│   ├── Forecasting & quotas
│   └── Reports & analytics
│
├── Module Group: Documents
│   ├── Rich text documents (BlockNote)
│   ├── Scanned document AI
│   ├── Document templates
│   └── Version history
│
├── Module Group: ERP / Finance
│   ├── Invoicing
│   ├── Purchasing
│   ├── Sales orders
│   ├── Inventory management
│   ├── Accounting (chart of accounts, journal entries)
│   └── PDF generation
│
├── Module Group: AI
│   ├── Chat assistant
│   ├── Document analysis & auto-tagging
│   ├── Deal scoring & churn prediction
│   ├── Email composition & summarization
│   └── Anomaly detection
│
├── Module Group: Email
│   ├── IMAP account setup
│   ├── Threaded email view
│   ├── AI email suggestions
│   └── Multiple accounts
│
├── Module Group: Support
│   ├── Ticket management
│   ├── SLA policies
│   ├── Knowledge base
│   └── Multi-channel (email, chat)
│
├── Module Group: Marketing
│   ├── Campaign management
│   ├── Email templates
│   ├── Segment builder
│   └── Campaign analytics
│
├── Module Group: Automation
│   ├── Visual rule builder
│   ├── Trigger → action engine
│   ├── Templates
│   └── Run history
│
└── Module Group: HR & Team
    ├── Employee directory
    ├── Attendance tracking
    ├── Leave management
    ├── Expense claims
    └── Org chart
```

## Subscription Limits Per Module

Not just on/off — each module has granular limits:

| Limit Type | Free | Growth | Business | Enterprise |
|-----------|------|--------|----------|------------|
| Workspaces | 1 | 3 | 10 | Unlimited |
| Seats | 3 | 15 | 100 | Unlimited |
| Boards | 1 | 50 | Unlimited | Unlimited |
| AI Credits/mo | 0 | 500 | 5000 | Custom |
| Automation Rules | 0 | 10 | Unlimited | Unlimited |
| Email Accounts | 0 | 1 | 5 | Unlimited |
| Storage (GB) | 0.1 | 10 | 100 | Custom |
| CRM Pipelines | 0 | 2 | 10 | Unlimited |
| Invoice/mo | 0 | 50 | 500 | Unlimited |
| API Rate Limit | 30/min | 60/min | 300/min | Custom |

## Implementation Tasks

### 5.1 — Plan definition in code
- `app/Core/Enums/SubscriptionPlan.php` with limits array
- Each limit checked in controllers, returned in API responses
- Frontend: limits shown in settings, upgrade prompts

### 5.2 — Usage tracking
- `app/Core/Services/UsageService.php`
- Tracks: storage used, AI credits consumed, invoices created, etc.
- Stored in `workspace_usage` table
- Reset monthly for AI credits

### 5.3 — Upgrade prompts
- When limit hit: return `429 LIMIT_EXCEEDED` + upgrade URL
- Frontend: inline upgrade CTA in sidebar, modals
- Upgrade URL → Stripe checkout with plan ID

### 5.4 — Stripe product sync
- `php artisan stripe:sync-plans` command
- Creates/updates Stripe products and prices
- Maps to SubscriptionPlan enum
- Handles monthly/annual billing periods

### 5.5 — Dunning & billing automation
- Failed payment → downgrade after 3 days → suspension after 7 days
- Email notifications at each step
- Grace period: workspace is read-only, not deleted

## Commit Strategy
1. `feat(billing): SubscriptionPlan enum with granular limits`
2. `feat(billing): UsageService and workspace_usage tracking`
3. `feat(billing): limit enforcement in controllers`
4. `feat(billing): upgrade prompts in frontend`
5. `feat(billing): Stripe product sync command`
6. `feat(billing): dunning automation for failed payments`
