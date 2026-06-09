# BG-02: Multi-Provider Conferencing (Google Meet, Zoom, Teams, Webex)

**Status:** ❌ NOT IMPLEMENTED
**Priority:** P2 — Important for meeting usability
**Complexity:** HIGH — Third-party OAuth, provider API differences, webhook handling

---

## 1. What This Feature Is

Integration with video conferencing providers (Google Meet, Zoom, Microsoft Teams, Cisco Webex) so that every Aquerii Meeting has a "Join" button that actually works. The system creates a conference through the user's preferred provider, stores the join URL, and detects each participant's provider preference so a single meeting can have multiple provider options.

Currently, meetings are CRUD with RSVP — you can create a meeting, set a time, invite people, and they can say yes/no/maybe. But there is no actual conferencing link. Users have to manually create a Zoom/Meet link and paste it into the description. This feature automates that.

The real win: when you create a meeting, pick your provider (or use your default), and Aquerii calls the provider's API to create the conference, gets back the join URL, attaches it to the meeting. Each participant sees their preferred provider's join link. If Sarah prefers Zoom and John prefers Google Meet, they each see a "Join with [Provider]" button.

---

## 2. Why It's Missing

The Meetings feature (`App\Models\Meeting`) is basic CRUD with an RSVP pivot table (`meeting_participants`). There is zero integration with any external conferencing API. The reasons are straightforward:

1. **OAuth complexity** — Each provider has a different OAuth flow, different scopes, different token refresh mechanisms. Zoom, Google, Microsoft, and Cisco all require registered apps with redirect URIs, client secrets, and verified publish status for production.
2. **Provider API differences** — Zoom returns a `join_url` and `start_url`. Google Meet requires a Google Calendar event (Meet links are tied to Calendar events). Teams requires a Microsoft Graph call with a complex JSON body. Webex has its own meeting object model.
3. **Account linking** — Users must connect their Zoom/Google/Teams/Webex account to their Aquerii profile. This is a non-trivial UX flow with authorization redirects.
4. **No clear priority** — The MVP of "just paste a link" works. Automating it is a quality-of-life improvement, not a blocker.

---

## 3. Backend Spec

### 3.1 Models

```php
// MeetingProvider — stores the provider-specific meeting details
Schema::create('meeting_providers', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('meeting_id')->constrained('meetings')->cascadeOnDelete();
    $table->string('provider_type');               // zoom, google_meet, teams, webex
    $table->string('provider_meeting_id');          // the ID in the provider's system
    $table->text('join_url');
    $table->text('start_url')->nullable();           // host's "start meeting" URL (Zoom)
    $table->json('provider_data')->nullable();       // raw provider response, for debugging
    $table->string('status');                        // active, expired, cancelled
    $table->timestamp('created_at')->useCurrent();
    $table->timestamp('expires_at')->nullable();

    $table->unique(['meeting_id', 'provider_type']);
});

// UserProviderPreference — which provider a user prefers, and their connected account
Schema::create('user_provider_preferences', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
    $table->string('provider_type');               // zoom, google_meet, teams, webex
    $table->boolean('is_default')->default(false);
    $table->string('provider_user_id')->nullable();  // the user's ID in the provider's system
    $table->string('email')->nullable();              // the email used for that provider
    $table->timestamp('connected_at')->useCurrent();
    $table->timestamp('disconnected_at')->nullable();

    $table->unique(['user_id', 'provider_type']);
});

// ProviderAccount — OAuth token storage per user per provider
Schema::create('provider_accounts', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
    $table->string('provider_type');               // zoom, google_meet, teams, webex
    $table->string('provider_account_id');
    $table->text('access_token');
    $table->text('refresh_token')->nullable();
    $table->timestamp('expires_at');
    $table->json('scopes');
    $table->timestamps();

    $table->unique(['user_id', 'provider_type']);
});

// MeetingProviderEventLog — audit trail for provider API calls
Schema::create('meeting_provider_event_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignUuid('meeting_id')->nullable()->constrained()->nullOnDelete();
    $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
    $table->string('provider_type');
    $table->string('event_type');                  // created, updated, deleted, error, token_refresh
    $table->json('request_data')->nullable();
    $table->json('response_data')->nullable();
    $table->text('error_message')->nullable();
    $table->timestamp('created_at')->useCurrent();
});
```

### 3.2 API Endpoints

