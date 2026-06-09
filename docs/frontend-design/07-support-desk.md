# Support Desk — Frontend Design

## Overview

The Support module is a customer service ticket system with knowledge base and SLA management. It handles inbound support requests, internal collaboration via notes, and agent assignment. Expect high volume (hundreds of tickets/day) — performance and real-time updates are non-negotiable.

## Architecture

### Routes

```
/workspaces/{workspaceId}/support                     → TicketsPage
/workspaces/{workspaceId}/support/tickets             → TicketsPage (default)
/workspaces/{workspaceId}/support/tickets/{ticketId}  → TicketDetailPage
/workspaces/{workspaceId}/support/knowledge-base      → KnowledgeBasePage
/workspaces/{workspaceId}/support/slas                → SlaPage
```

### Component Tree

```
TicketsPage
├── TicketsToolbar
│   ├── SearchInput (searches ticket title, description, customer name)
│   ├── StatusFilter (multi-select: open, in_progress, resolved, closed)
│   ├── PriorityFilter (multi-select: low, medium, high, urgent)
│   ├── AssigneeFilter (multi-select: agents)
│   ├── SlaFilter (at_risk, breached, ok)
│   ├── DateRangeFilter (created date)
│   ├── BulkActionBar (appears when tickets selected)
│   │   ├── AssignBulk → AssigneePicker
│   │   ├── ChangeStatusBulk → StatusDropdown
│   │   └── ChangePriorityBulk → PriorityDropdown
│   └── CreateTicketButton → CreateTicketModal
├── TicketsDataTable (sortable, paginated, server-side)
│   ├── Columns:
│   │   ├── ID (#1234)
│   │   ├── Status (colored badge)
│   │   ├── Priority (colored badge with icon)
│   │   ├── Title (with highlight if search active)
│   │   ├── Customer (name, email)
│   │   ├── Assignee (avatar or "Unassigned")
│   │   ├── SLA (green/yellow/red timer icon + remaining time)
│   │   ├── Last Updated (relative time)
│   │   └── Checkbox (for bulk selection)
│   └── Row click → navigate to TicketDetailPage
├── Empty state: "No tickets match your filters. Adjust filters or create a new ticket."
├── Error state: error banner + retry button
└── Loading: 15 skeleton rows (7 columns, alternating pulse)

CreateTicketModal
├── Title (required)
├── Description (textarea, required)
├── Priority (dropdown, default: medium)
├── CustomerSearch (search existing contacts or enter email)
├── Assignee (optional, dropdown of agents)
└── Submit / Cancel

TicketDetailPage
├── TicketHeader
│   ├── TicketID + Title (editable)
│   ├── StatusWorkflow (visual step indicator)
│   │   └── Steps: Open → In Progress → Resolved → Closed
│   │   └── Click step to change → confirmation if going backwards (resolved → open requires reason)
│   ├── PriorityBadge (clickable to change)
│   ├── AssignedAgent (dropdown to reassign)
│   ├── SLATimer (remaining time, color-coded)
│   └── ActionsMenu (delete, merge — future)
├── TicketContent
│   ├── [MainPanel]
│   │   ├── MessageThread
│   │   │   ├── MessageBubble (public — visible to customer)
│   │   │   │   ├── Author avatar + name
│   │   │   │   ├── Timestamp
│   │   │   │   ├── Body (markdown rendered, collapsible if long)
│   │   │   │   └── AttachmentThumbnails (download, preview)
│   │   │   └── InternalNote (private — only agents see)
│   │   │       ├── Locker icon + "Internal Note" label
│   │   │       ├── Author avatar + name
│   │   │       ├── Timestamp
│   │   │       └── Body (markdown rendered)
│   │   ├── MessageComposer
│   │   │   ├── Toggle: Public reply / Internal note
│   │   │   ├── Rich text area (basic toolbar: bold, italic, lists, code block)
│   │   │   ├── Attachment upload (drag-drop or file picker)
│   │   │   └── Send button → POST .../messages
│   │   └── ActivityTimeline (right panel or below thread)
│   │       └── TimelineEntry (icon + text + timestamp, read-only)
│   │           ├── "Status changed to In Progress" by AgentName
│   │           ├── "Assigned to AgentName" by UserName
│   │           ├── "Priority changed to High" by AgentName
│   │           └── etc
│   └── [Sidebar]
│       ├── CustomerInfoCard
│       │   ├── Name, email, phone
│       │   ├── Total tickets count
│       │   ├── Link to CRM contact (if exists)
│       │   └── Previous tickets list (last 5, clickable)
│       ├── TagsSection
│       │   ├── TagList (existing tags with remove button)
│       │   └── AddTag (autocomplete dropdown)
│       ├── LinkedItemsSection (future — link to deals, boards, etc)
│       └── SlaProgressBar (visual bar: used time vs allowed time, color gradient)
│
├── Loading: skeleton layout — header bar, left panel thread skeleton (5 bubbles), sidebar skeleton
├── Empty: ticket with no messages — "No messages yet. Reply to start the conversation."
└── Error: error banner + retry + "Go back to ticket list" link

KnowledgeBasePage
├── KbToolbar
│   ├── SearchInput (searches title + content, full-text)
│   ├── CategoryFilter (dropdown of all categories)
│   ├── CreateArticleButton → KbEditorPage
│   └── Categories management button → CategoryEditorModal
├── KbArticleList
│   ├── ArticleCard (title, excerpt, category badge, updated date, author)
│   └── Paginated (20 per page, server-side)
├── [KbEditorPage] (full-page editor, separate route or modal)
│   ├── Title (input)
│   ├── Category (dropdown, create new if needed)
│   ├── Body (rich text editor — Tiptap or similar)
│   ├── Tags (input, comma-separated)
│   ├── Save (PUT .../knowledge-base/{id})
│   └── Preview mode
├── Empty: "No articles yet. Create the first knowledge base article."
├── Loading: 10 skeleton cards
└── Error: banner + retry

SlaPage
├── SlaList
│   ├── SlaCard (name, response time, resolution time, escalation rules summary)
│   ├── CreateSlaButton → SlaFormModal
│   └── Edit/Delete per card
├── SlaFormModal
│   ├── Name (required)
│   ├── ResponseTime (number + unit: minutes/hours/days)
│   ├── ResolutionTime (number + unit)
│   ├── EscalationRules
│   │   ├── Rule 1: if response_time_remaining < 25% → notify {role/user}
│   │   ├── Rule 2: if resolution_time_remaining < 25% → notify {role/user}
│   │   └── Add another rule button
│   ├── ApplicableTags (which ticket tags trigger this SLA)
│   └── Save / Cancel
├── Empty: "No SLA policies configured. Create one to start tracking response times."
├── Loading: 5 skeleton cards
└── Error: banner + retry
```

