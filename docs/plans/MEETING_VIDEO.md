# Meeting Planning + Video Conferencing Integration

**Status:** ENHANCED DRAFT  
**Date:** 2026-05-25  
**Domain:** Collaboration / Calendar

---

## 1. Problem Statement

Aquerii has no native meeting scheduling or calendar integration. Teams using Aquerii for project management still rely on Google Calendar or Outlook for scheduling, Zoom or Teams for video calls, and then manually paste meeting links into task descriptions or board comments. This context-switching costs productivity and means there is no record of meetings alongside the project work.

The goal: schedule meetings, generate video conferencing links, and surface them in the activity timeline — all without leaving Aquerii.

---

## 2. Feature Scope (Phase 1)

### In scope
- Create a meeting (title, date/time, duration, attendees from workspace members, external attendees by email)
- Generate a video conference link automatically (Zoom or Teams — user configures one in workspace settings)
- Send meeting invitations via email (BillionMail SMTP)
- Display meetings on a Calendar view within Aquerii
- Link meetings to a board/project or CRM deal
- Meeting detail: agenda (rich text), recording link (manual paste), notes, action items (creates tasks)

### Out of scope (Phase 2)
- Google Calendar / Outlook two-way sync
- Automatic recording download
- AI meeting summary
- Recurring meetings

---

## 3. Database Changes

```php
// Migration: 2026_05_26_000004_create_meetings_table.php
Schema::create('meetings', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('workspace_id');
    $table->uuid('created_by');
    $table->string('title');
    $table->text('agenda')->nullable();
    $table->timestampTz('starts_at');
    $table->integer('duration_minutes')->default(60);
    $table->string('status', 50)->default('scheduled'); // scheduled|in_progress|completed|cancelled
    $table->string('video_provider', 50)->nullable(); // 'zoom'|'teams'|'meet'|'custom'
    $table->text('video_link')->nullable();
    $table->text('video_join_url')->nullable();
    $table->text('video_password')->nullable();
    $table->uuid('linked_board_id')->nullable();
    $table->uuid('linked_deal_id')->nullable();
    $table->text('recording_url')->nullable();
    $table->text('notes')->nullable();
    $table->timestampsTz();
    $table->softDeletesTz();
    $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
    $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
    $table->index(['workspace_id', 'starts_at']);
});

Schema::create('meeting_attendees', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('meeting_id');
    $table->uuid('user_id')->nullable(); // null for external attendees
    $table->string('email')->nullable(); // for external attendees
    $table->string('name')->nullable();
    $table->string('status', 50)->default('invited'); // invited|accepted|declined|tentative|no_response
    $table->boolean('is_organiser')->default(false);
    $table->foreign('meeting_id')->references('id')->on('meetings')->cascadeOnDelete();
    $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
});
```

---

## 4. Video Conferencing Integrations

### 4.1 Zoom Integration (OAuth)

**Setup:**
1. User connects Zoom account in Settings > Integrations
2. Aquerii stores `zoom_access_token`, `zoom_refresh_token` per user (in `oauth_accounts` table, provider = `zoom`)

**Creating a meeting:**
```php
// ZoomService.php
public function createMeeting(User $user, Meeting $meeting): array {
    $token = $this->getValidToken($user);
    
    $response = Http::withToken($token)->post('https://api.zoom.us/v2/users/me/meetings', [
        'topic'      => $meeting->title,
        'type'       => 2, // scheduled
        'start_time' => $meeting->starts_at->toIso8601String(),
        'duration'   => $meeting->duration_minutes,
        'timezone'   => $meeting->workspace->timezone,
        'agenda'     => $meeting->agenda,
        'settings'   => [
            'join_before_host'  => true,
            'waiting_room'      => false,
            'auto_recording'    => 'none',
        ],
    ]);
    
    return [
        'video_link'     => $response->json('join_url'),
        'video_password' => $response->json('password'),
    ];
}
```

**Required Zoom app scopes:** `meeting:write:admin`, `meeting:read:admin`

### 4.2 Microsoft Teams Integration (OAuth)

**Setup:**
1. User connects Microsoft account via Azure AD OAuth
2. Store tokens in `oauth_accounts` (provider = `microsoft`)

**Creating a meeting via Microsoft Graph:**
```php
// TeamsService.php
public function createMeeting(User $user, Meeting $meeting): array {
    $token = $this->getMicrosoftToken($user);
    
    $response = Http::withToken($token)
        ->post('https://graph.microsoft.com/v1.0/me/onlineMeetings', [
            'startDateTime' => $meeting->starts_at->toIso8601String(),
            'endDateTime'   => $meeting->starts_at->addMinutes($meeting->duration_minutes)->toIso8601String(),
            'subject'       => $meeting->title,
        ]);
    
    return [
        'video_link'    => $response->json('joinWebUrl'),
        'video_password'=> null,
    ];
}
```

### 4.3 Fallback: Custom Link

If no integration is configured, users can paste any video conference URL manually (Google Meet, Jitsi, etc.).

---

## 5. Email Invitations

When a meeting is created/updated, send calendar invitation emails:

```php
// MeetingInviteMail.php (Mailable)
// Attach an .ics file (iCalendar format)
```

Generate ICS:
```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260525T140000Z
DTEND:20260525T150000Z
SUMMARY:Sprint Planning
DESCRIPTION:Agenda: ...
LOCATION:https://zoom.us/j/123456
END:VEVENT
END:VCALENDAR
```

