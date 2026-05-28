# 14 — Meetings & Notifications

---

## MeetingsPage

### Route

```
/meetings → MeetingsPage
```

### View Toggle

Two view modes, toggle via button group at top-right:

```
[Calendar View] [List View]
```

Default: Calendar View. Preference persisted in `localStorage`.

### Data Source

**BRUTAL CALL-OUT: No meetings/calendar backend endpoints exist in the API reference.** The entire MeetingsPage is aspirational. Every mutation and query below requires new backend endpoints. The design is documented as-is because the product needs it — do not ship without backend support.

---

### Calendar View

```
┌───────────────────────────────────────────────────────────────────────┐
│  < May 2026 >                                      [Month] [Week]     │
│                                                                       │
│  Mon     Tue     Wed     Thu     Fri     Sat     Sun                  │
│  27      28      29      30       1        2        3                 │
│          │                      │                                     │
│          │ Sprint Review        │ Standup                             │
│          │ 3:00 PM              │ 9:30 AM                             │
│           ───────               ───────                               │
│  4        5       6       7       8        9       10                │
│          │                      │                                     │
│          │ 1:1 with Jane        │ Retro                               │
│          │ 2:00 PM              │ 4:00 PM                             │
└───────────────────────────────────────────────────────────────────────┘
```

- Week view by default. Month view toggle.
- Navigate with < > arrows and "Today" button.
- Each day cell shows meeting title + time. Overflow indicator if >3 meetings ("+2 more").
- Click a meeting: open detail popover (see below).
- Click empty area in a day: open create modal with that date pre-filled.
- Week view: 7 columns, time rows on left (30min slots, 8AM-6PM). Meetings displayed as blocks spanning their duration.
- Color coding per meeting type (or per calendar).

---

### List View

```
┌──────────────────────────────────────────────────────────────────┐
│  Filter: [All] [Today] [This Week] [This Month]    [+ New]      │
├─────────┬──────────┬──────────────┬──────────┬──────────────────┤
│  Date   │  Time    │  Title       │  Attend. │  Status          │
│  May 1  │  3:00 PM │ Sprint Review│  8       │  ● Confirmed     │
│  May 2  │  9:30 AM │ Standup      │  6       │  ● Confirmed     │
│  May 5  │  2:00 PM │ 1:1 Jane     │  2       │  ○ Tentative     │
└─────────┴──────────┴──────────────┴──────────┴──────────────────┘
```

- Sortable columns (default: date ascending).
- Filter tabs control time range.
- Each row: Date, Time, Title, Attendee count, Status badge, Actions (Edit, Cancel).
- Click title: open detail drawer.

---

### Create/Edit Meeting Modal

```
┌──────────────────────────────────────────────────────────┐
│  {New | Edit} Meeting                       [×] Close    │
├──────────────────────────────────────────────────────────┤
│  Title*:     [text input]                                │
│  Date*:      [date picker]                               │
│  Time*:      [time picker]    Duration*: [30m ▼]         │
│  Location:   [text input — room, address, or "Google Meet"] │
│  Description: [textarea — agenda, notes]                  │
│                                                           │
│  Attendees:                                               │
│  [email chips input with autocomplete from employees]     │
│  Invited: jane@acme.com ✓   john@acme.com ✓              │
│                                                           │
│  [Delete Meeting]          [Cancel]  [Save]              │
└──────────────────────────────────────────────────────────┘
```

- Title required. Date required. Time required. Duration default 30min (dropdown: 15/30/45/60/90/120).
- Attendees: email chips input. Must have at least 1 attendee (creator is implicitly included).
- Location: free text. Can be a physical room or a video link.
- Description: textarea, optional.
- **Save**: POST (new) or PUT (edit) to /api/meetings. Calendar event is created/updated.
- **Delete**: bottom-left danger button. Confirm dialog. DELETE /api/meetings/{id}.

---

### Meeting Detail Drawer

Right-side drawer (40% width).

