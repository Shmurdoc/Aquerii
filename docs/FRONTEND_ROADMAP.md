# Frontend UI Redesign — Implementation Roadmap

> **Last updated**: 2026-05-23
> **Design spec**: `FRONTEND_UI_REDESIGN.md`
> **Current baseline**: `FRONTEND_ARCHITECTURE.md`
> **Constraint**: All phases are frontend-only. No new backend API endpoints required unless noted.

---

## Overview

The frontend redesign is organized into 4 phases in strict priority order:

| Phase | Name | Effort | Impact |
|-------|------|--------|--------|
| 1 | Fix Real Bugs | 1–2 days | Removes broken behavior |
| 2 | Layout & Navigation | 3–5 days | Unlocks full feature access |
| 3 | Wire DB-Ready Features | 3–5 days | Surfaces built-but-hidden work |
| 4 | Power-User Surface | 1–2 weeks | Competitive parity |

---

## Phase 1 — Fix Real Bugs

> **Goal**: Nothing that exists should visibly break.
> **Backend changes**: `done` column migration required (B2 only).

### B1 — Description type mismatch

**File**: `services/web/src/components/board/ItemDetailModal.tsx`

**Problem**: The `description` field is stored as a JSONB array (BlockNote document format) but the item detail textarea treats it as a plain string. Users see `[object Object]` when a description was previously saved.

**Fix**:
- Detect whether `item.description` is a string or array
- If array: render read-only via BlockNote editor (same as `DocumentPage.tsx`)
- If string: render as textarea (legacy fallback)
- New items: save as plain string from textarea until BlockNote is wired

**Acceptance criteria**:
- [ ] Existing descriptions with JSONB content render without `[object Object]`
- [ ] New descriptions save and reload correctly
- [ ] No regression on items with no description

---

### B2 — `done` column missing on subitems

**Files**: `services/api/database/migrations/`, `services/api/app/Core/Models/Item.php`

**Problem**: `ItemDetailModal.tsx` writes `done: true/false` on subitem updates, but the `items` table has no `done` column. The update silently fails.

**Fix**:
1. Create migration: `add_done_to_items_table` — `$table->boolean('done')->default(false);`
2. Add `done` to `Item::$fillable`
3. Frontend checkbox already sends the field — no frontend change needed

**Acceptance criteria**:
- [ ] Migration runs without error
- [ ] Subitem checkbox state persists across page reloads
- [ ] PHP tests pass after migration

---

### B3 — Comment author shows UUID

**File**: `services/api/app/Core/Http/Controllers/Api/CommentController.php`

**Problem**: Comments return `created_by` as a UUID. No user join. The frontend renders the raw UUID where a name should appear.

**Fix**:
- In `CommentController@index`, eager-load `author` relationship: `$item->comments()->with('author:id,name,avatar_url')->get()`
- Ensure `Comment` model has `belongsTo(User::class, 'created_by')` relationship

**Acceptance criteria**:
- [ ] Comments show author name and avatar, not UUID
- [ ] No N+1 query (eager load confirmed)

---

### B4 — Paperless thumbnail 404

**File**: `services/api/routes/api.php` + `services/api/app/Core/Http/Controllers/Api/PaperlessProxyController.php`

**Problem**: `paperless.ts` constructs thumbnail URLs pointing to `/api/paperless/documents/:id/thumb/` but no route exists for this path in `api.php`. All document thumbnails return 404.

**Fix**:
- The existing wildcard Paperless proxy route should already catch this — verify the route pattern includes `{path?}` and that Caddy passes the request through
- If not: add explicit route `GET /workspaces/{ws}/paperless/documents/{id}/thumb` proxied to Paperless

**Acceptance criteria**:
- [ ] Document thumbnails load in `PaperlessFileDrawer.tsx`
- [ ] No 404 in network tab for thumbnail requests

---

### B5 — Tag IDs shown instead of tag names

**File**: `services/web/src/components/documents/PaperlessFileDrawer.tsx`

**Problem**: The Paperless API returns tag IDs as integers on documents. The drawer renders the raw IDs. Tag names require a separate `GET /api/v1/tags/` call.

**Fix**:
- Add `useQuery` for `GET /workspaces/:ws/paperless/tags/` (proxied to Paperless)
- Build a `tagMap: Record<number, string>` from the response
- Render tag names instead of IDs

**Acceptance criteria**:
- [ ] Tags display as readable names (e.g., "Invoice", "Contract")
- [ ] Tag list cached with React Query (5 min stale time)

---

### B6 — Calendar "+N more" doesn't expand

**File**: `services/web/src/components/board/CalendarView.tsx`