```
# Meeting Conferencing
POST   /api/meetings/{id}/conferencing                        # Create/attach provider meeting
       Body: { provider_type: "zoom" }                         # Returns the join URL
GET    /api/meetings/{id}/conferencing                         # List all provider meetings for this meeting
DELETE /api/meetings/{id}/conferencing/{providerId}            # Remove/delete a provider meeting
GET    /api/meetings/{id}/join-url                             # Get the best join URL for current user
       Returns: { url: "...", provider_type: "...", provider_name: "Zoom" }

# Provider Account Linking
GET    /api/auth/provider/{provider}/redirect                  # Get OAuth redirect URL
       Returns: { redirect_url: "https://zoom.us/oauth/authorize?..." }
POST   /api/auth/provider/{provider}/callback                 # Handle OAuth callback
       Body: { code: "..." }
DELETE /api/auth/provider/{provider}/disconnect                # Disconnect provider account
GET    /api/auth/provider/accounts                             # List connected provider accounts

# User Provider Preferences
GET    /api/user/provider-preferences                          # Get all preferences
PUT    /api/user/provider-preferences/{provider}               # Update preference for a provider
       Body: { is_default: true }

# Admin: Provider Configuration
GET    /api/admin/provider-config                              # Get provider config (which are enabled)
PUT    /api/admin/provider-config/{provider}                   # Enable/disable a provider
```

### 3.3 Controller Logic

**MeetingProviderController@store:**
1. Validate the meeting exists and user is the organizer (or has edit permission)
2. Check the user has a connected ProviderAccount for the requested provider_type
3. If no account linked, return 422 with `{ error: "provider_not_connected", redirect_url: "..." }`
4. Check if a MeetingProvider already exists for this meeting+provider — if so, return it (idempotent)
5. Call the appropriate provider service to create the meeting:
   - `ZoomService::createMeeting($meeting, $user)`
   - `GoogleMeetService::createMeeting($meeting, $user)`
   - `TeamsService::createMeeting($meeting, $user)`
   - `WebexService::createMeeting($meeting, $user)`
6. Store the MeetingProvider record with the returned join URL and provider metadata
7. Log to MeetingProviderEventLog
8. Return the MeetingProvider resource

**MeetingProviderController@destroy:**
1. Find the MeetingProvider
2. Call provider service to delete/end the meeting on their side
3. Delete the record
4. Log the event

**JoinUrlController@show:**
1. Find the meeting
2. Get current user's default provider preference
3. If user has a default, find the MeetingProvider for that type
4. If no match, find any active MeetingProvider for this meeting
5. If multiple, return them all ranked by user preference
6. Return the best URL

**ProviderAuthController@redirect:**
1. Build the OAuth URL for the given provider with state parameter
2. Store state in cache (10min expiry) linked to user session
3. Return the redirect URL

**ProviderAuthController@callback:**
1. Verify state parameter matches cache
2. Exchange authorization code for access+refresh tokens
3. Call provider API to verify the token works and get user info
4. Store/update ProviderAccount record
5. Upsert UserProviderPreference
6. Return success (frontend closes the popup window)

### 3.4 Service Layer

```
App\Services\Conferencing\ZoomService
  - createMeeting(Meeting $m, User $u): MeetingProvider
  - updateMeeting(MeetingProvider $mp, Meeting $m): void
  - deleteMeeting(MeetingProvider $mp): void
  - refreshToken(ProviderAccount $acct): void
  - getOAuthRedirect(): string
  - handleOAuthCallback(string $code): ProviderAccount

App\Services\Conferencing\GoogleMeetService
  - createMeeting(Meeting $m, User $u): MeetingProvider   // Creates Google Calendar event with Meet
  - updateMeeting(MeetingProvider $mp, Meeting $m): void
  - deleteMeeting(MeetingProvider $mp): void
  - refreshToken(ProviderAccount $acct): void
  - getOAuthRedirect(): string
  - handleOAuthCallback(string $code): ProviderAccount

App\Services\Conferencing\TeamsService
  - createMeeting(Meeting $m, User $u): MeetingProvider
  - updateMeeting(MeetingProvider $mp, Meeting $m): void
  - deleteMeeting(MeetingProvider $mp): void
  - refreshToken(ProviderAccount $acct): void
  - getOAuthRedirect(): string
  - handleOAuthCallback(string $code): ProviderAccount

App\Services\Conferencing\WebexService
  - createMeeting(Meeting $m, User $u): MeetingProvider
  - updateMeeting(MeetingProvider $mp, Meeting $m): void
  - deleteMeeting(MeetingProvider $mp): void
  - refreshToken(ProviderAccount $acct): void
  - getOAuthRedirect(): string
  - handleOAuthCallback(string $code): ProviderAccount

App\Services\Conferencing\ProviderFactory
  - make(string $providerType): ConferencingProviderInterface
  - getEnabledProviders(): array
```

