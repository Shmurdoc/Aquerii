# FlowOS — Pricing, Billing & Storage

**Version**: 1.0  
**Payment Providers**: Stripe (international) + PayFast (South Africa)  
**Billing Model**: Per-seat, monthly or annual (20% annual discount)

---

## 1. Pricing Plans

### Plan Comparison Matrix

| Feature | Free | Basic ($9) | Standard ($14) | Pro ($22) | Enterprise |
|---------|------|-----------|---------------|-----------|-----------|
| **Seats** | Up to 2 | Up to 10 | Unlimited | Unlimited | Unlimited |
| **Boards** | 3 | Unlimited | Unlimited | Unlimited | Unlimited |
| **Items per board** | 200 | 5,000 | Unlimited | Unlimited | Unlimited |
| **Storage / workspace** | 500 MB | 20 GB | 50 GB | 200 GB | Custom |
| **File size limit** | 25 MB | 250 MB | 1 GB | 5 GB | Custom |
| **Automations / month** | 50 | 250 | 2,500 | 25,000 | Unlimited |
| **AI credits / month** | 100 | 500 | 2,000 | 10,000 | Unlimited |
| **Views** | Kanban, Table | + Timeline | + Calendar, Workload | + Canvas, Gantt | All |
| **Guests** | 2 | 5 | 10 | 25 | Unlimited |
| **Dashboards** | 1 | 3 | Unlimited | Unlimited | Unlimited |
| **Integrations** | None | Basic | Standard | All | All + Custom |
| **GitHub integration** | No | No | No | Yes | Yes |
| **Time tracking** | No | No | Yes | Yes | Yes |
| **Reporting** | No | Basic | Advanced | Advanced | Custom |
| **2FA** | No | Yes | Yes | Yes | Yes |
| **SSO / SAML** | No | No | No | No | Yes |
| **White-label** | No | No | No | Yes | Yes |
| **Custom domain** | No | No | No | Yes | Yes |
| **API access** | No | Read-only | Full | Full | Full + Priority |
| **Priority support** | No | Email | Email | Live chat | Dedicated CSM |
| **SLA** | None | None | 99.5% | 99.9% | 99.99% |

### Pricing (per seat / per month, billed monthly)

| Plan | Monthly | Annual (per month) | Annual savings |
|------|---------|-------------------|---------------|
| Free | $0 | $0 | — |
| Basic | $9 | $7.20 | $21.60/seat/yr |
| Standard | $14 | $11.20 | $33.60/seat/yr |
| Pro | $22 | $17.60 | $52.80/seat/yr |
| Enterprise | Custom | Custom | Negotiated |

**Minimum charge**: $9 Basic = $9/month (even if only 1 seat). No free tier for paid plans that go below minimum.

---

## 2. Storage Tiers in Detail

### Storage Quota Enforcement

```
workspace.storage_quota_bytes  ← set by plan + add-ons
workspace.storage_used_bytes   ← live counter, updated on every upload/delete

Upload allowed if: storage_used + file_size <= storage_quota
Storage at 90%: warning banner + email to workspace owner
Storage at 100%: uploads blocked, 402 returned, upgrade prompt shown
```

### Storage Usage Breakdown (visible in Settings > Storage)

```
Total Storage: 48.3 GB / 50 GB (96% used)

By Type:
  File Attachments    32.1 GB  66%  ████████████░░
  Document Assets     9.2 GB   19%  ████░░░░░░░░░░
  Board Item Files    5.4 GB   11%  ██░░░░░░░░░░░░
  Avatars / Media     1.6 GB    3%  ░░░░░░░░░░░░░░

Top 5 Boards by storage:
  Design Assets Board      18 GB
  Marketing Materials       9 GB
  Product Screenshots       7 GB
```

### Plan Storage Allocation

| Plan | Workspace Storage | Per-Seat Storage |
|------|-----------------|-----------------|
| Free | 500 MB | — |
| Basic | 20 GB | — (workspace total) |
| Standard | 50 GB | — |
| Pro | 200 GB | — |
| Enterprise | Custom | Can split by team |

---

## 3. Add-Ons

### Storage Add-Ons

| Add-On | Price/month | Storage Added |
|--------|-----------|--------------|
| Storage Boost S | $5 | +10 GB |
| Storage Boost M | $15 | +50 GB |
| Storage Boost L | $40 | +200 GB |
| Storage Boost XL | $100 | +1 TB |

**Stacking**: Add-ons stack. Buy 3× Boost M = +150 GB extra.

### Automation Add-Ons

| Add-On | Price/month | Automations Added |
|--------|-----------|-----------------|
| Auto Boost S | $8 | +2,500 |
| Auto Boost M | $20 | +10,000 |
| Auto Boost L | $60 | +50,000 |

### AI Credits Add-Ons

| Add-On | Price/month | Credits Added |
|--------|-----------|--------------|
| AI Boost S | $10 | +2,000 |
| AI Boost M | $25 | +10,000 |
| AI Boost L | $75 | +50,000 |

### Guest Seat Add-Ons

| Add-On | Price/month | Guests Added |
|--------|-----------|-------------|
| Guest Pack S | $5 | +10 guests |
| Guest Pack M | $15 | +50 guests |

### White-Label Add-On (not on Pro by default — separate purchase)

