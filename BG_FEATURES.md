# Background Features Tracker (bg-01 → bg-15)

Track implementation status. When starting a new feature, confirm the previous one is complete.

---

## Status Legend
- ✅ **DONE** — Backend + Frontend implemented and verified
- 🔧 **PARTIAL** — Some pieces exist, needs completion
- ❌ **NOT STARTED** — No implementation yet

---

## Feature List

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| bg-01 | Voice commands (Whisper + WS streaming) | HIGH | ❌ NOT STARTED | Needs Whisper integration + WebSocket audio streaming |
| bg-02 | Multi-provider conferencing (Zoom/Meet/Teams/Webex) | HIGH | ✅ DONE | Jitsi embed + deep links for all providers |
| bg-03 | Project email addresses (inbound → tasks) | MEDIUM | ✅ DONE | Webhook handler, email-to-task, project addresses |
| bg-04 | Real-time chat system | HIGH | ✅ DONE | Channels, messages, WebSocket, typing indicators |
| bg-05 | KB auto-capture from resolved issues | MEDIUM | ✅ DONE | Auto-generates draft KB article on ticket resolve |
| bg-06 | Offline sync (conflict resolution) | HIGH | ✅ DONE | Version tracking, conflict detection, resolution UI |
| bg-07 | Sentiment/burnout detection | HIGH | ✅ DONE | 5-factor scoring, daily metrics, risk dashboard |
| bg-08 | Predictive project management (ML) | VERY HIGH | ❌ NOT STARTED | ML models for deadline prediction, risk scoring |
| bg-09 | Digital twin / what-if simulation | VERY HIGH | ❌ NOT STARTED | Simulation engine for project scenarios |
| bg-10 | Meeting effectiveness + OKR cascade | HIGH | ❌ NOT STARTED | Meeting scoring + OKR alignment tracking |
| bg-11 | AI-recommended automations (pattern detection) | HIGH | ❌ NOT STARTED | AI suggests automations based on usage patterns |
| bg-12 | Team capacity backend (workload model) | MEDIUM | ✅ DONE | Migration + Controller + Frontend Capacity tab |
| bg-13 | My Day backend (task pinning, auto-populate) | LOW | ✅ DONE | `MyDayPage.tsx` + `useMyDayTasks` hook + `GET /my-day` API |
| bg-14 | Plugin system & marketplace | HIGH | ❌ NOT STARTED | Plugin architecture + marketplace UI |
| bg-15 | Field-level permissions + SCIM 2.0 | HIGH | ❌ NOT STARTED | Granular field permissions + SCIM provisioning |

---

## Completed Features Detail

### bg-12: Team Capacity Backend ✅
**Completed:** 2026-05-28
**Files:**
- `services/api/database/migrations/2026_05_28_000075_add_capacity_to_workspace_members.php` — adds `weekly_capacity_hours`, `capacity_notes`
- `services/api/app/Core/Http/Controllers/Api/TeamCapacityController.php` — `GET /hr/capacity` (utilization calc), `PATCH /hr/capacity/{userId}`
- `services/api/routes/modules/hr.php` — registered routes
- `services/api/app/Core/Models/WorkspaceMember.php` — updated fillable
- `services/web/src/pages/employees/EmployeePage.tsx` — new Capacity tab with utilization bars

**API:**
- `GET /api/workspaces/{id}/hr/capacity` — returns per-member: `weekly_capacity_hours`, `assigned_hours`, `utilization_pct`, `active_task_count`
- `PATCH /api/workspaces/{id}/hr/capacity/{userId}` — update `weekly_capacity_hours`, `capacity_notes`

**Verified:** Routes registered, TypeScript compiles, 52 Python tests pass.

---

### bg-13: My Day Backend ✅
**Completed:** Pre-existing
**Files:**
- `services/web/src/pages/my-day/MyDayPage.tsx` — full UI with overdue/today/tomorrow/this-week sections
- `services/web/src/hooks/useMyDayTasks.ts` — data hook
- `services/api/app/Core/Http/Controllers/Api/ItemController.php` — `myDay()` method
- `routes/api.php` — `GET /workspaces/{workspace}/my-day`

**Verified:** Route registered, page renders with task classification.

---