**Problem**: Days with more than 3 items show a "+N more" text but clicking it does nothing.

**Fix**:
- Add `expandedDay: string | null` state
- On click of "+N more", set `expandedDay` to the day key
- When `expandedDay` matches, render all items for that day (or a popover with the full list)

**Acceptance criteria**:
- [ ] Clicking "+N more" shows all items for that day
- [ ] Clicking outside collapses back to 3-item view

---

## Phase 2 — Layout & Navigation

> **Goal**: Users can navigate directly to any board, pipeline, or document from the sidebar. No intermediate list pages.
> **Backend changes**: None.

### L1 — Two-Panel Navigation Shell

**New files**:
- `src/components/layout/Rail.tsx` — 48px icon-only rail
- `src/components/layout/ContextPanel.tsx` — 200px collapsible entity panel shell
- `src/components/layout/BoardsNav.tsx` — boards list with inline `+`
- `src/components/layout/CrmNav.tsx` — pipelines list
- `src/components/layout/DocumentsNav.tsx` — notes + files tabs
- `src/components/layout/SettingsNav.tsx` — settings section links

**Modified files**:
- `src/layouts/AppLayout.tsx` — replace `<Sidebar />` with `<Rail />` + `<ContextPanel />`
- `src/components/layout/Sidebar.tsx` — keep for reference, no longer used in AppLayout

**Behavior**:
- Rail icons: Boards, Documents, CRM, Inbox, Inventory, Settings
- Clicking a rail icon activates that section and shows its context panel
- Active board is highlighted in the context panel with indigo left border
- Context panel collapses to 0 on viewports < 1024px (board takes full width)

**Acceptance criteria**:
- [ ] Clicking a board in `BoardsNav` navigates to `/boards/:id` directly
- [ ] Clicking a pipeline in `CrmNav` navigates to `/crm/:pipelineId`
- [ ] Active entity highlighted in context panel
- [ ] Panel collapses on narrow viewports without breaking layout
- [ ] All existing E2E tests still pass

---

### L2 — Item Detail Drawer

**New file**: `src/components/board/ItemDetailDrawer.tsx`

**Modified files**:
- `src/components/board/KanbanView.tsx` — open drawer instead of modal on card click
- `src/components/board/TableView.tsx` — open drawer instead of modal on row click
- `src/App.tsx` or `BoardPage.tsx` — manage drawer open state at page level

**Behavior**:
- Drawer slides in from right edge, 50% of remaining viewport width (min 480px, max 800px)
- Board remains visible and scrollable behind drawer at 50% width
- Two-column layout inside drawer: content (left) + activity/comments (right)
- Close on Escape, on clicking outside drawer, or on explicit close button
- On mobile (< 768px): renders as full-screen overlay (existing modal behavior)

**Content columns** (see `FRONTEND_UI_REDESIGN.md §4.3` for full layout):
- Left: title (inline edit), status, priority, due date, description, subitems, attachments, relations
- Right: activity log (wired to `/items/:id/activity`), comments, time tracking, reminders

**Acceptance criteria**:
- [ ] Board remains visible behind open drawer
- [ ] Drawer opens from `KanbanView` and `TableView`
- [ ] Escape closes the drawer
- [ ] All item fields that existed in `ItemDetailModal` are present in drawer
- [ ] On viewport < 768px, opens as full-screen (existing modal behavior)
- [ ] All existing E2E tests still pass

---

### L3 — Inbox Page

**New files**:
- `src/pages/inbox/InboxPage.tsx`
- `src/components/notifications/InboxItem.tsx`

**Modified files**:
- `src/App.tsx` — add `/inbox` route
- `src/components/layout/TopBar.tsx` — bell icon navigates to `/inbox` instead of opening slide-over
- `src/hooks/useNotifications.ts` — add socket subscription that calls `notificationStore.addNotification`

**Behavior**:
- Grouped by day: Today, Yesterday, older
- Each notification shows: type icon, actor name, action description, entity link, time ago
- Click navigates to the entity (board item, deal, document)
- "Mark all read" button at top
- Unread count badge on Rail inbox icon
- Socket push: `socket.on('notification:new', ...)` calls `notificationStore.addNotification` and invalidates React Query cache

**Acceptance criteria**:
- [ ] `/inbox` route renders notification feed
- [ ] Notifications grouped by day
- [ ] Mark read/mark all read works
- [ ] Bell → `/inbox` navigation works
- [ ] Socket push updates unread count without page reload (requires 30s poll to be verified still as fallback)

---

### L4 — CRM Multi-Pipeline