## Data Flow

### Ticket Operations

| Action | Endpoint | Optimistic | Notes |
|---|---|---|---|
| List tickets | GET /api/support/tickets | No | Server-side pagination, filter params as query |
| Create ticket | POST /api/support/tickets | Yes | |
| Update ticket | PUT .../tickets/{ticketId} | Yes | |
| Change status | PUT .../tickets/{ticketId}/status | Yes | body: { status } |
| Assign ticket | PUT .../tickets/{ticketId}/assign | Yes | body: { assignee_id } |
| Delete ticket | DELETE .../tickets/{ticketId} | Yes | |
| List messages | GET .../tickets/{ticketId}/messages | No | |
| Create message | POST .../tickets/{ticketId}/messages | Yes | body: { content, type: 'public'/'internal', attachments? } |

### Real-Time Socket Integration

Tickets are a real-time domain. When a support agent is viewing a ticket and a new message comes in, it must appear immediately.

```
Namespace: workspace:{workspaceId}
Channel: support:tickets

Events:
  ticket_created       → add to list
  ticket_updated       → merge into list
  ticket_status_change → badge flash + toast
  message_created      → append to message thread (only if viewing that ticket)
  ticket_assigned      → toast if assigned to current user
```

**Socket presence for ticket viewing:** Show "AgentName is viewing this ticket" at top of TicketDetailPage. This prevents two agents from replying simultaneously.

### SLA Countdown

The SLA timer is a countdown rendered from data in the ticket response. The ticket MUST include `sla_remaining_seconds` and `sla_status` ('ok', 'at_risk', 'breached').

The client renders a progress bar:
- Green: >50% time remaining
- Yellow: 25-50% remaining
- Red: <25% remaining or breached
- Red + pulsing icon if breached