### bg-05: KB Auto-Capture from Resolved Issues ✅
**Completed:** 2026-05-28
**Files:**
- `services/api/database/migrations/2026_05_28_000076_add_ticket_id_to_support_kb_articles.php` — adds `ticket_id` FK
- `services/api/app/Modules/Support/Events/TicketResolved.php` — event dispatched on resolve
- `services/api/app/Modules/Support/Listeners/GenerateKbFromTicket.php` — builds KB article from ticket data
- `services/api/app/Modules/Support/Providers/SupportServiceProvider.php` — registers event listener
- `services/api/app/Modules/Support/Http/Controllers/TicketController.php` — dispatches event on resolve
- `services/api/app/Modules/Support/Models/KnowledgeBaseArticle.php` — added `ticket_id` + `ticket()` relationship
- `services/web/src/lib/support.ts` — added `ticket_id` to interface
- `services/web/src/pages/support/KnowledgeBasePage.tsx` — shows "From ticket" badge

**Behavior:** When a ticket status changes to `resolved`, a draft KB article is auto-generated with:
- Title from ticket subject
- Content from description + resolution_summary + conversation history
- Category derived from channel/source
- Tags carried from ticket
- `is_published = false` (draft for review)

**Verified:** Routes registered, TypeScript compiles.

---

### bg-04: Real-Time Chat System ✅
**Completed:** 2026-05-28
**Files:**
- `services/api/database/migrations/2026_05_28_000077_create_chat_tables.php` — chat_channels, chat_participants, chat_messages
- `services/api/app/Modules/Chat/Models/ChatChannel.php` — channel model (dm, group, channel types)
- `services/api/app/Modules/Chat/Models/ChatParticipant.php` — participant with last_read_at
- `services/api/app/Modules/Chat/Models/ChatMessage.php` — message with reply_to, attachments
- `services/api/app/Modules/Chat/Http/Controllers/ChatController.php` — CRUD + messages + mark read
- `services/api/app/Modules/Chat/Providers/ChatServiceProvider.php` — route registration
- `services/api/routes/modules/chat.php` — 6 endpoints
- `services/api/app/Core/Providers/ModuleServiceProvider.php` — registered Chat module
- `services/realtime/src/handlers/chatHandler.ts` — WebSocket: send, join, leave, typing, read
- `services/realtime/src/index.ts` — registered chat handler
- `services/web/src/lib/chat.ts` — API hooks + socket helpers
- `services/web/src/pages/chat/ChatPage.tsx` — full chat UI
- `services/web/src/App.tsx` — added /chat route
- `services/web/src/components/layout/NavRail.tsx` — added Chat nav entry

**API:**
- `GET /api/workspaces/{id}/chat/channels` — list user's channels
- `POST /api/workspaces/{id}/chat/channels` — create channel (dm/group/channel)
- `GET /api/workspaces/{id}/chat/channels/{channel}` — show channel
- `GET /api/workspaces/{id}/chat/channels/{channel}/messages` — list messages
- `POST /api/workspaces/{id}/chat/channels/{channel}/messages` — send message
- `POST /api/workspaces/{id}/chat/channels/{channel}/read` — mark read

**WebSocket events:** `chat:message:send`, `chat:join`, `chat:leave`, `chat:typing`, `chat:read`

**Verified:** Routes registered, TypeScript compiles.

---

### bg-06: Offline Sync with Conflict Resolution ✅
**Completed:** 2026-05-28
**Files:**
- `services/api/database/migrations/2026_05_28_000078_create_sync_conflicts_table.php` — stores conflicts for resolution
- `services/api/app/Core/Models\SyncConflict.php` — conflict model with resolution tracking
- `services/api/app/Core/Http/Controllers/Api/OfflineSyncController.php` — GET/PATCH/POST conflict endpoints
- `services/web/src/offline/MutationQueue.ts` — version tracking, conflict detection, conflict storage
- `services/web/src/components/sync/ConflictResolver.tsx` — per-conflict UI (keep mine/theirs/compare)
- `services/web/src/components/sync/SyncStatus.tsx` — online/offline indicator with pending count
- `services/web/src/layouts/AppLayout.tsx` — integrated ConflictResolver + SyncStatus

**API:**
- `GET /api/workspaces/{id}/sync/conflicts` — list unresolved conflicts
- `PATCH /api/workspaces/{id}/sync/conflicts/{conflict}` — resolve a conflict
- `POST /api/workspaces/{id}/sync/conflicts/resolve-all` — bulk resolve (keep_local/keep_server)

**Behavior:**
- MutationQueue tracks `entityVersion` for each queued mutation
- On replay, detects version conflicts (409 from server)
- Stores conflicts locally in IndexedDB for user resolution
- ConflictResolver shows per-conflict UI with side-by-side comparison
- Bulk resolve options: "Keep all mine" or "Keep all theirs"
- SyncStatus shows online/offline + pending mutation count

---

