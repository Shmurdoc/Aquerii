# Frontend UI Redesign Specification

> **Last updated**: 2026-05-23
> **Status**: Specification. Implementation plan in `FRONTEND_ROADMAP.md`.
> **Baseline**: `FRONTEND_ARCHITECTURE.md` documents what exists today.
> **Constraint**: No component library (MUI, Ant, Chakra). Tailwind only. No color system changes.

---

## 1. Problem Statement

Aquerii has the feature depth of Linear or Notion but the navigation model of a 4-page CRUD app. The current UI has:

- A flat 4-item sidebar with no hierarchy or entity access
- A full-screen overlay modal for item detail that loses board context
- A command palette that only navigates — it never creates or acts
- A settings page that is a literal placeholder string
- A notification panel that only polls, never receives push
- Boards, CRM, Documents all requiring an intermediate list page before you reach any entity

Users can't jump to a specific board, deal, or document from the sidebar. Every operation requires 2–3 clicks to get to context. Features that exist in the database have no UI surface.

---

## 2. Design Principles

1. **Context never breaks.** Opening an item doesn't hide the board it lives on.
2. **The sidebar is navigation, not decoration.** It should show entity lists, not just section headers.
3. **The command palette is the power-user surface.** Create, assign, navigate — all from ⌘K.
4. **One inbox.** All activity (mentions, assignments, due dates, deal changes) flows through a single real-time feed.
5. **Inline creation.** No modal dialogs for creating items. Inline `+` that accepts a title and saves on Enter.
6. **DB-ready features get UI.** If the column exists and the API works, there must be a way to reach it.

---

## 3. Layout Redesign

### 3.1 Current Layout

```
┌─────────────────────────────────────────────────────────┐
│  TopBar (48px)                                          │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │  <Outlet />                                  │
│  240px   │                                              │
│  4 items │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### 3.2 Target Layout — Two-Panel Navigation

```
┌──────────────────────────────────────────────────────────────────┐
│  TopBar (48px) — search (⌘K) | bell → /inbox | avatar           │
├────────┬─────────────────┬───────────────────────────────────────┤
│ Rail   │  Context Panel  │                                       │
│ 48px   │    200px        │          <Outlet />                   │
│        │                 │       (page content)                  │
│ icons  │  entity list    │                                       │
│        │  for active     │                                       │
│        │  section        │                                       │
└────────┴─────────────────┴───────────────────────────────────────┘
```

### 3.3 Left Rail (48px, always visible)

Fixed-width icon-only rail. One icon per top-level section. Active section highlighted.

| Icon | Section | Context panel shows |
|------|---------|---------------------|
| `LayoutGrid` | Boards | Board list with inline + |
| `FileText` | Documents | Notes list + Files tab |
| `Users` | CRM | Pipeline list + deal counts |
| `Inbox` | Inbox | Notification feed (new) |
| `Package` | Inventory | InvenTree proxy (new) |
| `Settings` | Settings | Settings sections (new) |

### 3.4 Context Panel (200px, collapses to 0 on narrow viewports)

Shows the entity list for the active section. Always mounted; content swaps when rail section changes.

**Boards context panel:**
```
BOARDS                          [+]
─────────────────────────────────
  ▸ Sprint Q2
  ▸ Product Roadmap
  ▸ Bug Triage
  ▸ Marketing
─────────────────────────────────
  + New Board
```

Clicking a board navigates directly to `/boards/:id` — no intermediate list page.

**CRM context panel:**
```
CRM PIPELINES                   [+]
─────────────────────────────────
  ▸ Sales Pipeline  (12 deals)
  ▸ Enterprise      (4 deals)
─────────────────────────────────
  + New Pipeline
```

**Documents context panel:**
```
DOCUMENTS
─────────────────────────────────
Notes
  ▸ Meeting Notes
  ▸ Architecture Draft
  ▸ Product Spec v2
─────────────────────────────────
Files                    [Paperless]
─────────────────────────────────
  + New Note