```
┌────────────────────────────────────────┐
│  Sprint Review               [×] Close │
├────────────────────────────────────────┤
│  May 1, 2026 — 3:00 PM → 3:30 PM     │
│  Duration: 30 min                      │
│  Location: Conference Room B           │
│                                        │
│  [Join Meeting]                        │
│                                        │
│  ─── Agenda ───                        │
│  Review sprint goals, demo completed   │
│  work, discuss blockers.               │
│                                        │
│  ─── Attendees (8) ───                │
│  [Avatar] Jane Smith ● Confirmed      │
│  [Avatar] John Doe   ○ Tentative     │
│  [Avatar] Alice      ● Confirmed      │
│  [Avatar] Bob        ● Confirmed      │
│  [Avatar] Carol      ● Confirmed      │
│  ...                                   │
│                                        │
│  [Accept] [Tentative] [Decline]        │
└────────────────────────────────────────┘
```

- Top: Title, date/time range, duration, location.
- **Join Meeting button**: visible if location is a URL (Zoom/Google Meet/Teams). Opens in new tab.
- **Agenda**: Description rendered as markdown or plain text.
- **Attendees list**: each with avatar, name, RSVP status badge, and email.
- **RSVP buttons**: Accept (confirmed), Tentative, Decline.
  - RSVP action: PATCH /api/meetings/{id}/rsvp (new endpoint needed).
  - Current user's RSVP highlighted. Other attendees' statuses shown as badges.
- **Edit button**: header action, opens edit modal pre-filled.
- **Cancel meeting**: danger button in footer, confirm dialog.

---

### Attendance Tracking

Each meeting stores RSVP status per attendee. The meeting detail drawer shows attendance rates:
- Confirmed: X of Y (percentage bar, optional).
- After meeting ends (past date/time), attendance tracking changes to "Attended" / "No show."
- **BRUTAL CALL-OUT: Attendance tracking requires a PATCH /api/meetings/{id}/attendance endpoint.** This does not exist. Post-meeting attendance marking is aspirational.

---

### Loading / Empty / Error States

- **Loading**: Calendar skeleton (7 columns of gray blocks with shimmer) or list skeleton (5 rows).
- **Empty**: "No meetings scheduled" with illustration and "Schedule your first meeting" CTA.
- **Error**: "Failed to load meetings" with retry button. Mutation errors shown as toast.

---

### CRITIQUE: AI Scheduling Negotiation & Multi-Provider Conferencing

The original superprompt calls for:
1. **AI scheduling negotiation** — AI suggests optimal meeting times based on attendee availability.
2. **Multi-provider conferencing** — automatic generation of Zoom/Google Meet/Teams links.

**Neither exists in the backend. Neither should be in v1.** Here's why:

- **AI negotiation** requires: availability endpoints for each user, an AI service (or rules engine) to find overlaps, and a notification system to propose times. This is an entire product feature, not a UI toggle. Estimating 2-4 weeks of backend + AI work.
- **Multi-provider conferencing** requires: integrations with Zoom/Google Meet/Teams APIs, OAuth flows for each, webhook handling for meeting creation events, and a provider abstraction layer. This is also a full feature (3-6 weeks per provider).

**v1 Recommendation**: Strip both. Use a free-text "Location" field. Users paste their own meeting link. No AI. No provider integrations. Ship the calendar CRUD first.

**v2 Recommendation**: Re-evaluate after core meeting CRUD ships and real users confirm they need it. Do not build AI features because the spec says so — build them because users are manually juggling schedules and complaining.

---

## Notifications

### Notification Center

Right-side slide-over panel. Toggled by bell icon in the global header. Animated slide from right edge, 380px wide.

```
┌─────────────────────────────┐
│  Notifications    [Mark all] │
├─────────────────────────────┤
│  TODAY                       │
│  ┌─────────────────────────┐│
│  │  @mentions              ││
│  │  ● Jane mentioned you   ││
│  │    in Sprint Review     ││
│  │    2h ago               ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  🔔 Status Change       ││
│  │  ● SO-042 marked shipped││
│  │  by John                 ││
│  │    3h ago                ││
│  └─────────────────────────┘│
│                              │
│  YESTERDAY                   │
│  ┌─────────────────────────┐│
│  │  📋 Assignment          ││
│  │  You were assigned to   ││
│  │  "Fix login bug"        ││
│  │  May 1                  ││
│  └─────────────────────────┘│
│                              │
│  [View all notifications]   │
└─────────────────────────────┘
```

