# 20 — Communication Hub

---

## Routes

```
/workspaces/{workspaceId}/inbox          → InboxPage (notifications — EXISTS)
/workspaces/{workspaceId}/chat           → ChatPage (❌ DOES NOT EXIST)
/workspaces/{workspaceId}/chat/{roomId}  → ChatRoomPage (❌ DOES NOT EXIST)
```

---

## Data Source

**BRUTAL CALL-OUT: The superprompt describes a full "Communication Hub" with internal chat, project email addresses, conversation-to-task conversion, @mentions with cross-linking, draft sync across devices, and pending action collection. NONE of this exists in the backend. The only real thing is the notification system (Socket.IO push, GET/PATCH /api/notifications, preferences, mark-read). The entire chat system, tagging infrastructure, email-as-a-service, and pending actions are vaporware. What follows is a spec for what needs to be built — every section except InboxPage is aspirational.**

---

## InboxPage — Unified Notifications (EXISTS)

### Route

```
/workspaces/{workspaceId}/inbox → InboxPage
```

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Inbox                                         [Filter ▾] [Mark All Read]   │
│                                                                              │
│  TODAY                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  ● [@]  Jane mentioned you in "Design System Review"    2h ago   [✓]  │  │
│  │  ● [📋] You were assigned "Fix login redirect"           3h ago   [✓]  │  │
│  │  ● [💬] Bob replied to your comment on SO-042            5h ago   [✓]  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  YESTERDAY                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  ○ [🔔] SO-041 marked Complete by Alice                 May 1     [✓]  │  │
│  │  ○ [⚠️] Billing: invoice INV-042 due in 7 days         May 1     [✓]  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [View all notifications →]                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Backend: GET /api/workspaces/{id}/notifications, PATCH /api/notifications/{id}/read, POST /api/notifications/read-all, GET/PUT /api/notifications/preferences — all fully implemented. Socket.IO for real-time push. See FILE 14 for full notification design.

### Filter Bar

Filter dropdown at top-right: "All", "Unread", "Mentions", "Assignments", "System", "Urgent Only".

Filtering is client-side for responsiveness. On larger inboxes (>500 notifications), switch to server-side filtering — ❌ **backend must add `?filter=` query param**.

- **All**: shows everything (default).
- **Unread**: only notifications where `read_at` is null.
- **Mentions**: `type === 'mention'` only.
- **Assignments**: `type === 'assignment'` only.
- **System**: `type === 'system_alert'` only.
- **Urgent Only**: notifications with `priority === 'urgent'` field — ❌ **notifications currently have no priority field. Backend must add it or this filter is useless.**

### Urgency Badges

Each notification can optionally display a colored urgency badge:
- **High/Urgent**: red badge top-left, "URGENT" text. ❌ **No priority field on notifications.**
- **Normal**: no badge.
- **Low**: gray badge, subtle. ❌ **No priority field.**

### Notification Preference Inline

Bottom of InboxPage has a link: "Customize which notifications you receive." Navigates to Settings → Notifications (EXISTS).

---

## ChatPage — Real-Time Messaging (❌ DOES NOT EXIST)

### Route

```
/workspaces/{workspaceId}/chat → ChatPage
/workspaces/{workspaceId}/chat/{roomId} → ChatRoomPage
```

