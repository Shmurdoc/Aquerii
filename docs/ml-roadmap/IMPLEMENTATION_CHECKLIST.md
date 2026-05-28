# Implementation Checklist — All bg-01 to bg-15 Features

**Last updated:** 2026-05-29

---

## Completed Features (bg-01 to bg-15)

| ID | Feature | Status | Files |
|----|---------|--------|-------|
| bg-02 | Multi-provider conferencing | ✅ DONE | JitsiMeeting.tsx, MeetingRoom.tsx, MeetingsPage.tsx |
| bg-03 | Project email addresses | ✅ DONE | InboundEmailController.php, ProjectEmailAddressController.php |
| bg-04 | Real-time chat system | ✅ DONE | ChatPage.tsx, chatHandler.ts, ChatController.php |
| bg-05 | KB auto-capture from resolved issues | ✅ DONE | GenerateKbFromTicket.php, TicketResolved event |
| bg-06 | Offline sync with conflict resolution | ✅ DONE | ConflictResolver.tsx, SyncStatus.tsx, MutationQueue.ts |
| bg-07 | Sentiment/burnout detection | ✅ DONE | BurnoutDetector.php, BurnoutWidget.tsx |
| bg-08 | Predictive project management (ML) | ✅ DONE | predictions.py, AIController.php |
| bg-10 | Meeting effectiveness + OKR cascade | ✅ DONE | GoalController.php, MeetingOutcomeController.php |
| bg-12 | Team capacity backend | ✅ DONE | TeamCapacityController.php, CapacityTab |
| bg-13 | My Day backend | ✅ DONE | MyDayPage.tsx, useMyDayTasks.ts |

---

## Remaining Features (NOT STARTED)

| ID | Feature | Priority | Complexity | Est. Time |
|----|---------|----------|------------|-----------|
| bg-01 | Voice commands (Whisper + WS streaming) | HIGH | HIGH | 2-3 weeks |
| bg-09 | Digital twin / what-if simulation | VERY HIGH | VERY HIGH | 4-6 weeks |
| bg-11 | AI-recommended automations | HIGH | MEDIUM | 1-2 weeks |
| bg-14 | Plugin system & marketplace | HIGH | HIGH | 3-4 weeks |
| bg-15 | Field-level permissions + SCIM 2.0 | HIGH | HIGH | 2-3 weeks |

---

## What Might Be Missing (From Past Chats)

### 1. Database Migrations to Run

After implementing bg-02 through bg-10, these migrations need to be run:

```bash
# Capacity
php artisan migrate --path=database/migrations/2026_05_28_000075_add_capacity_to_workspace_members.php

# KB auto-capture
php artisan migrate --path=database/migrations/2026_05_28_000076_add_ticket_id_to_support_kb_articles.php

# Chat
php artisan migrate --path=database/migrations/2026_05_28_000077_create_chat_tables.php

# Offline sync
php artisan migrate --path=database/migrations/2026_05_28_000078_create_sync_conflicts_table.php

# Burnout detection
php artisan migrate --path=database/migrations/2026_05_28_000079_create_team_activity_metrics_table.php

# Inbound email
php artisan migrate --path=database/migrations/2026_05_28_000080_create_inbound_email_tables.php

# Goals/OKRs
php artisan migrate --path=database/migrations/2026_05_28_000081_create_goals_tables.php
```

### 2. Docker Rebuild Required

After all changes, rebuild Docker:

```bash
docker compose build web api realtime ai
docker compose up -d
```

### 3. Environment Variables to Add

For bg-02 (Jitsi meetings):
```env
# Optional: Self-hosted Jitsi domain (default: meet.jit.si)
JITSI_DOMAIN=meet.jit.si
```

For bg-03 (Inbound email):
```env
# Optional: Inbound email domain
INBOUND_EMAIL_DOMAIN=inbound.aquerii.app
```

### 4. Frontend Routes to Verify

After rebuild, verify these routes work:
- `/chat` — Real-time chat
- `/meetings` — Meetings with Jitsi integration
- `/email` — Email inbox
- `/automation` — Automation rules
- `/support` — Support tickets + KB

### 5. API Endpoints to Test

```bash
# Capacity
GET /api/workspaces/{id}/hr/capacity

# Chat
GET /api/workspaces/{id}/chat/channels
POST /api/workspaces/{id}/chat/channels

# Offline sync
GET /api/workspaces/{id}/sync/conflicts

# Burnout
GET /api/workspaces/{id}/sentiment/team

# Inbound email
POST /api/email/inbound (webhook)

# Predictions
POST /api/ai/predictions/task-duration
POST /api/ai/predictions/delay-risk
POST /api/ai/predictions/okr-progress

# Goals
GET /api/workspaces/{id}/goals
POST /api/workspaces/{id}/goals

# Meeting outcomes
POST /api/workspaces/{id}/meetings/{meeting}/outcome
```

### 6. Background Jobs to Schedule

For bg-07 (Burnout detection), schedule the BurnoutDetector job:

```php
// app/Console/Kernel.php or routes/console.php
Schedule::job(new \App\Core\Jobs\BurnoutDetector($workspaceId))->daily();
```

### 7. Webhook Configuration

For bg-03 (Inbound email), configure your email provider:
- **Mailgun:** Set webhook URL to `https://your-domain.com/api/email/inbound`
- **SendGrid:** Set Inbound Parse webhook to `https://your-domain.com/api/email/inbound`
- **Postmark:** Set webhook to `https://your-domain.com/api/email/inbound`

### 8. Missing Frontend Pages

These pages exist in routes but may need implementation:
- `/settings/billing` — BillingTab component
- `/settings/notifications` — NotificationsTab component
- `/settings/team` — MembersTab component
- `/calendar` — CalendarPage component
- `/reports` — ReportsPage component

### 9. Testing Checklist

Before deploying, test:
- [ ] Create a meeting with Jitsi provider → join meeting
- [ ] Send inbound email → task created
- [ ] Resolve a ticket → KB article auto-generated
- [ ] Go offline → make changes → come online → conflicts detected
- [ ] Create a goal with key results → check progress
- [ ] Complete a meeting → rate effectiveness
- [ ] Check team sentiment dashboard
- [ ] Check team capacity view
- [ ] Send a chat message → real-time delivery

### 10. Documentation Updates

Update these docs after deployment:
- [ ] README.md — Add new features overview
- [ ] API documentation — Add new endpoints
- [ ] User guide — Add Jitsi meeting instructions
- [ ] Admin guide — Add capacity/sentiment dashboard docs