The countdown ticks client-side using the server-provided `sla_remaining_seconds` as the initial value. On each socket update (ticket_updated), the server provides a fresh `sla_remaining_seconds`. This avoids drift.

**CRITIQUE:** This design assumes `sla_remaining_seconds` is in the ticket response. If it's not, the frontend needs to compute it from `sla_policy_id` + `created_at` + the SLA policy's response/resolution windows. That means fetching the SLA policy client-side and computing locally — fragile and drift-prone. **The backend MUST include `sla_remaining_seconds` and `sla_status` in every ticket response.**

## Loading / Empty / Error States

### Ticket List
- **Loading:** 15 skeleton rows. Status filter shows skeleton badges, not full dropdowns.
- **Empty (no tickets):** "No tickets yet. When customers submit requests, they'll appear here."
- **Empty (filtered):** "No tickets match your filters." + "Clear Filters" link.
- **Error:** Error banner with retry. Persists filter state on error so user doesn't lose context.

### Ticket Detail
- **Loading (initial):** Skeleton layout matching the full page structure — left panel skeleton bubbles, right panel skeleton cards.
- **Loading (message send):** Show pending message with spinner + "Sending..." text. Replace with actual message on 201. Remove on error + show retry button.
- **Error (load failure):** "Failed to load ticket. Retry." + link back to ticket list.
- **Error (send failure):** "Failed to send message." + inline retry on failed message bubble.

### Knowledge Base
- **Loading:** 10 skeleton article cards (title bar + 2 text lines each).
- **Empty:** "No articles yet. Create the first article." + CTA.
- **Search with no results:** "No articles match 'search term'. Try different keywords."
- **Error:** Banner + retry.

### SLA Page
- **Loading:** 5 skeleton cards.
- **Empty:** "No SLA policies. Create one to enforce response time targets."
- **Error:** Banner + retry.

## Performance

| Concern | Strategy |
|---|---|
| Ticket list (5k+ tickets) | Server-side pagination (25 per page). Debounce filters by 300ms. |
| Message thread (500+ msgs) | Virtualize message list. Lazy-load attachments. |
| Real-time socket flood | Batch updates with 100ms debounce. Append only — never re-render entire list. |
| Image attachments | Lazy load. Don't block message thread render on image fetch. Use blur placeholder. |
| Knowledge base search | Debounce 200ms. Server-side full-text search (not client-side filter of fetched data). |

## Accessibility

- Status workflow step indicator: `role="progressbar"` with `aria-valuenow` for current step.
- Message composer: `aria-label="Public reply"` / `aria-label="Internal note"`.
- SLA timer uses `aria-live="polite"` — don't announce every second tick.
- Bulk select checkboxes: proper labels, announced as "Select ticket [ID]".
- Modal (create ticket, SLA form): focus trap, close on Escape, `aria-modal="true"`.

## CRITIQUE: Weak Ideas & Risks

1. **No email channel.** A support desk without email integration is a form builder. The API has no endpoint for receiving/sending emails. Every ticket would need to be created manually. **Fix:** Add `POST /api/support/emails/receive` (webhook target) and `POST /api/support/tickets/{id}/reply-as-email`.

2. **No customer portal.** The API only has agent-facing endpoints. Customers can't view their own tickets, submit new ones, or see knowledge base articles. Without `GET /api/public/tickets/{token}` endpoints, this is internal-only.

3. **No webhook events.** The superprompt mentions real-time updates but there's no webhook system for external integrations. Support desks often need to notify Slack, Discord, or custom webhooks on ticket events.

4. **Attachments are undocumented.** Messages can have `attachments?` in the create body, but there's no upload endpoint or attachment model documented. Where are files stored? What's the size limit? What types are allowed?

5. **Customer identity is undefined.** Tickets have a `customer` but there's no customer model. Is it a reference to CRM `contacts`? Or an inline name/email? The design above assumes searchable contacts, but if there's no CRM contact endpoint linked, this breaks.

6. **No satisfaction survey / CSAT.** Every support desk needs post-resolution feedback. Add `POST /api/support/tickets/{id}/satisfaction` and a rating widget in the UI.

7. **SLAs have no enforcement mechanism.** The SLA form and timer are purely informational. There's no automatic action when an SLA is breached — no escalation endpoint, no notification. The SLA timer is just a countdown to nowhere.
