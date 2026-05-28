# BG-04: Real-Time Internal Chat System

**Status:** ❌ NOT IMPLEMENTED
**Priority:** P1 — Major missing collaboration feature
**Complexity:** HIGH — Real-time infrastructure, message persistence, read state sync across devices

---

## 1. What This Feature Is

A full-featured internal chat system for workspace communication. This is NOT a chatbot or AI chat — it's human-to-human real-time messaging with channels, direct messages, file sharing, reactions, read receipts, typing indicators, and search.

The existing backend has Socket.IO set up for real-time notifications (new task assigned, meeting reminder, etc.). But there is no persistent chat system. Users cannot send each other messages within Aquerii. They rely on the Email module or external tools (Slack, Teams) for internal communication.

This feature turns Aquerii into a communication hub. Teams work in the same app where they manage tasks, CRM, support tickets, and projects — without context-switching to a separate chat tool.

**Key capabilities:**
- Channels: public (everyone in workspace), private (invite-only), and direct messages (1-on-1)
- Real-time messaging via existing Socket.IO infrastructure
- Message persistence in PostgreSQL
- Read receipts per-channel per-user (last_read_at tracking)
- Typing indicators
- File/image sharing with previews
- Emoji reactions
- Reply threads (simple: reply to a message with quote)
- @mentions with autocomplete → notifications
- Search within channels
- Message editing and deletion (soft delete)
- Workspace-scoped (channels don't cross workspaces)

---

## 2. Why It's Missing

1. **Scope creep** — A chat system is a product in itself. The team correctly focused on core ERP/CRM/support features first. Adding chat before core functionality would have been premature.
2. **Existing Socket.IO is notification-only** — The current Socket.IO setup (`App\Services\WebSocketService`) is designed for ephemeral push events. Chat requires persistent rooms, message history delivery, and reliable delivery guarantees. The existing setup needs significant extension.
3. **Real-time is hard** — Delivering messages reliably, handling reconnections, syncing read state across multiple devices, presence detection — these are well-understood but non-trivial problems.
4. **Storage concerns** — Chat generates massive amounts of data. A team of 50 people exchanging 100 messages/day generates 1.3M messages/year. Indexing and searching that volume requires careful design.
5. **Already have Email** — The existing Email module was seen as sufficient for async communication. But email is not real-time and doesn't match modern team expectations.

---

## 3. Backend Spec

### 3.1 Models

```php
// ChatChannel — a chat room (public, private, or DM)
Schema::create('chat_channels', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
    $table->string('type');                              // public, private, dm
    $table->string('name')->nullable();                  // null for DM channels (auto-generated)
    $table->text('description')->nullable();
    $table->string('slug')->nullable();                   // URL-friendly name
    $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('last_activity_at')->nullable();     // last message time, for sorting
    $table->timestamps();
    $table->softDeletes();

    $table->index(['workspace_id', 'last_activity_at']);
});

// ChatMember — who is in which channel, and their read state
Schema::create('chat_members', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('channel_id')->constrained('chat_channels')->cascadeOnDelete();
    $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
    $table->string('role')->default('member');            // member, admin (can manage channel)
    $table->timestamp('last_read_at')->nullable();         // for read receipts
    $table->timestamp('joined_at')->useCurrent();
    $table->timestamp('notified_at')->nullable();          // last time we sent a push notif
    $table->timestamp('left_at')->nullable();

    $table->unique(['channel_id', 'user_id']);
    $table->index(['user_id', 'last_read_at']);
});

// ChatMessage — individual messages
Schema::create('chat_messages', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('channel_id')->constrained('chat_channels')->cascadeOnDelete();
    $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
    $table->text('content');
    $table->string('type')->default('text');               // text, system, file, reply
    $table->foreignUuid('reply_to_id')->nullable()->constrained('chat_messages')->nullOnDelete();
    $table->json('metadata')->nullable();                   // { edited_at, reply_preview, ... }
    $table->timestamp('created_at')->useCurrent();
    $table->timestamp('updated_at')->nullable();
    $table->softDeletes();

    $table->index(['channel_id', 'created_at']);
});

// ChatMessageReaction — emoji reactions
Schema::create('chat_message_reactions', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('message_id')->constrained('chat_messages')->cascadeOnDelete();
    $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
    $table->string('emoji');                               // the emoji character or shortcode
    $table->timestamp('created_at')->useCurrent();

    $table->unique(['message_id', 'user_id', 'emoji']);
});

// ChatMessageAttachment — files attached to messages
Schema::create('chat_message_attachments', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('message_id')->constrained('chat_messages')->cascadeOnDelete();
    $table->foreignUuid('file_id')->constrained('uploads')->cascadeOnDelete();
    $table->timestamps();
});

// ChatMention — @mention tracking
Schema::create('chat_mentions', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('message_id')->constrained('chat_messages')->cascadeOnDelete();
    $table->foreignUuid('channel_id')->constrained('chat_channels')->cascadeOnDelete();
    $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
    $table->boolean('notified')->default(false);
    $table->timestamp('created_at')->useCurrent();

    $table->unique(['message_id', 'user_id']);
    $table->index(['user_id', 'notified']);
});

// ChatChannelPinnedMessage
Schema::create('chat_channel_pinned_messages', function (Blueprint $table) {
    $table->id();
    $table->foreignUuid('channel_id')->constrained('chat_channels')->cascadeOnDelete();
    $table->foreignUuid('message_id')->constrained('chat_messages')->cascadeOnDelete();
    $table->foreignUuid('pinned_by')->constrained('users');
    $table->timestamp('pinned_at')->useCurrent();

    $table->unique(['channel_id', 'message_id']);
});
```

### 3.2 API Endpoints

```
# Channels
GET    /api/chat/channels                                    # List my channels (with unread counts)
POST   /api/chat/channels                                    # Create channel (name, type, member_ids)
GET    /api/chat/channels/{id}                               # Get channel detail + members
PATCH  /api/chat/channels/{id}                               # Update name, description
DELETE /api/chat/channels/{id}                               # Delete channel (soft)
POST   /api/chat/channels/{id}/members                       # Add members
DELETE /api/chat/channels/{id}/members/{userId}              # Remove member
PATCH  /api/chat/channels/{id}/members/{userId}              # Change role

# Messages
GET    /api/chat/channels/{id}/messages                      # Paginated messages (before=timestamp, limit=50)
       Query: ?before=2026-05-28T10:00:00Z&limit=50
POST   /api/chat/channels/{id}/messages                      # Send a message
       Body: { content: "...", reply_to_id: "..." }
PATCH  /api/chat/messages/{id}                               # Edit message
DELETE /api/chat/messages/{id}                               # Soft delete

# Read Receipts
POST   /api/chat/channels/{id}/read                          # Mark channel as read (sets last_read_at to now)

# Reactions
POST   /api/chat/messages/{id}/reactions                     # Add reaction { emoji: "👍" }
DELETE /api/chat/messages/{id}/reactions/{emoji}             # Remove reaction

# Attachments
POST   /api/chat/channels/{id}/messages/with-attachment      # Send message with file (multipart)

# Search
GET    /api/chat/search?q=keyword&channel_id=...             # Search messages
       Query: q, channel_id (optional), from (user_id), before, limit

# Mentions
GET    /api/chat/mentions                                    # List my unread @mentions
POST   /api/chat/mentions/read                               # Mark all mentions as read

# Direct Messages
POST   /api/chat/dm                                          # Create/get DM channel with user(s)
       Body: { user_ids: ["..."] }
```

### 3.3 Socket.IO Events

Using the EXISTING Socket.IO infrastructure, add these events:

```
# Client → Server
chat.message.send        { channel_id, content, reply_to_id?, file_ids? }
chat.message.edit        { message_id, content }
chat.message.delete      { message_id }
chat.channel.read        { channel_id }
chat.channel.join        { channel_id }
chat.channel.leave       { channel_id }
chat.typing.start        { channel_id }
chat.typing.stop         { channel_id }
chat.reaction.add        { message_id, emoji }
chat.reaction.remove     { message_id, emoji }

# Server → Client
chat.message.new         { id, channel_id, user, content, created_at, ... }
chat.message.edited      { message_id, channel_id, content, edited_at }
chat.message.deleted     { message_id, channel_id }
chat.channel.read        { channel_id, user_id, last_read_at }
chat.typing              { channel_id, user_id, user_name, is_typing }
chat.reaction.updated    { message_id, channel_id, reactions: [...] }
chat.channel.joined      { channel_id, user_id }
chat.channel.left        { channel_id, user_id }
chat.mention             { mention_id, message_id, channel_id, preview }
chat.presence            { user_id, status: "online"|"away"|"offline" }
```

### 3.4 Controller Logic

**MessageController@store (via REST or WebSocket):**
1. Validate user is a member of the channel (ChatMember exists)
2. Validate content not empty and not exceeding 5000 chars
3. Parse @mentions from content (regex `/@([a-zA-Z0-9_.-]+)/`)
4. Create ChatMessage record
5. If file_ids provided, create ChatMessageAttachment records
6. Create ChatMention records for each found @mention
7. Update `last_activity_at` on the channel
8. Broadcast `chat.message.new` to the channel's Socket.IO room
9. Send push notifications to offline members who were @mentioned
10. Return the message resource

**MessageController@destroy:**
1. Find message, verify ownership
2. Soft delete the message
3. Broadcast `chat.message.deleted` to the channel room

**ReadReceiptController@store:**
1. Update `last_read_at` to now for the current user in this channel
2. Broadcast `chat.channel.read` to notify other members (e.g., clear "2 unread" in their UI)
3. Note: we DON'T need per-message read receipts (those are for email). Per-channel is sufficient.

**Typing Handler (WebSocket):**
1. On `chat.typing.start`: Broadcast `chat.typing` to the channel room (exclude sender)
2. Set a 3-second debounce timer on the server side
3. On `chat.typing.stop` or timer expiry: Broadcast `chat.typing` with `is_typing: false`

### 3.5 Service Layer

```
App\Services\Chat\ChannelService
  - createChannel(Workspace $ws, User $creator, array $data): ChatChannel
  - createDmChannel(Workspace $ws, array $userIds): ChatChannel
  - addMembers(ChatChannel $channel, array $userIds): void
  - removeMember(ChatChannel $channel, User $user): void
  - getChannelsWithUnread(User $user, Workspace $ws): Collection

App\Services\Chat\MessageService
  - sendMessage(ChatChannel $channel, User $user, array $data): ChatMessage
  - editMessage(ChatMessage $message, User $user, string $content): void
  - deleteMessage(ChatMessage $message): void
  - getMessages(ChatChannel $channel, ?string $before, int $limit): Collection

App\Services\Chat\MentionService
  - parseMentions(string $content): array
  - createMentions(ChatMessage $message): void
  - notifyMentionedUsers(ChatMessage $message): void

App\Services\Chat\SearchService
  - searchMessages(Workspace $ws, string $query, ?string $channelId): Collection
  - indexMessage(ChatMessage $message): void  // for Algolia/Meilisearch if configured

App\Services\Chat\PresenceService
  - userOnline(User $user): void
  - userOffline(User $user): void
  - getUserStatus(User $user): string
  - getOnlineUsers(Workspace $ws): array
```

### 3.6 Database Indexing Strategy

```php
// Critical queries and their indexes:

// 1. Get messages for a channel (paginated by timestamp)
//    SELECT * FROM chat_messages WHERE channel_id = ? AND deleted_at IS NULL
//    ORDER BY created_at DESC LIMIT 50
//    Index: (channel_id, created_at) WHERE deleted_at IS NULL

// 2. Get unread channels for a user
//    SELECT c.* FROM chat_channels c
//    JOIN chat_members cm ON cm.channel_id = c.id
//    WHERE cm.user_id = ? AND cm.last_read_at < c.last_activity_at
//    Index: chat_members(user_id, last_read_at)

// 3. Search messages
//    Full-text search index on content column:
//    CREATE INDEX chat_messages_content_fts ON chat_messages
//    USING GIN(to_tsvector('english', content));
```

### 3.7 Rate Limiting & Limits

```php
'message_rate_limit' => 30,        // messages per minute per user
'message_max_length' => 5000,       // characters
'channel_name_max_length' => 100,
'channel_member_limit' => 500,      // members per channel
'dm_participant_limit' => 10,       // max users in a DM group
'file_size_limit' => 25 * 1024 * 1024, // 25MB
'history_days' => 365,              // auto-prune messages older than this
'typing_timeout_ms' => 3000,        // stop typing indicator after 3s of no input
'search_max_results' => 100,
'pinned_message_limit' => 10,       // max pinned messages per channel
```

---

## 4. Frontend Design

### 4.1 Chat Panel Layout

The chat opens as a slide-over panel from the right side of any page:

```
┌─────────────────────────────────────────────────────────────┐
│  [Main App Area]                          │ 💬 Chat          │
│                                            │                  │
│                                            │  🔍 [Search...] │
│                                            │                  │
│                                            │ Channels         │
│                                            │ ─────────────── │
│                                            │ # general     (3)│
│                                            │ # random         │
│                                            │ # design         │
│                                            │ # engineering (12│
│                                            │                  │
│                                            │ Direct Messages  │
│                                            │ ─────────────── │
│                                            │ 👤 Sarah Chen  ●│
│                                            │ 👤 John Smith   │
│                                            │ 👤 Mike Lee   ●│
│                                            │                  │
│                                            │ [Create Channel] │
│                                            │ [+ New DM]      │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Message View

```
┌─────────────────────────────────────────────────────────────┐
│  💬  # general                                    [🔔] [●]  │
├─────────────────────────────────────────────────────────────┤
│  Channel Topic: General discussion for Acme Corp             │
│  Pinned: 📌 Q3 planning doc — see #announcements            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👤 Sarah Chen  10:30 AM                           │   │
│  │  Hey team, the Q3 budget review is ready for review │   │
│  │  [👍 3] [💬 Reply] [⋯]                            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  👤 John Smith  10:32 AM                           │   │
│  │  Looks good! I left a comment on the spreadsheet.   │   │
│  │  [👍 1] [💬 Reply] [⋯]                            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  👤 Mike Lee  10:33 AM                             │   │
│  │  @Sarah when is the deadline for this?             │   │
│  │  [💬 Reply] [⋯]                                   │   │
│  │                                                    │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  👤 Sarah Chen  10:35 AM                     │  │   │
│  │  │  @Mike Friday end of day. Here's the link:   │  │   │
│  │  │  → docs.google.com/spreadsheets/...          │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  👤 You  10:36 AM                           ✓✓    │   │
│  │  Sounds good. Let's review it in the meeting tom.  │   │
│  │  [👍 2] [💬 Reply] [⋯]                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [📎]  Write a message...  [😊] [@] [📤]          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Typing Indicator

```
┌────────────────────────────────────────────────────────────┐
│  Sarah Chen is typing...  ···                               │
│                                                             │
│  When 2+ users: Sarah Chen and John Smith are typing...     │
│  When 3+: Sarah, John, and 2 others are typing...           │
└────────────────────────────────────────────────────────────┘
```

### 4.4 @Mention Autocomplete

```
┌──────────────────────────────────────────────────────┐
│  Hey @sa                                           │
│  ┌───────────────────────────────────────────────┐ │
│  │ 👤 Sarah Chen      @sarah.chen               │ │
│  │ 👤 Sam Adams       @sam.adams                │ │
│  │ 👤 Sandra Lee      @sandra.lee               │ │
│  │    (more results...)                          │ │
│  └───────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 4.5 Unread Badges

Unread counts appear in:
1. The chat toggle button in the main nav bar
2. Each channel in the sidebar
3. Each user in the DM list
4. The browser tab title (dynamic: `(3) Aquerii - Workspace`)

```
Nav bar:
[📋 Tasks] [📊 CRM] [🎯 Marketing] [💬 12]

Channel list:
  # general     (3)   ← 3 unread messages
  # random            ← 0 unread
  # engineering (12)  ← 12 unread

DM list:
  👤 Sarah Chen  ●    ← online, 0 unread
  👤 John Smith  (2)  ← offline, 2 unread
```

### 4.6 File Sharing

```
Upload flow:
1. Click [📎] → file picker opens
2. Select file → upload progress bar appears
3. On complete → file preview inline in message area
4. Send message → file appears in chat with preview

Display types:
  Images:        Thumbnail preview, click for lightbox
  Documents:     Icon + filename + size, click to download
  Code:          Syntax-highlighted preview if .js/.ts/.py etc.
  Other:         Generic file icon + name + size

File message rendered:
┌──────────────────────────────────────────────────────┐
│  👤 Sarah Chen  10:40 AM                             │
│  Here's the updated design:                          │
│  ┌────────────────────────────────────────────────┐  │
│  │  🖼️ mockup-v3.png  2.4MB                      │  │
│  │  [Preview] [Download]                          │  │
│  └────────────────────────────────────────────────┘  │
│  [👍] [💬 Reply]                                    │
└──────────────────────────────────────────────────────┘
```

### 4.7 Create Channel Dialog

```
┌──────────────────────────────────────────────────────┐
│  Create Channel                                       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Channel Type:  ● Public (anyone can join)           │
│                 ○ Private (invite only)              │
│                 ○ Direct Message                     │
│                                                      │
│  Name: [project-alpha                       ]        │
│  Topic: [Discussion for Project Alpha         ]       │
│                                                      │
│  Add Members:                                        │
│  [Search members...                     🔍]          │
│  ☑ Sarah Chen                                        │
│  ☑ John Smith                                        │
│  ☐ Mike Lee                                          │
│  ☐ Jane Doe                                          │
│                                                      │
│  [✕ Cancel]                          [Create Channel] │
└──────────────────────────────────────────────────────┘
```

### 4.8 Notification Settings

Settings → Notifications → Chat:

```
┌──────────────────────────────────────────────────────┐
│  Chat Notifications                                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Global:                                             │
│  ● All new messages (desktop + sound)                │
│  ○ Only @mentions and direct messages                │
│  ○ Nothing                                           │
│                                                      │
│  Per-Channel Overrides:                              │
│  ┌────────────────────────────────────────────────┐  │
│  │ # general        ● All  ○ Mentions ○ Muted    │  │
│  │ # random         ○ All  ● Mentions ○ Muted    │  │
│  │ # engineering    ○ All  ○ Mentions ● Muted    │  │
│  │ Sarah Chen (DM)  ● All  ○ Mentions ○ Muted    │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Desktop Notifications: [☑] Show preview             │
│  Sound: [🔔 Notification sound ▼] [▶ Test]         │
│                                                      │
│  [Save Settings]                                     │
└──────────────────────────────────────────────────────┘
```

### 4.9 Search

```
┌──────────────────────────────────────────────────────┐
│  🔍 Search Chat                                      │
├──────────────────────────────────────────────────────┤
│  [Q3 budget                            🔍]           │
│                                                      │
│  In channel: [All Channels ▼]  From: [Anyone ▼]     │
│                                                      │
│  Results (12):                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ # general  Sarah Chen  "Q3 budget review..."   │  │
│  │            May 28, 2026                        │  │
│  ├────────────────────────────────────────────────┤  │
│  │ # general  John Smith   "Q3 budget looks..."   │  │
│  │            May 28, 2026                        │  │
│  ├────────────────────────────────────────────────┤  │
│  │ # finance  Mike Lee     "Q3 budget allocat..." │  │
│  │            May 27, 2026                        │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  [Showing 1-10 of 12 results]   [Load More]          │
└──────────────────────────────────────────────────────┘
```

---

## 5. Implementation Complexity Analysis

| Component | Complexity | Risk | Notes |
|-----------|-----------|------|-------|
| Socket.IO room management | MEDIUM | LOW | Extend existing Socket.IO setup with persistent rooms per channel. Well-documented pattern. |
| Message persistence + pagination | MEDIUM | LOW | Standard CRUD with timestamp-based cursor pagination. |
| Read receipts (per-channel) | LOW | LOW | Single UPDATE per read action. Simple. |
| Typing indicators | LOW | LOW | Debounced broadcast, no persistence. Easy. |
| @Mention parsing | LOW | LOW | Regex extraction, create Mention records, send notifications. |
| Emoji reactions | LOW | LOW | Polymorphic pivot table, straightforward CRUD. |
| File sharing via uploads | MEDIUM | LOW | Reuse existing Upload module. Generate thumbnails for images. |
| Message search | MEDIUM | MEDIUM | Full-text search in PostgreSQL works but is slow at scale. Consider Meilisearch or Typesense for production. |
| Presence detection | MEDIUM | MEDIUM | Socket.IO built-in presence works for connected clients, but detecting "away" status requires idle detection. |
| Push notifications | MEDIUM | MEDIUM | Already have notification infrastructure. Need to handle chat-specific push: which messages trigger push vs. which are just badge updates. |
| Unread badge sync | MEDIUM | LOW | Need to broadcast unread count changes so all devices sync. Tricky but doable. |
| Channel management UI | LOW | LOW | Standard CRUD with member picker. |
| DM channel creation | LOW | LOW | Auto-create or resolve existing DM channel between users. |

**Total estimated effort:** 3-5 weeks for a senior full-stack developer with real-time experience
**Ongoing cost:** Socket.IO server resources scale with concurrent connections. PostgreSQL write load from messages.
**Key risk:** Presence detection across multiple browser tabs and devices. User opens Aquerii in 3 tabs — appears as 3 connections. Need to deduplicate to 1 "online" status. Use Socket.IO's `connection.count` with a room per user.

**Why P1:** This is the highest-impact missing collaboration feature. Every competitor (ClickUp, Monday.com, Notion) has built-in chat. Users currently context-switch to Slack/Teams to discuss tasks that live in Aquerii. Closing this gap dramatically increases daily engagement and reduces time-to-value.