### 3.5 Provider Requirements Matrix

| Requirement | Zoom | Google Meet | Teams | Webex |
|------------|------|-------------|-------|-------|
| App registration required | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| OAuth scopes needed | `meeting:write` | `https://www.googleapis.com/auth/calendar.events` | `OnlineMeetings.ReadWrite` | `spark:meetings_write` |
| App verification needed | ✅ For production | ✅ For production | ✅ For production | ✅ For production |
| Free tier | ✅ 40min limit | ✅ Free | ✅ Free (with org) | ✅ Free (with limited features) |
| Token expiry | 1 hour | 1 hour | 90 days (no refresh) | 14 days |
| Supports refresh token | ✅ Yes | ✅ Yes | ❌ No (rotating) | ✅ Yes |
| Meeting ID returned | ✅ `id` numeric | ✅ `id` from Calendar | ✅ `id` UUID | ✅ `meetingId` |
| Join URL format | `https://zoom.us/j/{id}` | `https://meet.google.com/{code}` | `https://teams.microsoft.com/l/meetup-join/{id}` | `https://webex.com/join/{id}` |
| Delete meeting API | ✅ Yes | ✅ Yes (deletes event) | ✅ Yes | ✅ Yes |

### 3.6 Webhook/Event Handling

Each provider sends webhooks for meeting lifecycle events (started, ended, participant joined/left). The system should handle:

```
POST /api/webhooks/zoom      # Zoom events
POST /api/webhooks/google    # Google Calendar/Meet events
POST /api/webhooks/teams     # Teams lifecycle events
POST /api/webhooks/webex     # Webex events
```

Webhook handler logic:
1. Verify signature (each provider has a different verification method)
2. Parse event type
3. Update MeetingProvider status if needed (e.g., mark as expired if meeting ended)
4. Log to MeetingProviderEventLog
5. Optionally update the Meeting status (e.g., mark as completed)

---

## 4. Frontend Design

### 4.1 Meeting Create/Edit Form — Provider Section

```
┌──────────────────────────────────────────────────────┐
│  Create Meeting                                       │
├──────────────────────────────────────────────────────┤
│  Title:     [___________________________________]    │
│  Date:      [📅 2026-06-15   ] Time: [⏰ 10:00 AM ] │
│  Duration:  [30 min ▼]                               │
│  Description: [___________________________________]  │
│                                                      │
│  Participants:                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ [Add Participants...]                         │  │
│  │ Sarah Chen  ✔ Going                            │  │
│  │ John Smith  ✔ Going  (prefers Zoom)            │  │
│  │ Mike Lee    ✔ Going  (prefers Google Meet)     │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Conferencing:                                       │
│  ○ None (manual link)                                │
│  ● Create with provider:  [🔵 Zoom ▼]               │
│  ○ Add from existing URL                             │
│                                                      │
│  My connected accounts:                              │
│  ✅ Zoom (sarah@example.com)    [Disconnect]         │
│  ❌ Google Meet                 [Connect]            │
│  ❌ Microsoft Teams             [Connect]            │
│                                                      │
│  [✕ Cancel]                         [Create Meeting] │
└──────────────────────────────────────────────────────┘
```

### 4.2 Meeting Detail — Join Button

The meeting detail page shows provider-specific join buttons:

```
┌──────────────────────────────────────────────────────┐
│  Sprint Planning                          [Edit] [✕] │
│  Today 10:00 AM — 10:30 AM                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🟢 Today at 10:00 AM  (30 min)                     │
│                                                      │
│  Organizer: You                                      │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  [🟢 Join with Zoom]  [🔗 Copy Join Link]     │  │
│  │  Meeting ID: 123-456-789                       │  │
│  │  Passcode: 1234                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Participants (3):                                   │
│  ┌────────────────────────────────────────────────┐  │
│  │  👤 Sarah Chen    ✔ Going    [Join with Zoom]  │  │
│  │  👤 John Smith    ✔ Going    [Join with Meet]  │  │
│  │  👤 Mike Lee      ✔ Going    [Join with Zoom]  │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  If user has no connected provider:                  │
│  ┌────────────────────────────────────────────────┐  │
│  │  ⚠ No conferencing provider connected.          │  │
│  │  [Connect Zoom] [Connect Google Meet]           │  │
│  │  [Connect Teams] [Connect Webex]                │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 4.3 Provider Connection Flow

Step-by-step OAuth connection:

```
Step 1: User clicks "Connect Zoom" in settings or meeting form
Step 2: Popup window opens → redirects to Zoom OAuth page
Step 3: User authorizes in Zoom → redirects back to Aquerii
Step 4: Popup closes → parent window shows success toast
Step 5: Provider appears as connected in settings