**Modified files**:
- `src/pages/crm/CRMPage.tsx` — read `pipelineId` from route params
- `src/App.tsx` — add `/crm/:pipelineId` route, keep `/crm` as redirect to first pipeline

**Behavior**:
- `/crm` redirects to `/crm/:firstPipelineId`
- CRM context panel lists all pipelines
- Each pipeline link goes to `/crm/:pipelineId`

**Acceptance criteria**:
- [ ] Multiple pipelines accessible via context panel
- [ ] `/crm` without param still works (redirects)
- [ ] CRM data loads correctly per pipeline

---

## Phase 3 — Wire DB-Ready Features

> **Goal**: Every column that exists in the DB gets a UI surface.
> **Backend changes**: None. All endpoints already exist.

### W1 — Activity Log in Item Drawer

**Endpoint**: `GET /workspaces/:ws/items/:id/activity`

**New file**: `src/hooks/useItemActivity.ts`

**Modified file**: `src/components/board/ItemDetailDrawer.tsx`

Shows a chronological list of changes to the item (status changes, assignee changes, due date updates, creation). Renders in the right column of the drawer.

**Acceptance criteria**:
- [ ] Activity log visible in drawer right column
- [ ] Shows actor name, action, timestamp
- [ ] Loads via React Query with 30s stale time

---

### W2 — Reminders UI

**Endpoint**: `PATCH /workspaces/:ws/items/:id` (update `reminder_at`)

**Modified file**: `src/components/board/ItemDetailDrawer.tsx`

Add a date+time picker to the drawer sidebar for `reminder_at`. When set, display the reminder date. When the reminder fires, a notification appears in Inbox.

**Acceptance criteria**:
- [ ] Reminder date/time picker in item drawer
- [ ] Setting a reminder saves `reminder_at` via PATCH
- [ ] Existing reminder shown with option to clear

---

### W3 — Time Tracking UI

**Endpoint**: `PATCH /workspaces/:ws/items/:id` (update `tracked_hours`, `estimated_hours`)

**Modified file**: `src/components/board/ItemDetailDrawer.tsx`

Add estimated hours input and a "Log time" button that adds to `tracked_hours`. Show a progress bar: tracked / estimated.

**Acceptance criteria**:
- [ ] Estimated hours editable in drawer
- [ ] "Log time" button adds hours to tracked total
- [ ] Progress bar renders tracked/estimated ratio

---

### W4 — Global Search in Command Palette

**Endpoint**: `GET /workspaces/:ws/search?q=` (Meilisearch, already wired)

**Modified file**: `src/components/layout/CommandPalette.tsx`

Upgrade search results display:
- Group by type: items, boards, documents, deals
- Show entity type badge and parent context (board name for items, pipeline for deals)
- Keyboard navigation (↑↓, Enter to navigate)
- Minimum 2 chars to trigger

**Acceptance criteria**:
- [ ] Results grouped by type with type labels
- [ ] Parent context shown (board name, pipeline name)
- [ ] Keyboard navigation works
- [ ] Enter navigates to entity

---

### W5 — Board Filters

**Endpoint**: `GET /workspaces/:ws/boards/:id/items?assignee=&status=&due_before=` (already supported)

**New files**:
- `src/components/board/FilterBar.tsx`
- `src/hooks/useBoardFilters.ts`

**Modified file**: `src/components/board/BoardTopBar.tsx`

Add a collapsible filter bar below the view switcher. Filters stored in URL query params.

**Acceptance criteria**:
- [ ] Filter by assignee (multi-select)
- [ ] Filter by status (multi-select)
- [ ] Filter by due before (date)
- [ ] Active filters shown as removable chips
- [ ] Filter params persist in URL
- [ ] Clear all resets to unfiltered view

---

### W6 — Inline Quick-Add

**New file**: `src/components/shared/InlineCreate.tsx`

**Modified files**:
- `src/components/board/KanbanView.tsx` — replace "Add item" button with `InlineCreate`
- `src/components/board/TableView.tsx` — inline row creation at group bottom
- `src/pages/crm/CRMPage.tsx` — replace "Add deal" with `InlineCreate` that prompts for title
- `src/components/layout/BoardsNav.tsx` — inline board creation in context panel
- `src/components/layout/DocumentsNav.tsx` — inline note creation in context panel

**Acceptance criteria**:
- [ ] Kanban columns show inline input at bottom, Enter creates item
- [ ] Table view shows inline row at group bottom
- [ ] CRM stages prompt for deal title before creating
- [ ] Context panel board/note creation via inline input
- [ ] Escape cancels without creating

---

## Phase 4 — Power-User Surface