Backend: GET /api/workspaces/{id}/notifications, PATCH /api/notifications/{id}/read, POST /api/notifications/read-all, GET/PUT /api/notifications/preferences — all fully implemented.

### Notification Types
Each notification has: type, title, message, timestamp, read status, action URL, project/workspace context icon.

| Type | Icon | Description |
|------|------|-------------|
| `mention` | `@` | User was mentioned in a comment or document |
| `assignment` | `📋` | User was assigned to a task/issue |
| `status_change` | `🔔` | Entity they follow changed status |
| `comment` | `💬` | Someone replied to their comment |
| `system_alert` | `⚠️` | System notification (billing, maintenance, etc.) |

### Grouping
- Notifications grouped by date: "Today", "Yesterday", "This Week", "Earlier."
- Within each date group, optionally grouped by type with a small type header.

### Each Notification Row
- Icon (type-specific, 32px circle with colored background)
- Title (bold if unread, normal if read)
- Message snippet (gray, 1 line, overflow ellipsis)
- Timestamp (relative: "2h ago", "Yesterday", "May 1")
- Unread indicator: small blue dot on left edge (not shown if read).
- Click: PATCH /api/notifications/{id}/read → mark read → navigate to `action_url` → close panel.

### Mark Read / Mark All Read
- Each notification has a subtle "mark read" button on hover (if unread).
- Top-right "Mark all read" link: POST /api/notifications/read-all. All notifications in panel transition to read state (blue dots disappear).

### Unread Count Badge
- Bell icon in global header shows unread count badge (red circle with white number).
- Count fetched from GET /api/workspaces/{id}/notifications response (`meta.unread_count`).
- **BRUTAL CALL-OUT: If backend does not return `unread_count` in the response metadata, frontend must compute it by filtering notifications where `read_at` is null. This is inefficient for large counts. Request backend add `meta.unread_count` to the response.**
- Badge updates when: panel opens (refetch), mark-read action succeeds, socket event received.

### Real-Time Push via Socket.IO
- Socket.IO connection established at app login.
- Events:
  - `notification:new` — payload: full notification object. Prepend to notification list. Increment unread count. Show browser notification if permission granted and app tab not focused.
  - `notification:read` — payload: notification ID. Update local state.
  - `notification:read-all` — clear all unread.
- **Socket reconnection**: exponential backoff (1s, 2s, 4s, 8s, max 30s). On reconnect, refetch notifications.
- **BRUTAL CALL-OUT: Socket.IO event names must match backend implementation.** The names above (`notification:new`, etc.) are suggestions. Coordinate with backend team.

### Empty State
```
          🔔
    No notifications
  You're all caught up!
```
Bell icon (72px, gray), title, subtitle. Only shown if total notification count is 0 (not just filtered).

### Loading State
- Panel shows 5 skeleton rows on initial load (shimmer animation).
- Subsequent refreshes (pull-to-refresh or socket events) just update the list — no skeleton.

### Notification Preferences
- Same as described in FILE 11 (Settings → Notifications Tab).
- Inline link to settings in notification panel footer: "Manage notification preferences."

---

## BRUTAL CALL-OUTS — Full Summary

| Feature | Status | Action Required |
|---------|--------|-----------------|
| **Meetings CRUD** | ❌ **No endpoints** | Full backend implementation needed |
| **Calendar view** | ❌ Dependent on meetings API | Blocked until meetings exist |
| **RSVP** | ❌ No endpoint | Needs PATCH /api/meetings/{id}/rsvp |
| **Attendance tracking** | ❌ No endpoint | Post-meeting marking not supported |
| **AI scheduling** | ❌ Does not exist | Not a v1 feature — strip it |
| **Multi-provider conferencing** | ❌ Does not exist | Not a v1 feature — use free-text location |
| **Notifications list** | ✅ Full backend | None |
| **Mark read / mark all read** | ✅ Full backend | None |
| **Notification preferences** | ✅ Full backend | None |
| **Socket.IO real-time push** | ⚠️ Backend capability unknown | Coordinate event names with backend team |
| **unread_count in response** | ⚠️ Unknown | Request backend add this metadata |
| **Browser notifications** | Frontend only | Use Notification API with permission request |