```

**Settings context panel:**
```
SETTINGS
─────────────────────────────────
  ▸ Workspace
  ▸ Members & Roles
  ▸ Billing & Plans
  ▸ Notifications
  ▸ Integrations
  ▸ Security (MFA)
  ▸ API Keys
```

### 3.5 New Files to Create

```
src/layouts/AppLayout.tsx         (modify — add rail + context panel)
src/components/layout/Rail.tsx    (new — 48px icon rail)
src/components/layout/ContextPanel.tsx  (new — 200px entity list shell)
src/components/layout/BoardsNav.tsx     (new — boards context panel content)
src/components/layout/CrmNav.tsx        (new — CRM pipelines context panel content)
src/components/layout/DocumentsNav.tsx  (new — documents context panel content)
src/components/layout/SettingsNav.tsx   (new — settings sections nav)
```

---

## 4. Item Detail — Replace Modal with Right Drawer

### 4.1 Problem

`ItemDetailModal.tsx` is a full-screen overlay. Opening an item completely hides the board. Users lose spatial context. There's no way to reference the board while reading or editing an item.

### 4.2 Target — Right-Panel Drawer

```
┌────────────────────────────────────────────────────────────────┐
│  TopBar                                                        │
├────────┬───────────────────┬────────┬───────────────────────── │
│ Rail   │ Context Panel     │ Board  │  Item Detail Drawer      │
│        │                   │ (50%)  │       (50%)              │
│        │                   │        │  Title                   │
│        │                   │ Kanban │  Description             │
│        │                   │ behind │  Subitems                │
│        │                   │ drawer │  ─────────────           │
│        │                   │        │  Activity log            │
│        │                   │        │  Comments                │
│        │                   │        │  Time tracking           │
│        │                   │        │  Relations               │
└────────┴───────────────────┴────────┴──────────────────────────┘
```

The board is still visible and partially interactive behind the drawer. The drawer slides in from the right edge. Clicking outside the drawer closes it.

### 4.3 Drawer Layout (Two Columns)

```
┌────────────────────────────────────────────┐
│  [Title — editable inline]            [×]  │
│  Status ▼   Priority ▼   Due: Jun 4        │
├──────────────────────┬─────────────────────┤
│  LEFT COLUMN         │  RIGHT COLUMN       │
│                      │                     │
│  Description         │  Activity log       │
│  (BlockNote or       │  (timeline of       │
│   plain textarea)    │   changes)          │
│                      │                     │
│  Subitems            │  Comments           │
│  [ ] Sub 1           │  @madoc: looks good │
│  [ ] Sub 2           │  ─────────────────  │
│  + Add subitem       │  [Add comment...]   │
│                      │                     │
│  Attachments         │  Time tracking      │
│  [file] report.pdf   │  Tracked: 2h 30m    │
│  + Attach            │  Estimated: 4h      │
│                      │  [+ Log time]       │
│  Relations           │                     │
│  Blocked by: #24     │  Reminders          │
│  Blocks: #31         │  Jun 3, 9:00am ✓    │
│                      │  + Add reminder     │
└──────────────────────┴─────────────────────┘
```

### 4.4 New File

```
src/components/board/ItemDetailDrawer.tsx   (new — replaces ItemDetailModal.tsx)
```

`ItemDetailModal.tsx` stays as a fallback for mobile (full-screen on small viewports).

---

## 5. Command Palette — Universal Action Surface

### 5.1 Problem

`CommandPalette.tsx` only navigates to 4 pages. The Meilisearch search endpoint exists and is wired. The palette doesn't create anything, doesn't act on context, and doesn't surface search results meaningfully.

### 5.2 Target Behavior

```
⌘K opens palette

[Type to search or use a command]
─────────────────────────────────────────────────────
ACTIONS
  + New Item          (in current board)
  + New Board
  + New Document
  + New Deal

JUMP TO
  ▸ Sprint Q2         [board]
  ▸ Product Roadmap   [board]
  ▸ Meeting Notes     [doc]
  ▸ Acme Corp deal    [crm]