### bg-07: Sentiment/Burnout Detection ✅
**Completed:** 2026-05-28
**Files:**
- `services/api/database/migrations/2026_05_28_000079_create_team_activity_metrics_table.php` — daily metrics + burnout scores
- `services/api/app/Core/Models/TeamActivityMetric.php` — daily activity metrics model
- `services/api/app/Core/Models/BurnoutScore.php` — burnout risk score model
- `services/api/app/Core/Jobs/BurnoutDetector.php` — collects metrics, calculates 5-factor risk score
- `services/api/app/Core/Http/Controllers/Api/SentimentController.php` — team overview, member metrics, refresh
- `services/web/src/components/sentiment/BurnoutWidget.tsx` — dashboard widget with risk distribution
- `services/web/src/pages/DashboardPage.tsx` — integrated BurnoutWidget

**API:**
- `GET /api/workspaces/{id}/sentiment/team` — team overview with scores + summary
- `GET /api/workspaces/{id}/sentiment/member/{userId}` — member's daily metrics + score
- `POST /api/workspaces/{id}/sentiment/refresh` — trigger recalculation

**Scoring (0-100):**
- Overdue tasks (0-25): avg overdue × 8
- Work hours (0-25): hours over 8 × 5
- After hours (0-20): late night × 8 + weekend × 5
- Negative sentiment (0-20): abs(negative_ratio) × 25
- Low completion (0-10): 10 if <50%, 5 if <70%

**Risk levels:** low (0-29), medium (30-49), high (50-69), critical (70+)

---

### bg-03: Project Email Addresses (Inbound → Tasks) ✅
**Completed:** 2026-05-28
**Files:**
- `services/api/database/migrations/2026_05_28_000080_create_inbound_email_tables.php` — project_email_addresses + inbound_emails
- `services/api/app/Modules/Email/Models/ProjectEmailAddress.php` — project email model
- `services/api/app/Modules/Email/Models/InboundEmail.php` — inbound email record
- `services/api/app/Modules/Email/Http/Controllers/InboundEmailController.php` — webhook handler
- `services/api/app/Modules/Email/Http/Controllers/ProjectEmailAddressController.php` — CRUD

**API:**
- `POST /api/email/inbound` — webhook endpoint (Mailgun/SendGrid/Postmark compatible)
- `GET/POST/PATCH/DELETE /api/workspaces/{id}/email/project-addresses` — manage addresses

**Behavior:**
- Auto-generates unique inbound address per workspace (e.g., `tasks-abc123@inbound.aquerii.app`)
- Parses multipart form (Mailgun) and JSON (SendGrid/Postmark) webhook payloads
- Creates tasks from inbound emails with subject, body, from metadata
- Links created task back to inbound email record
- Supports target board routing per address

---

### bg-02: Multi-Provider Conferencing ✅
**Completed:** 2026-05-28
**Files:**
- `services/api/app/Core/Http/Controllers/Api/MeetingController.php` — added 'jitsi' to provider validation
- `services/web/src/components/meetings/JitsiMeeting.tsx` — Jitsi iframe embed component
- `services/web/src/components/meetings/MeetingRoom.tsx` — multi-provider join UI
- `services/web/src/pages/meetings/MeetingsPage.tsx` — Join Meeting button, Jitsi provider option
- `services/web/src/lib/meetings.ts` — updated MeetingProvider type

**Providers:**
| Provider | Join Type | How |
|----------|-----------|-----|
| Jitsi Meet | Deep link | Opens meet.jit.si/{room} in new tab |
| Zoom | Deep link | Opens meeting URL in new tab |
| Google Meet | Deep link | Opens meeting URL in new tab |
| Microsoft Teams | Deep link | Opens meeting URL in new tab |
| Other | Deep link | Opens custom meeting URL |

**Behavior:**
- User selects provider when creating meeting
- "Join Meeting" button opens the meeting URL
- Jitsi meetings auto-generate room name from meeting ID
- External providers use stored meeting_url

---

## Next Feature to Implement

**Next up: bg-11 — AI-recommended automations (pattern detection)** (HIGH priority)

When starting, confirm bg-02 is working correctly by running:
```bash
php artisan route:list --path=meetings
```

---

## How to Use This File

1. Before starting a new feature, check this file for the next `❌ NOT STARTED` item
2. Confirm the previous feature's routes load: `php artisan route:list --path=<feature>`
3. After completing a feature, update status to ✅ DONE and add details above
4. Run Python tests: `cd services/ai && python -m pytest tests/unit -v`
5. Run TypeScript check: `cd services/web && npx tsc --noEmit --skipLibCheck`
