# 11 — Settings & Workspace

## Route

```
/settings → SettingsPage with tab navigation
```

## Layout

Tab bar directly below page title. Each tab renders its own section within the same scrollable container. Active tab is persisted in URL as `?tab=general|profile|team|billing|security|notifications`.

```
┌──────────────────────────────────────────────────────────────┐
│  Settings                                                     │
│                                                               │
│  [General] [Profile] [Team] [Billing] [Security] [Notify]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  <Active Tab Content>                                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Shared Patterns

### Zod Validation
Every form uses a Zod schema. Validation runs on blur and on submit. Errors display inline below the field in red 12px text with a red border on the field. Submit button disabled while form is invalid or submitting.

### Loading State
Form fields show skeleton pulses on initial data load. Mutation buttons show a spinner and disable. 300ms minimum spinner duration to prevent flicker on fast APIs.

### Toast Feedback
- Success: green checkmark + "Changes saved" (auto-dismiss 4s).
- Error: red X + error message from backend (auto-dismiss 8s).
- Toast stack from top-right, max 3 visible.

### Form Section Card
Each logical group of settings is wrapped in a white card with subtle border, padded 24px, with a section header in 16px semibold. Cards stack vertically with 16px gap.

---

## General Tab

Backend: PUT /api/settings/workspace — fully implemented.

### Fields
- **Workspace Name** — text input, max 100 chars, required.
- **Workspace Icon** — emoji picker (grid of ~300 emoji) or custom upload (square, max 2MB, PNG/JPEG). Preview circle 48px.
- **Workspace Color** — color picker with 12 preset swatches + custom hex input. Color preview bar across top of card.
- **Timezone** — searchable dropdown of IANA timezone list. Default: browser-detect.
- **Date Format** — radio group: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD.
- **Number Format** — radio group: 1,000.00 / 1.000,00 / 1 000,00.

### Behavior
- Auto-save is NOT used. Explicit "Save Changes" button at bottom of card.
- Unsaved changes warning on tab navigation: confirm dialog "You have unsaved changes. Discard?"
- On save: PUT /api/settings/workspace with full payload. Workspace name + icon + color updated in global AppShell immediately via context update.

---

## Profile Tab

Backend: PUT /api/settings/profile, PUT /api/settings/password — both fully implemented.

### Fields
- **Avatar** — upload area (circular crop, drag-drop or click). Preview replaces current avatar immediately. Max 5MB, PNG/JPEG/WebP.
- **Name** — text input, required, max 100 chars.
- **Email** — email input, required. Changing email triggers verification flow: PUT /api/settings/profile with new email→backend sends confirmation email→user clicks link→email updated.
- **Password Change** — separate card, three fields:
  - Current Password (required)
  - New Password (Zod: min 8, uppercase + lowercase + number + special)
  - Confirm Password (must match new)
  - Submit: PUT /api/settings/password. On success: clear fields, show toast. On error: "Current password is incorrect" shown inline on current password field.

---

## Team Tab

Backend: GET /api/workspaces/{id}/members, DELETE .../members/{userId}, PUT .../members/{userId}/role — fully implemented. No invite endpoint exists — see callouts.

### Member List Table
```
┌──────────┬──────────┬──────────────┬──────────┬───────────┐
│  Member  │  Email   │  Role        │  Joined  │  Actions  │
├──────────┼──────────┼──────────────┼──────────┼───────────┤
│  [Avatar]│  a@b.com │  Owner ●     │  Jan 1   │  —        │
│  [Avatar]│  c@b.com │  Admin       │  Feb 3   │  [Edit ▼] │
│  [Avatar]│  d@b.com │  Manager     │  Mar 10  │  [Edit ▼] │
└──────────┴──────────┴──────────────┴──────────┴───────────┘
```

- Avatar (32px), Name, Email, Role (badge, color-coded), Joined Date.
- Owner row has "Owner" badge + no actions (cannot change owner role or remove owner).
- Actions dropdown: Change Role, Remove.
- **Role options**: owner, admin, manager, member, viewer.
- **Change Role**: dropdown selection triggers PUT /api/workspaces/{id}/members/{userId}/role immediately (no confirm). Toast on success/error.
- **Remove Member**: confirm dialog "Remove [name] from workspace?" warning that they'll lose access. Red destructive button. DELETE on confirm.

### Invite Form
- Email input + Role dropdown + "Send Invite" button.
- **BRUTAL CALL-OUT: No backend invite endpoint exists.** The design assumes POST /api/workspaces/{id}/invites. Backend only has member CRUD. This feature requires backend implementation. Frontend can call the member add endpoint directly if the user already has an account, or a new invite flow must be built.
- Temporary fallback: add member by email if account exists. Otherwise grey out button with "Backend invite system not implemented" tooltip.

---

## Billing Tab

Backend: POST /api/settings/billing/checkout, POST /api/settings/billing/portal, PUT /api/settings/subscription/cancel — all fully implemented.

### Layout
```
┌──────────────────────────────────────────────────────────────┐
│  Current Plan                                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Plan: Professional                  [Manage on Stripe] │  │
│  │  Status: ● Active                                      │  │
│  │  Next billing: May 15, 2026 — $29/mo                   │  │
│  │  [Upgrade] [Cancel Subscription]                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Invoice History (placeholder — no backend endpoint exists)   │
│  ...                                                          │
└──────────────────────────────────────────────────────────────┘
```

- **Current Plan display**: fetched from subscription object (returned by whichever endpoint provides workspace settings — verify backend actually returns subscription info in workspace response; if not, frontend needs a new GET subscription endpoint).
- **Manage on Stripe** button: POST /api/settings/billing/portal → redirect to Stripe Customer Portal URL.
- **Upgrade**: POST /api/settings/billing/checkout → redirect to Stripe Checkout session.
- **Cancel Subscription**: PUT /api/settings/subscription/cancel with confirmation dialog ("Your plan will remain active until end of billing period"). Toast on success.

**BRUTAL CALL-OUT: No GET endpoint for subscription/plan data.** The backend only provides mutation endpoints (checkout, portal, cancel). There is no GET /api/settings/billing/subscription. Frontend will need to either: (a) embed subscription data in the workspace response, (b) create a new GET endpoint, or (c) store it client-side after the Stripe redirect returns.

---

## Security Tab

Backend: GET /api/settings/sessions, DELETE /api/settings/sessions/{id}, GET /api/settings/audit-logs — all fully implemented. 2FA is NOT in backend — see callouts.

### Sections

#### Active Sessions
```
┌──────────┬──────────────┬────────────┬──────────┬────────────┐
│  Device  │  IP Address  │  Last Seen │  Current │  Actions   │
├──────────┼──────────────┼────────────┼──────────┼────────────┤
│  Chrome  │  192.168.1.1 │  Now       │  ● Yes   │  —         │
│  Firefox │  10.0.0.1    │  2h ago    │          │  [Revoke]  │
└──────────┴──────────────┴────────────┴──────────┴────────────┘
```

- Table: Device/Browser (user agent parsed to friendly name), IP, Last Seen, Current session indicator, Actions.
- Current session row highlighted in green, no revoke action.
- Revoke button triggers confirm dialog. DELETE /api/settings/sessions/{id} on confirm. Row fades out.

#### Two-Factor Authentication
- **BRUTAL CALL-OUT: No 2FA endpoints exist in backend.** The design below is aspirational.
- Display: "Two-Factor Authentication" card with toggle.
- Off state: "Secure your account with 2FA" + "Set up" button.
- On state: "2FA is enabled" with "Disable" button (requires confirmation + password).
- Setup flow: QR code display → verify code input → enable. All require new backend endpoints.

#### Audit Logs
```
┌──────────┬──────────────────────────────────────┬────────────┐
│  Time    │  Action                              │  User      │
│  05/01   │  Updated workspace settings          │  user@...  │
│  05/01   │  Deleted invoice INV-003             │  user@...  │
│  04/30   │  Changed role: alice → admin         │  user@...  │
└──────────┴──────────────────────────────────────┴────────────┘
```

- GET /api/settings/audit-logs returns paginated list.
- Table: Timestamp, Action description, Actor (user email/name), IP (expandable detail row).
- Filter by date range, action type (dropdown: all/workspace/billing/user/member).
- Pagination: 50 per page.
- Empty state: "No audit logs yet" — only appears if truly zero (not just filtered).
- Loading: skeleton rows.

---

## Notifications Tab

Backend: GET/PUT /api/settings/notification-preferences — fully implemented.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Notification Preferences                                     │
│                                                               │
│  Categories:                                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Category          │  Email │  In-App  │  Push         │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  Mentions          │  [✓]   │   [✓]    │  [✓]         │  │
│  │  Assignments       │  [✓]   │   [✓]    │  [ ]         │  │
│  │  Status Changes    │  [ ]   │   [✓]    │  [ ]         │  │
│  │  System Alerts     │  [✓]   │   [✓]    │  [✓]         │  │
│  │  Comment Replies   │  [✓]   │   [✓]    │  [ ]         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  [Save Preferences]                                           │
└──────────────────────────────────────────────────────────────┘
```