| Feature | Price/month |
|---------|-----------|
| Custom domain | $20 |
| Custom logo + branding | Included with custom domain |
| Custom email sender | $10 |

---

## 4. Stripe Integration

### Stripe Products & Prices (create in Stripe dashboard)

```
Products:
  prod_flowos_basic       → FlowOS Basic
  prod_flowos_standard    → FlowOS Standard
  prod_flowos_pro         → FlowOS Pro
  prod_flowos_storage_s   → Storage Boost S
  prod_flowos_storage_m   → Storage Boost M
  ... (one product per add-on)

Prices:
  price_basic_monthly     → $9/seat/month (recurring, per_unit, metered by seat count)
  price_basic_annual      → $86.40/seat/year
  price_standard_monthly  → $14/seat/month
  ...
```

### Billing Flow

```
Company signs up → selects plan
    ↓
Stripe Customer created (customer_id stored in workspaces table)
    ↓
Stripe Subscription created with:
  - quantity = seat count
  - price = selected plan price
  - trial_period_days = 14 (Pro/Standard) or 0 (Basic/Free)
    ↓
Webhook: customer.subscription.created
    ↓
Laravel: activate workspace plan
    ↓
Monthly: Stripe generates invoice → charges card
    ↓
Webhook: invoice.payment_succeeded → extend subscription
Webhook: invoice.payment_failed → grace period (3 days) → downgrade to Free
```

### Seat Count Metering

```
When workspace owner adds member:
    seat_count++
    Stripe: update subscription quantity = seat_count

When member removed or deactivated:
    seat_count--
    Stripe: update subscription quantity (proration automatic)
```

### Trial Period

- Standard + Pro: **14-day free trial** (no credit card required — 7 days; card required to extend to 14)
- Basic: no trial (too low cost to justify)
- Trial limits: Pro limits apply during trial
- Trial expiry: email sequence (day 7, day 12, day 14) → auto-downgrade to Free if no payment

### Stripe Webhooks Handled

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Activate plan |
| `customer.subscription.updated` | Update plan/seat count |
| `customer.subscription.deleted` | Downgrade to Free |
| `invoice.payment_succeeded` | Extend subscription, send receipt |
| `invoice.payment_failed` | Start grace period, send warning |
| `customer.subscription.trial_will_end` | Send trial expiry email |
| `checkout.session.completed` | Handle one-time add-on purchase |
| `charge.dispute.created` | Alert Super Admin, flag workspace |

---

## 5. PayFast Integration (South Africa)

**Why PayFast**: South African companies can pay via EFT, Instant EFT, SnapScan, Masterpass, and card — without needing an international card.

**PayFast payment types supported**:
- Credit/debit card (Visa, Mastercard)
- Instant EFT (all major SA banks)
- SnapScan
- Masterpass
- PayFast recurring billing (subscriptions)

### PayFast Subscription Flow

```
SA customer selects plan
    ↓
Redirect to PayFast hosted checkout
    ↓
Customer selects payment method
    ↓
PayFast creates recurring payment agreement
    ↓
ITN (Instant Transaction Notification) webhook:
  payment_status = COMPLETE
    ↓
Laravel activates subscription (parallel to Stripe flow)
    ↓
Monthly: PayFast charges automatically
    ↓
ITN: COMPLETE → extend
ITN: FAILED → grace period → downgrade
```

### PayFast Webhooks Handled

| ITN `payment_status` | Action |
|---------------------|--------|
| `COMPLETE` | Activate / extend subscription |
| `FAILED` | Grace period + warning email |
| `CANCELLED` | Downgrade to Free |

### Currency

- Stripe: USD (default) + GBP, EUR auto-converted
- PayFast: ZAR only
- Plan prices in ZAR (set separately):

| Plan | ZAR/seat/month |
|------|---------------|
| Basic | R165 |
| Standard | R255 |
| Pro | R400 |

---

## 6. Billing Portal (Self-Service)

**Accessible at Settings > Billing**:
- Current plan + seat count + next billing date
- Storage usage breakdown
- Automation usage (used / quota)
- AI credits usage (used / quota)
- Active add-ons + manage (add/remove)
- Upgrade / downgrade plan
- View and download invoices
- Update payment method (Stripe hosted portal)
- Cancel subscription (with churn survey)

---

## 7. Upgrade/Downgrade Logic

### Upgrade (immediate)
- New plan features unlock immediately
- Storage quota increases immediately
- Stripe/PayFast prorates the charge for remaining days

### Downgrade (end of billing period)
- Features remain until current period ends
- At period end: plan switches; excess items/storage NOT deleted (grace period: 30 days)
- After 30-day grace: items over limit become read-only; storage over limit blocks new uploads

### Plan Enforcement Rules

| Resource | At 90% | At 100% |
|---------|--------|---------|
| Storage | Warning banner + email | Block uploads, 402 returned |
| Automations | Email warning | Automations paused + banner |
| AI Credits | In-app banner | AI features disabled + banner |
| Seats | Warn owner | Block new member invites |
| Guests | Warn owner | Block new guest invites |

---

*Owner: Billing Lead*  
*Cross-reference: SUPER_ADMIN.md (revenue metrics), DATABASE_SCHEMA.md (billing tables)*