SEARCH RESULTS (after typing 2+ chars)
  [item]  Fix login bug               Sprint Q2
  [doc]   Architecture Draft v2       Documents
  [deal]  Acme Corp — $45k            Sales Pipeline
─────────────────────────────────────────────────────
↑↓ navigate   Enter select   Esc close
```

### 5.3 Sections

**Actions** (always shown when query is empty):
- "New Item" — if a board is currently active, creates item in that board
- "New Board" — opens inline name prompt
- "New Document"
- "New Deal"

**Jump to** (always shown when query is empty):
- Recent 5 boards
- Recent 3 documents
- Active pipelines

**Search results** (shown when query.length >= 2):
- Calls `GET /workspaces/:ws/search?q=...`
- Groups by type: items, boards, documents, deals
- Keyboard navigable
- Enter navigates to the entity

### 5.4 File Changes

```
src/components/layout/CommandPalette.tsx   (modify — add actions + search result grouping)
```

---

## 6. Inbox — First-Class Notification Page

### 6.1 Problem

`NotificationPanel.tsx` is a slide-over triggered from the TopBar bell. It polls every 30s. There is no full notification page. The socket push exists in the backend job but `notificationStore.addNotification` is never called from any hook.

### 6.2 Target

Add `/inbox` as a full-page route in the sidebar rail. The bell in TopBar redirects to `/inbox` instead of opening a panel.

```
INBOX
─────────────────────────────────────────────────────────────────
  Today
  ────────────────────────────────────────────────────────────
  [●] @madoc mentioned you in "Fix login bug"          2m ago
      Sprint Q2 · comment
      "Have you seen the API logs? @madoc please check"

  [●] Alex assigned you to "Deploy staging"            1h ago
      Sprint Q2 · item

  [○] Due date: "Update billing docs" is due tomorrow  3h ago
      Product board · item

  Yesterday
  ────────────────────────────────────────────────────────────
  [○] Deal "Acme Corp" moved to Proposal stage         2d ago
      Sales Pipeline · CRM

  [Mark all read]                           [Filter ▼]
```

### 6.3 Socket Push Fix

Wire `notificationStore.addNotification` from `useNotifications.ts`:

```typescript
// In useNotifications.ts — add socket subscription
useEffect(() => {
  socket.on('notification:new', (payload) => {
    notificationStore.getState().addNotification(payload)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })
  return () => socket.off('notification:new')
}, [])
```

### 6.4 New Files

```
src/pages/inbox/InboxPage.tsx              (new — full notification feed)
src/components/notifications/InboxItem.tsx (new — single notification row)
```

---

## 7. Inline Quick-Add

### 7.1 Problem

Every creation flow in the app uses modals or navigates away. The CRM "Add deal" is the only inline creation that exists (`CRMPage.tsx:117-123`) and it hardcodes "New Deal" with no title prompt.

### 7.2 Target Pattern

Every list that can be added to shows a `+` that expands to an inline title input:

```
  ▸ Fix login bug
  ▸ Review PR #42
  ▸ Deploy staging
  ────────────────
  [ New item title_  ]   Enter ✓  Esc ✗