> **Goal**: Competitive parity with Linear/Notion for keyboard-first users.
> **Effort**: Larger — batch operations and keyboard shortcuts are cross-cutting.

### P1 — Command Palette Actions

**Modified file**: `src/components/layout/CommandPalette.tsx`

Extend the palette beyond navigation to accept action commands:

| Command | Action |
|---------|--------|
| `New item [title]` | Create item in active board |
| `New board [name]` | Create new board |
| `New note [title]` | Create new document |
| `New deal [title]` | Create deal in active pipeline |
| `Assign @[user]` | If item drawer is open, assign that user |
| `Set due [date]` | If item drawer is open, set due date |
| `Set status [name]` | If item drawer is open, change status |

**Acceptance criteria**:
- [ ] Action commands work when typed in palette
- [ ] Context-aware actions (item actions only available when drawer is open)

---

### P2 — Keyboard Shortcuts

**New file**: `src/hooks/useKeyboardShortcuts.ts`

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open command palette (already exists) |
| `⌘/` | Show keyboard shortcuts overlay |
| `N` | New item (when board is focused, no input active) |
| `E` | Open item drawer (when item card is focused) |
| `Escape` | Close drawer / palette |
| `J / K` | Navigate items in table view |
| `⌘Enter` | Save and close item drawer |
| `⌘⇧M` | Assign to me (item drawer open) |

**Acceptance criteria**:
- [ ] All shortcuts work without triggering when typing in inputs
- [ ] `⌘/` shows shortcut reference overlay
- [ ] Shortcuts documented in settings or overlay

---

### P3 — Batch Item Operations

**Modified files**: `KanbanView.tsx`, `TableView.tsx`

Select multiple items with checkbox or Shift+Click, then apply bulk actions:
- Change status
- Change assignee
- Change priority
- Move to column
- Delete

**Acceptance criteria**:
- [ ] Multi-select with checkbox in table view
- [ ] Shift+click range select in table view
- [ ] Bulk action toolbar appears when items are selected
- [ ] Bulk status/assignee/priority change works

---

### P4 — Settings Page

**New files**: See `FRONTEND_UI_REDESIGN.md §8.3` for full file list

Implement all 7 settings sections. Workspace, Members, Billing, Notifications, Integrations, Security, API Keys.

**Acceptance criteria**:
- [ ] All 7 sections render (may be read-only display for some in first pass)
- [ ] Workspace name and slug editable and saved
- [ ] Member list shows current members with roles
- [ ] Billing section shows current plan
- [ ] Security section shows active sessions

---

## Execution Rules

1. **Phases are sequential.** Do not start Phase 2 until Phase 1 bugs are fixed and tests pass.
2. **Each item must not break existing E2E tests.** Run `npx playwright test --project=chromium --workers=1` after every Phase 1 and Phase 2 item.
3. **No deletions without replacement.** `ItemDetailModal.tsx` is not deleted until `ItemDetailDrawer.tsx` is verified working and mobile fallback is confirmed.
4. **New components get stories or minimal test.** At minimum, each new component gets a Vitest unit test verifying it renders without errors.
5. **Backend is frozen during Phase 1–3.** If a Phase 3 feature needs a new endpoint, document the gap and defer to a separate backend task.

---

## Test Coverage Targets

| Phase | New tests required |
|-------|--------------------|
| 1 (Bugs) | 1 test per bug fix verifying the fix |
| 2 (Layout) | Render tests for Rail, ContextPanel, ItemDetailDrawer, InboxPage |
| 3 (Wire features) | React Query hook tests for each new hook |
| 4 (Power user) | Integration tests for keyboard shortcuts, batch operations |

---

## Estimated Effort

| Phase | Estimated days | Complexity |
|-------|---------------|------------|
| 1 — Bugs | 1–2 days | Low — targeted fixes |
| 2 — Layout | 4–6 days | High — cross-cutting layout changes |
| 3 — Wire features | 3–5 days | Medium — hook + UI work |
| 4 — Power user | 7–10 days | High — batch ops + keyboard shortcuts are complex |
| **Total** | **15–23 days** | |

---

## Dependency Map

```
Phase 1 (Bugs)
  └── Phase 2 (Layout)
        ├── L1 (Two-panel nav) — prerequisite for L2, L3
        ├── L2 (Item drawer) — prerequisite for W1, W2, W3
        ├── L3 (Inbox) — prerequisite for W4 notifications
        └── L4 (CRM multi-pipeline) — independent
              └── Phase 3 (Wire features) — all depend on Phase 2 complete
                    └── Phase 4 (Power user) — depends on Phase 3 complete
```