- Grid: rows = notification categories, columns = delivery channels (Email, In-App, Push).
- Each cell is a toggle switch.
- Categories hardcoded: mentions, assignments, status_changes, system_alerts, comment_replies, new_features.
- Email toggle greyed out if user has no verified email. Tooltip explains.
- Save: PUT /api/settings/notification-preferences with full preference map.
- No auto-save. Explicit save only.

---

## BRUTAL CALL-OUTS — Full List

| Feature | Status | Action Required |
|---------|--------|-----------------|
| Workspace settings (name, icon, color) | ✅ Full backend | None |
| Profile update | ✅ Full backend | None |
| Password change | ✅ Full backend | None |
| Member list, role change, remove | ✅ Full backend | None |
| **Invite members** | ❌ **No endpoint** | Needs new backend or use member add |
| Billing checkout, portal, cancel | ✅ Full backend | None |
| **GET subscription data** | ❌ **No endpoint** | Needs backend or embed in workspace |
| Active sessions list, revoke | ✅ Full backend | None |
| **2FA setup/challenge** | ❌ **No endpoints** | Needs full backend feature |
| Audit logs | ✅ Full backend | None |
| Notification preferences | ✅ Full backend | None |
| **Avatar upload** | **Unclear** | PUT /api/settings/profile accepts avatar? Needs confirmation. If not, file upload endpoint needed. |

---

## Build Status (v0.1 — May 28, 2026)

All 6 settings tabs upgraded to use the shared UI component library:

| Tab | File | Status | Changes |
|-----|------|--------|---------|
| General | `components/settings/GeneralTab.tsx` | ✅ Upgraded | Input/Button/Select components, color swatch picker, Avatar for logo |
| Profile | `components/settings/ProfileTab.tsx` | ✅ Upgraded | Input/Button/Avatar/Badge components, avatar upload with preview |
| Team | `components/settings/MembersTab.tsx` | ✅ Upgraded | Button/Input/Select/Modal/Avatar/Badge, confirm dialog, invite link copy |
| Billing | `components/settings/BillingTab.tsx` | ✅ Upgraded | Button/Badge components, fixed PlanLimits type error |
| Security | `components/settings/SecurityTab.tsx` | ✅ Upgraded | Tabs/Input/Button/Badge components, password strength, session detail, audit log search |
| Notifications | `components/settings/NotificationsTab.tsx` | ✅ Upgraded | Toggle/Card/Select/Input components, quiet hours, delivery method |