On error:
┌──────────────────────────────────────────────────────┐
│  ❌ Failed to connect Zoom                           │
│  "The application was not authorized. Please try     │
│   again."                                            │
│                                                      │
│  [Try Again]   [Contact Support]                     │
└──────────────────────────────────────────────────────┘
```

### 4.4 Provider Preferences in Settings

Settings → Meetings → Conferencing Providers:

```
┌──────────────────────────────────────────────────────┐
│  Conferencing Providers                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Default Provider: [🔵 Zoom ▼]                       │
│                                                      │
│  Connected Accounts:                                 │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ 🔵 Zoom                                         │  │
│  │    Connected as sarah@example.com               │  │
│  │    [Disconnect] [Set as Default] ⭐             │  │
│  ├────────────────────────────────────────────────┤  │
│  │ 🟢 Google Meet                                  │  │
│  │    Connected as sarah.chen@gmail.com            │  │
│  │    [Disconnect] [Set as Default]                │  │
│  ├────────────────────────────────────────────────┤  │
│  │ 🔴 Microsoft Teams                              │  │
│  │    Not connected                                │  │
│  │    [Connect with Microsoft]                     │  │
│  ├────────────────────────────────────────────────┤  │
│  │ 🟠 Cisco Webex                                  │  │
│  │    Not connected                                │  │
│  │    [Connect with Webex]                         │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Meeting Defaults:                                   │
│  ☐ Always create a conference when creating meeting  │
│  Default duration: [30 min ▼]                        │
│                                                      │
│  [Save Settings]                                     │
└──────────────────────────────────────────────────────┘
```

### 4.5 Cross-Provider Join Detection

When a meeting has multiple provider links, the frontend needs to show the right one:

```
Logic:
1. Check current user's default provider preference
2. If default provider has a link for this meeting → show that as primary
3. If no default → show all links, highlight the most-used among participants
4. For participant list, show each person's preferred provider link
   (requires backend to compute this per-user from UserProviderPreference)

Participant row with detected preference:
┌──────────────────────────────────────────────────────┐
│  👤 Sarah Chen    ✔ Going    [🔵 Zoom]               │
│                             Zoom is Sarah's default  │
└──────────────────────────────────────────────────────┘
```

---

## 5. Implementation Complexity Analysis

| Component | Complexity | Risk | Notes |
|-----------|-----------|------|-------|
| Provider OAuth (each) | HIGH | MEDIUM | Each provider has a different OAuth 2.0 implementation. Microsoft uses Azure AD with tenant IDs. Google uses OpenID Connect. Zoom uses standard OAuth. Webex uses its own flow. |
| Zoom API integration | MEDIUM | LOW | Well-documented API, RESTful, predictable. |
| Google Meet integration | HIGH | MEDIUM | Meet links are tied to Calendar events. Must create Calendar event first, then extract the Meet link. Requires Google Calendar API scopes. |
| Microsoft Teams integration | HIGH | HIGH | Microsoft Graph API is complex, large JSON schemas, Graph permissions model is confusing. Token rotation without refresh tokens is painful. |
| Webex API integration | MEDIUM | LOW | RESTful API, straightforward. Less popular but clean. |
| Token refresh service | MEDIUM | HIGH | Stale tokens cause 401 errors mid-meeting. Need robust refresh retry logic with background queue. |
| Webhook handling | MEDIUM | MEDIUM | Four different webhook verification methods, four different payload schemas. |
| Frontend OAuth popup flow | MEDIUM | LOW | Popup blockers, cross-origin communication, state parameter management. |
| Preference resolution | LOW | LOW | Simple SQL query to find best provider per user. |
| Join URL detection | LOW | LOW | Deterministic algorithm based on user prefs. |

**Total estimated effort:** 4-6 weeks for a senior full-stack developer
**Ongoing maintenance:** Each provider API change will break integration. This is not a "build once, never touch" feature.
**Key risk:** Microsoft Teams OAuth is the biggest pain point. Azure app registration requires tenant admin consent for production. Token rotation without refresh tokens means users re-authenticate every 90 days.
**Recommendation:** Ship Zoom + Google Meet first (covers 80% of users), add Teams and Webex as P2 later.