### Layout (2-Panel)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Chat                                                  [Search messages...]  │
├────────────────────────┬─────────────────────────────────────────────────────┤
│  Rooms                 │  # general                                         │
│  ──────────────────    │                                                     │
│  # general         ● 32│  Jane Smith                    Yesterday at 3:42PM │
│  # design          ● 12│  > The design specs are ready for review. Check    │
│  # engineering     ● 8 │  > the `specs/` folder in the design system repo.  │
│  # sales           ● 3 │                                                     │
│  ──────────────────    │  Alice Wang                     10:24 AM           │
│  Direct Messages       │  > Good catch. Let's discuss in standup tomorrow.   │
│  ──────────────────    │                                                     │
│  ○ Jane Smith    🟢    │  Bob Chen                        9:15 AM           │
│  ○ John Doe      🟢    │  > PR #142 is ready for review.                    │
│  ○ Alice Wang    🟢    │                                                     │
│  ○ Bob Chen      ⚪    │  ┌──────────────────────────────────────────────┐  │
│  ○ ...                 │  │  [Message #general...]        [Send] [📎]    │  │
│                        │  └──────────────────────────────────────────────┘  │
│  [+ New Room]          │                                                     │
│                        │  🟢 3 online                          📁 5 pinned  │
└────────────────────────┴─────────────────────────────────────────────────────┘
```

**BRUTAL CALL-OUT: Every single UI element above requires backend infrastructure that does not exist. No chat rooms table, no messages table, no WebSocket rooms for chat, no message history, no file attachments for chat. This is a complete new subsystem.**

### Left Panel (Room List)

- **Channel list** (`#` prefix): group rooms. Unread count badge (red circle). Active room highlighted.
- **Direct messages** (`○` prefix): user-to-user conversations. Green dot for online users (socket presence — this IS possible with existing Socket.IO infrastructure), gray for offline.
- **Room search**: text input at top. Filters rooms by name. Debounced 200ms.
- **"+ New Room" button**: Opens Create Room modal: Name*, Description (optional), Member multi-select, Type (Public/Private). POST /api/workspaces/{id}/chat/rooms — ❌ **requires new endpoint**.

### Right Panel (Message Area)

- **Header**: Room name (# general), member count, topic/description text. Action buttons: room info, pin toggle, search.
- **Message list**: scroll-to-bottom on open, infinite scroll upward for history.
- **Each message**:
  - Avatar (32px) + Name + Timestamp (hover tooltip shows full date).
  - Message body (markdown rendered, code blocks, inline images).
  - Reactions: emoji picker on hover. ❌ **Requires message reactions table.**
  - Thread reply: "3 replies" link. Opens thread panel on right. ❌ **Requires threading model.**
  - Edit/Delete: "..." menu on hover. Edit: inline replaces message body (shows "edited"). Delete: confirm dialog, soft-delete (shows "message deleted"). ❌ **Requires message update/delete endpoints.**
- **Date separator**: "Yesterday," "May 15, 2026" — inserted between messages grouped by date.
- **System messages**: "Alice added Bob to #engineering" — gray italic, no avatar.
- **Input area**: Rich text area (TipTap minimal — bold, italic, code, link), @mention autocomplete, file attachment button. Send on Enter (Shift+Enter for newline), Send button as fallback.

### Features Requiring Backend Work

| Feature | Requirements |
|---------|-------------|
| **Room CRUD** | New table `chat_rooms`, endpoints POST/GET/DELETE .../chat/rooms |
| **Message CRUD** | New table `chat_messages`, endpoints GET/POST/PUT/DELETE .../chat/rooms/{roomId}/messages |
| **Real-time delivery** | Socket.IO rooms: `chat:message` event, `chat:typing` event |
| **File attachments** | Multipart upload support on POST message, file hosting |
| **Reactions** | New table `chat_reactions`, endpoints |
| **Threads** | New table `chat_threads` or `parent_id` on messages |
| **Read receipts** | Track last_read_message_id per user per room |
| **Unread counts** | Computed from last_read tracking |
| **Online presence** | Socket.IO connection tracking (exists for notifications, extend to chat) |
| **Message search** | Full-text search across messages to the chat API |
| **Pinned messages** | pin field on message + dedicated list endpoint |

### Loading State

- Room list: 5 skeleton rows (60px height each, shimmer).
- Message area: 5 message bubbles (varying widths, shimmer).
- Initial load: fetch rooms GET /api/workspaces/{id}/chat/rooms (❌), then first page of messages for active room (❌).

### Empty State

```
         💬
   No messages yet
  Start the conversation in #general.
```

### Create Room Modal

```
┌──────────────────────────────────────────────┐
│  Create New Room                              │
│                                               │
│  Name*: [_________]                           │
│                                               │
│  Description (optional):                      │
│  [__________________________________________]  │
│                                               │
│  Type: ● Public  ○ Private                    │
│                                               │
│  Members:                                     │
│  [Search team members...]                     │
│  ☑ Jane Smith   ☑ John Doe                   │
│  ☑ Alice Wang   ☐ Bob Chen                   │
│  ☐ ...                                        │
│                                               │
│  [Cancel]      [Create Room]                  │
└──────────────────────────────────────────────┘
```

---

## Actionable Conversations — Convert to Task (❌ DOES NOT EXIST)

### Context Menu on Messages

Right-click (or long-press on mobile) on any chat message or email:

```
┌──────────────────────────┐
│  Copy Text               │
│  Reply                   │
│  ─────────────────────── │
│  ★ Create Task           │
│  📅 Create Event         │
│  📋 Add to Inbox         │
│  ─────────────────────── │
│  Pin Message             │
│  Report                  │
└──────────────────────────┘
```

### Create Task from Conversation

When "Create Task" is selected from a message context:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Create Task from Message                                      [Esc to close]│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  From: Jane Smith in #general — "The design specs are ready for review"  ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Title*: [Review design specs]                                               │
│  Board*:   [Design System Board ▾]                                          │
│  Status:   [To Do ▾]                                                         │
│  Priority: [Medium ▾]                                                        │
│  Assignee: [Jane Smith ▾]                                                    │
│  Due Date: [05/15/2026]                                                      │
│                                                                              │
│  ☑ Include conversation link in task description                             │
│                                                                              │
│  [Cancel]     [Create Task]                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**BRUTAL CALL-OUT: "Create Task from Conversation" requires bidirectional linking between messages and items. This means either: (a) a polymorphic `source` field on items, or (b) a new `related_conversations` junction table. Neither exists. The modal above is a pure design aspiration.**

- **Conversation preview**: read-only, shows original author, room, timestamp, first 100 chars.
- **Board selector**: dropdown of boards in the current workspace (EXISTS — GET /api/workspaces/{id}/boards).
- **Include link**: checkbox that adds a reference link in the item's description in format: `From [Jane Smith in #general](link-to-message)`.
- On submit: POST /api/workspaces/{id}/boards/{boardId}/items with new item data + optional `source_message_id` field — ❌ **requires schema change to items table**.

---

## Tagging — @mentions and #hashtags (❌ DOES NOT EXIST)

### @Mention Autocomplete

Typing `@` in any rich text field triggers an autocomplete dropdown:

```
@jane               👤 Jane Smith — Senior Developer
@john               👤 John Doe — Product Manager
@engineering        👥 #engineering (12 members)
@design             👥 #design (8 members)
```

- **Individuals**: `@Jane Smith` resolves to user profile link. Data source: GET /api/employees (EXISTS).
- **Teams**: `@engineering` mentions entire channel or department group. ❌ **Requires new "team groups" entity or mapping chat rooms to mention aliases.**
- **Cross-linking**: mentioned items should appear in that user's notifications and in the "Mentions" filter of InboxPage. ❌ **Notifications do not currently support dynamic mention generation.**
- **Rendering**: `@Jane Smith` rendered as `<a class="mention" href="/employees/{id}">@Jane Smith</a>` — blue, bold.
- **Tooltip on hover**: Avatar + Name + Role + quick action "Send message" (opens chat — ❌ **no chat**).

### #Hashtag Cross-Linking

```
#project-neptune     → filter all items with tag "project-neptune"
#SO-042              → link to item SO-042
#general             → link to #general chat room
```

- **Item references**: `#SO-043` auto-links to the item page. Derived from project key prefix + number.
- **Tag references**: `#project-neptune` links to filtered board view by tag. ❌ **Tag search across boards is not currently an endpoint.**
- **Room references**: `#general` links to chat room. ❌ **No chat rooms exist.**

---

## Email-as-a-Service — Project Email Addresses (❌ DOES NOT EXIST)

### UI: Email Settings Tab

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Email Settings                                                 (Enterprise) │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Project Email Addresses                                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  📧 project@acme.aquerii.app                              [Copy] [✕] │  │
│  │     → Creates items in "Project Board" / "Incoming" column             │  │
│  │  📧 bugs@acme.aquerii.app                                 [Copy] [✕] │  │
│  │     → Creates items in "Bug Tracker" / "Backlog" column               │  │
│  │  📧 support@acme.aquerii.app                               [Copy] [✕] │  │
│  │     → Creates items in "Support" / "New" column                       │  │
│  │                                                                        │  │
│  │  [+ Generate Address]     [Regenerate All]                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Inbound Email Processing                                                    │
│  ○ Send to project inbox only (creates task)                                │
│  ● Send to project inbox + notify assignees (creates task + notification)   │
│  ○ Forward to all project members (email-only, no task)                     │
│                                                                              │
│  [Save Settings]                                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

**BRUTAL CALL-OUT: Project email addresses require: (a) a custom email domain/ingestion service (SendGrid Inbound Parse, SES, etc.), (b) a worker that converts inbound emails to items, (c) a mapping table of email → board+column. Zero of these exist. This is an enterprise feature that requires significant infrastructure.**

- **Each row**: email address, description, target board+column, copy button, delete button.
- **"+ Generate Address"**: opens dropdown with board+column selectors. Auto-generates alias like `project@{workspace}.aquerii.app`.
- **Inbound processing**: radio buttons for behavior when email arrives.
- **Enterprise badge**: feature is enterprise-only. Show lock icon for non-enterprise workspaces.
- **V1**: Not implemented. Show placeholder page with "Enterprise Feature — Coming Soon."

---

## Pending Actions (❌ DOES NOT EXIST)

### UI: Pending Action Sidebar

Accessible from the global header as an icon next to notifications:

```
┌───────────────────────────────────────────┐
│  Pending Actions                      [3] │
│                                           │
│  Messages Requiring Response              │
│  ┌─────────────────────────────────────┐  │
│  │  💬 Jane Smith (2h ago)             │  │
│  │  "Can you review the PR when you    │  │
│  │   get a chance?"                    │  │
│  │  [Reply] [Mark Done] [Create Task]  │  │
│  ├─────────────────────────────────────┤  │
│  │  💬 Bob Chen (1d ago)              │  │
│  │  "What's the ETA on SO-042?"       │  │
│  │  [Reply] [Mark Done] [Create Task]  │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  Overdue Tasks                            │
│  ┌─────────────────────────────────────┐  │
│  │  📋 SO-040 — Fix login bug          │  │
│  │     Due: Apr 28 (3 days overdue)    │  │
│  │     [Update Status] [Postpone]      │  │
│  │  📋 SO-038 — Update docs            │  │
│  │     Due: Apr 25 (6 days overdue)    │  │
│  │     [Update Status] [Postpone]      │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  [View All Pending →]                     │
└───────────────────────────────────────────┘
```

**BRUTAL CALL-OUT: Pending Actions require: (a) an AI or heuristic engine that classifies messages as "requiring response," (b) cross-reference between chat messages (❌) and task assignments (✅). This is not a simple filter — it's a semantic classification feature. The "Overdue Tasks" section CAN work in v1 (items have due_date and assignee — filter items where due_date < now and assignee === current user). Ship that, skip the message classification.**

- **Badge count**: 3 = overdue tasks + unread messages from DMs.
- **V1**: Show only overdue assigned items. Group under "Overdue Tasks." Drop the "Messages Requiring Response" section entirely.
- **V2+**: Once chat exists, add DM messages from the last 48 hours that current user hasn't replied to. "Replied to" = current user sent a message in the same thread after the question.

---

## States

### Loading State (InboxPage)

- Skeleton rows (5) with icon circle (24px) + 2 text lines each.
- Real-time socket updates bypass loading — append to top.

### Empty State

```
         📬
   No new notifications
  You're all caught up! When someone mentions you,
  assigns you a task, or replies to your comment,
  it will appear here.
```

### Chat Loading / Empty / Error States

- **Loading**: skeleton room list + skeleton message list.
- **Empty**: "No messages in this room." + "Start a conversation" placeholder text in input area (disabled if no chat backend).
- **Error**: "Chat is not available." with retry button. If chat backend returns 501, show enterprise upgrade prompt.

---

## BRUTAL CALL-OUTS — Full Summary

| Feature | Status | Action Required |
|---------|--------|-----------------|
| **Notifications list** | ✅ Full backend | None |
| **Mark read / mark all read** | ✅ Full backend | None |
| **Notification preferences** | ✅ Full backend | None |
| **Socket.IO real-time push** | ✅ Exists | Extend for chat events |
| **Socket online presence** | ⚠️ Possible | Exists for presence, not exposed for chat |
| **Notification priority/urgency** | ❌ **No field** | Add `priority` to notifications schema |
| **Chat rooms** | ❌ **Does not exist** | New DB table + full CRUD endpoints |
| **Chat messages** | ❌ **Does not exist** | New DB table + full CRUD endpoints |
| **Chat file attachments** | ❌ **Does not exist** | Multipart upload + file hosting |
| **Chat reactions** | ❌ **Does not exist** | New DB table + endpoints |
| **Chat threads** | ❌ **Does not exist** | `parent_id` or separate threads table |
| **Chat read receipts** | ❌ **Does not exist** | `last_read_message_id` per user per room |
| **Conversation → Task** | ❌ **Does not exist** | Schema change for items + source reference |
| **@mention system** | ❌ **Does not exist** | New notification trigger + parsing infrastructure |
| **#hashtag cross-linking** | ❌ **Does not exist** | Tag resolution endpoint needed |
| **Team mention groups** | ❌ **Does not exist** | New entity or mapping to departments/rooms |
| **Project email addresses** | ❌ **Does not exist** | Email ingestion service + mapping table + worker |
| **Pending actions (messages)** | ❌ **Does not exist** | Semantic classification of messages |
| **Pending actions (overdue tasks)** | ✅ Computable client-side | Filter items by assignee + past due_date |
| **Draft sync across devices** | ❌ **Does not exist** | New drafts API + client conflict resolution |