```

Enter saves with title only. All other fields default (status: first column, no assignee, no due date). Users can open the item drawer after creation to add detail.

### 7.3 Applies To

- Board kanban columns (inline item creation at bottom of column)
- Board table view (inline row creation at bottom of group)
- CRM stages (inline deal creation — fix the existing "New Deal" placeholder)
- Boards context panel (inline board creation)
- Documents context panel (inline note creation)

### 7.4 Shared Component

```
src/components/shared/InlineCreate.tsx   (new — reusable inline title input)
```

Props:
```typescript
interface InlineCreateProps {
  placeholder: string
  onSave: (title: string) => Promise<void>
  onCancel: () => void
  autoFocus?: boolean
}
```

---

## 8. Settings Page — Replace Placeholder

### 8.1 Problem

`SettingsPage.tsx` is 8 lines and contains "coming in Phase 3."

### 8.2 Target Sections

Each section is a route under `/settings/:section`:

| Route | Content |
|-------|---------|
| `/settings/workspace` | Workspace name, slug, logo, timezone |
| `/settings/members` | Member list, invite by email, role change, remove |
| `/settings/billing` | Current plan, usage meters, upgrade/downgrade, invoices |
| `/settings/notifications` | Per-notification-type email + in-app toggle |
| `/settings/integrations` | InvenTree token, Paperless URL, Google/GitHub OAuth status |
| `/settings/security` | MFA enable/disable, active sessions, token list |
| `/settings/api-keys` | Personal API tokens CRUD |

### 8.3 New Files

```
src/pages/settings/SettingsPage.tsx         (modify — replace placeholder with layout)
src/pages/settings/WorkspaceSettings.tsx    (new)
src/pages/settings/MembersSettings.tsx      (new)
src/pages/settings/BillingSettings.tsx      (new)
src/pages/settings/NotificationSettings.tsx (new)
src/pages/settings/IntegrationsSettings.tsx (new)
src/pages/settings/SecuritySettings.tsx     (new)
src/pages/settings/ApiKeysSettings.tsx      (new)
```

---

## 9. Board View Filters

### 9.1 Problem

The Item API accepts `group`, `assignee`, `status`, `due_before` filter params and pagination. Zero filter UI is exposed on any board view.

### 9.2 Target — Filter Bar

A collapsible filter bar below the `BoardTopBar`:

```
[Kanban ▼]  [Table]  [Calendar]  [Whiteboard]    ·    [Filter ▼]  [Group by ▼]  [Sort ▼]
────────────────────────────────────────────────────────────────────────────────────────────
Active filters:  Assignee: madoc  ×    Status: In Progress  ×    [Clear all]
```

Clicking "Filter" opens a dropdown with:
- Assignee (multi-select from workspace members)
- Status (multi-select from board columns)
- Priority (multi-select)
- Due before (date picker)

Filter state lives in URL query params so filters survive navigation.

### 9.3 File Changes

```
src/components/board/BoardTopBar.tsx    (modify — add filter bar below view switcher)
src/components/board/FilterBar.tsx      (new — filter controls)
src/hooks/useBoardFilters.ts            (new — parse/set URL query params)
```

---

## 10. Item Activity Log (Wire Existing Endpoint)

### 10.1 Problem

`GET /workspaces/:ws/items/:id/activity` endpoint exists. Route registered. No UI renders it.

### 10.2 Target

The right column of `ItemDetailDrawer` includes an Activity section:

```
Activity
─────────────────────────────────────
  madoc changed status to Done      2h
  madoc assigned to Alex           1d
  Created by madoc                  3d
```

### 10.3 File Changes

```
src/components/board/ItemDetailDrawer.tsx   — add activity tab/section
src/hooks/useItemActivity.ts                (new — React Query for /items/:id/activity)
```

---

## 11. CRM Multi-Pipeline Support

### 11.1 Problem

`CRMPage.tsx:24` hardcodes `const pipeline = pipelines[0]`. If a workspace has multiple pipelines, only the first is ever shown.

### 11.2 Target

The CRM context panel (section 3.4) lists all pipelines. Clicking a pipeline navigates to `/crm/:pipelineId`. `CRMPage` reads the `pipelineId` from route params instead of hardcoding index 0.

### 11.3 File Changes

```
src/pages/crm/CRMPage.tsx     (modify — read pipelineId from params)
src/App.tsx                   (modify — add /crm/:pipelineId route)
```

---

## 12. What Intentionally Does NOT Change

- **Color system**: dark indigo-on-gray-950 stays. The problem is layout, not aesthetics.
- **Component library**: No adoption of MUI/Ant/Chakra. Tailwind utility approach continues.
- **Tech stack**: React 18, TanStack Query, Zustand, Socket.IO client. No replacements.
- **Backend**: All changes are frontend-only. No new API endpoints required for Phase 1–3 of the roadmap.
- **Tailwind config**: No new design tokens or color expansions.
- **`ItemDetailModal.tsx`**: Not deleted. Used as mobile fallback and in contexts where a drawer doesn't make sense (e.g., opening from a notification).