Sent via BillionMail SMTP to all attendees (workspace members + external emails).

---

## 6. Frontend Changes

### 6.1 New Route: `/meetings`

Add `MeetingsPage` to App.tsx and AppLayout navigation (icon: `Video` from lucide).

### 6.2 MeetingsPage Layout

Two sub-views:
- **Calendar** — month/week/day grid showing meetings as event blocks (time-boxed)
- **List** — upcoming meetings table with status, attendees, video link button

### 6.3 Create/Edit Meeting Modal

Fields:
- Title
- Date & time (datetime picker)
- Duration (15 / 30 / 45 / 60 / 90 / 120 min)
- Video provider (Zoom / Teams / Custom link — based on what's connected)
- Attendees (multi-select from workspace members + free email entry for externals)
- Agenda (rich text)
- Link to board or deal (optional)

On save:
1. POST to `/api/workspaces/{w}/meetings`
2. Backend creates Zoom/Teams meeting link
3. Backend dispatches `SendMeetingInvitations` queued job
4. Frontend shows meeting with video join button

### 6.4 Meeting Detail View

Slide-out panel showing:
- Agenda
- Attendee list with RSVP status
- "Join Meeting" button (opens video_join_url in new tab)
- Notes (editable after the meeting)
- Action items (creates linked tasks on current board)
- Recording URL (paste after meeting)

### 6.5 Integration Settings

Under Settings > Integrations:
- "Connect Zoom" — OAuth button
- "Connect Microsoft Teams" — OAuth button
- Shows connected status, last sync, disconnect button

---

## 7. Workspace Settings

Add to `workspace.settings` JSONB:
```json
{
  "default_video_provider": "zoom",
  "meeting_invite_footer": "Powered by Aquerii",
  "calendar_week_start": "monday"
}
```

---

## 8. Open Questions

- Should meetings be visible to all workspace members or only attendees?
- Does Phase 1 need two-way RSVP (accept/decline from email)?
- Google Calendar sync — is this a blocker for some customers or can it wait for Phase 2?

---

## 9. `oauth_accounts` Table (Shared OAuth Token Store)

Reused by Zoom, Microsoft Teams, and future Google OAuth integrations.

```php
Schema::create('oauth_accounts', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('user_id');
    $table->uuid('workspace_id')->nullable(); // null = personal connection
    $table->string('provider', 50); // 'zoom' | 'microsoft' | 'google'
    $table->string('provider_user_id')->nullable(); // Zoom user ID, Microsoft OID
    $table->string('provider_email')->nullable();
    $table->text('access_token');
    $table->text('refresh_token')->nullable();
    $table->timestampTz('expires_at')->nullable();
    $table->jsonb('scopes')->nullable();
    $table->jsonb('meta')->nullable(); // extra provider-specific data
    $table->timestampsTz();
    $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
    $table->unique(['user_id', 'provider']); // one account per provider per user
});
```

Token refresh logic (shared `OAuthTokenService`):
- Before every API call, check `expires_at`
- If expired or within 5 minutes: call provider's refresh endpoint, update record
- If refresh fails (revoked): mark account disconnected, notify user

---

## 10. Recurring Meetings (Phase 1.5)

Add to `meetings` table:
```php
$table->string('recurrence_type', 50)->nullable(); // null|daily|weekly|biweekly|monthly
$table->integer('recurrence_interval')->default(1);
$table->date('recurrence_until')->nullable(); // null = indefinite
$table->uuid('recurrence_parent_id')->nullable(); // links instances to master meeting
$table->boolean('is_recurrence_master')->default(false);
```

Generating instances: on creation of a recurring meeting, create child `Meeting` rows up to 3 months out (or `recurrence_until`). A scheduled command runs monthly to extend the horizon.

Editing a recurring instance: offer "Edit this meeting only" vs "Edit this and all future meetings".

---

## 11. Google Calendar Sync (Phase 2 Groundwork)

`oauth_accounts` table already supports `provider = 'google'`. Phase 2 tasks:
1. Google OAuth app with scopes: `https://www.googleapis.com/auth/calendar.events`
2. On meeting create/update/delete: mirror to Google Calendar via Events API
3. Webhook subscription (`POST /api/webhooks/google-calendar/{user_id}`) to sync external changes back
4. UI: "Sync to Google Calendar" toggle per meeting; "Connect Google Account" in Integrations

---

## 12. Meeting Reminders

Scheduled command: `php artisan meetings:send-reminders` (runs every 15 minutes)

Sends reminder notifications/emails:
- 24 hours before: email reminder to all attendees
- 15 minutes before: in-app notification (or push if PWA)

Configurable per workspace in settings:
```json
{
  "meeting_reminder_24h": true,
  "meeting_reminder_15min": true
}
```

---

## 13. Success Criteria

- [ ] `meetings` and `meeting_attendees` tables created
- [ ] `oauth_accounts` table created; `OAuthTokenService` handles refresh
- [ ] Zoom OAuth flow works; meeting link generated automatically on creation
- [ ] Teams OAuth flow works as alternative provider
- [ ] ICS email invitations sent to all attendees on meeting creation
- [ ] MeetingsPage renders calendar (month/week/day) and list views
- [ ] Action items from meeting notes create tasks linked to the selected board
- [ ] Recurring meetings: instances generated on creation; edit single or all-future
- [ ] Meeting reminders: 24h email + 15min in-app notification
- [ ] Tests: MeetingController CRUD; ZoomService mock; TeamsService mock; ICS generation; reminder scheduler
