# Board & Task Management — Frontend Design

## Overview

The Boards module is the operational spine of Aquerii. It provides Kanban, Table, Timeline, and Calendar views over the same item data model. Every workspace gets its own set of boards. This is not a toy Trello clone — it's a structured work system with versioned optimistic concurrency, real-time collaboration, and flexible column/group layouts.

## Architecture

### Routes

```
/workspaces/{workspaceId}/boards              → BoardsPage (gallery)
/workspaces/{workspaceId}/boards/{boardId}    → BoardPage (view routed by query param ?view=kanban|table|timeline|calendar)
```

### Component Tree

```
BoardsPage
├── BoardGalleryHeader (search, create button)
├── BoardCardGrid
│   └── BoardCard (icon, color, name, description, edit/delete menu)
└── CreateBoardModal / EditBoardModal

BoardPage (top-level orchestrator)
├── BoardToolbar
│   ├── ViewSwitcher (Kanban | Table | Timeline | Calendar)
│   ├── FilterBar (assignee, status, priority, due_date, tags)
│   ├── SearchInput (local + API debounced)
│   └── BoardSettingsButton (edit name, description, icon, color, default_view)
├── ColumnGroupLayout (renders differently per view mode)
│   ├── [KanbanView]
│   │   └── KanbanColumn (x N)
│   │       ├── ColumnHeader (name, item count, config menu)
│   │       ├── [GroupHeader (x N) if groups enabled]
│   │       │   ├── GroupToggle (collapse/expand)
│   │       │   └── GroupItemList (droppable)
│   │       │       └── ItemCard (draggable, x N)
│   │       │           ├── QuickTitle (click-to-edit)
│   │       │           ├── StatusBadge / PriorityBadge / DueDateChip
│   │       │           ├── AssigneeAvatar
│   │       │           └── TagList (truncated)
│   │       ├── AddItemButton (inline, creates in current column+group)
│   │       └── DragOverlay (ghost card while dragging)
│   ├── [TableView]
│   │   └── DataTable (sortable columns, inline edit, batch select)
│   ├── [TimelineView] (Gantt-like, grouped by column/group/assignee)
│   └── [CalendarView] (month/week/day, items as calendar events)
├── ItemDetailSlideover (right panel, shared across all views)
│   ├── Title (editable heading)
│   ├── Description (Tiptap editor, JSON output)
│   ├── MetadataPanel (status, priority, due_date, assignee, tags)
│   ├── AttachmentList (upload, delete, preview)
│   ├── CommentThread (create, edit, delete)
│   ├── ActivityLog (read-only timeline of changes)
│   └── VersionInfo (last modified by, version number)
├── PresenceIndicator (avatars of who's viewing/editing)
└── SocketStatusBadge (connected / reconnecting / offline)

ColumnManagerDrawer
└── ColumnList (add, rename, delete, reorder via drag handle)

GroupManagerDrawer
└── GroupList (add, rename, color picker, collapse/expand, delete)
```

## Data Flow

### API Integration

| Action | Endpoint | Optimistic | Notes |
|---|---|---|---|
| List boards | GET /api/workspaces/{id}/boards | No | Cache keyed by workspaceId |
| Create board | POST /api/workspaces/{id}/boards | Yes | Generate temp ID, replace on 201 |
| Edit board | PUT /api/workspaces/{id}/boards/{boardId} | Yes | Revert on 4xx |
| Delete board | DELETE /api/workspaces/{id}/boards/{boardId} | Yes | Remove from gallery immediately |
| Reorder boards | POST /api/workspaces/{id}/boards/{boardId}/reorder | Yes | Optimistic position swap |
| Duplicate board | POST /api/workspaces/{id}/boards/{boardId}/duplicate | No | Show loading overlay |
| List items | GET /api/workspaces/{id}/boards/{boardId}/items | No | Cache, invalidate on socket event |
| Create item | POST /api/workspaces/{id}/boards/{boardId}/items | Yes | Temp ID, socket broadcasts |
| Update item | PUT .../items/{itemId} | Yes | Include `expected_version` |
| Delete item | DELETE .../items/{itemId} | Yes | |
| Move item | POST /api/items/{id}/move | Yes | body: {group_id, position, expected_version} |

### Optimistic Updates & Version Conflicts

Items carry a `version` field incremented on every server-side write. The client MUST:

1. On drag-end (move) or inline edit (PUT), immediately apply the UI change.
2. Send `expected_version` matching the item's current `version`.
3. On 409 Conflict — server version doesn't match — revert the optimistic update, flash a toast ("Someone else modified this item"), and re-fetch the canonical state.
4. On success — update local cache with new `version` from response body.

This is non-negotiable. Without it, two users dragging the same item simultaneously silently lose data.

### Real-Time Socket Integration

Connect when BoardPage mounts, disconnect on unmount.

```
Socket events (namespaced to workspace):
  board:{boardId}:item_created     → prepend/apport to column
  board:{boardId}:item_updated     → merge into existing item
  board:{boardId}:item_moved       → remove from old column/group, insert at new
  board:{boardId}:item_deleted     → remove from list
  board:{boardId}:presence_join    → add avatar to PresenceIndicator
  board:{boardId}:presence_leave   → remove avatar
  board:{boardId}:user_editing     → show "editing" status on presence avatar
```

The socket updates must be applied on top of the cached list, not trigger a full refetch. Full refetch only on reconnect after disconnect > 30s.

### State Management

```
type BoardPageState = {
  board: Board | null;
  items: Item[];
  columns: BoardColumn[];
  groups: BoardGroup[];
  loading: 'idle' | 'loading' | 'error';
  error: string | null;
  filters: FilterState;
  searchQuery: string;
  view: 'kanban' | 'table' | 'timeline' | 'calendar';
  selectedItem: Item | null; // slideover
  columnManagerOpen: boolean;
  groupManagerOpen: boolean;
  presence: PresenceUser[];
  socketStatus: 'connected' | 'reconnecting' | 'offline';
};
```

Use `useReducer` with a context provider. Don't reach for a state management library for a single-page concern — reducer + context is sufficient and testable.

## View Specifications

### Kanban View (Primary)

- Horizontal scrollable container of columns.
- Each column is a vertical drop zone. Width configurable via Column.settings (default 280px, min 220px, max 480px).
- Groups within columns render as stacked sections. Each group is its own drop zone.
- Cards within groups: fixed-height title + badges. Expand on click opens slideover.
- Drag-and-drop between groups (re-parenting) AND between columns (re-parenting + re-stage).
- On drag start: show ghost overlay at cursor, dim original card.
- On drag end: call move API with new group_id + position + expected_version.
- If groups are collapsed: show only the group header with item count badge.
- "Unsorted" group for items that have no group_id.

### Table View

- One row per item. Sortable by clicking column headers.
- Inline edit: click any cell to edit (title → input, status → dropdown, etc).
- Checkbox column for batch operations (delete, move).
- Group rows by column/group via dropdown toggle.

### Timeline View

- Gantt-like. Items plotted by due_date (or start/end if added later).
- Horizontal bars per item, grouped by column.
- Drag bar edges to change due_date.
- Zoom: day/week/month.

### Calendar View

- Month grid with items as colored dots/cards.
- Drag item to a date to change due_date.
- Day view and week view options.

### Filter Bar

All filter state is AND-combined:

- **Assignee**: multi-select dropdown of workspace members.
- **Status**: multi-select of column status values.
- **Priority**: multi-select (none, low, medium, high, urgent).
- **Due Date**: presets (today, this week, overdue, no date) + custom range.
- **Tags**: multi-select of all tags present in board.

Filters apply to all views. Items not matching are hidden (not removed from DOM — use conditional rendering for performance).

### Search

200ms debounced input. Searches title and description server-side via query param on items endpoint. On empty query, revert to cached full list.

## Loading / Empty / Error States

### Loading

- Board gallery: 6 skeleton cards (pulse animation, colored block + text lines).
- Board page: skeleton layout matching view mode. For Kanban: 4 skeleton columns with 3-4 skeleton cards each. For Table: skeleton rows (12 rows × 5 columns).
- Timeline and Calendar: 6 skeleton rows of bars / skeleton month grid.

### Empty

- Board gallery empty: centered illustration + "No boards yet. Create your first board to get started." + primary CTA button.
- Board with no items: "This board is empty. Add your first item." + inline add button per column. Secondary: "Import from CSV" (future).
- No search results: "No items match your search. Try different keywords." Filtered-only: "No items match the current filters. Clear filters."

### Error

- Gallery: error banner + retry button. Cannot function without board list.
- Board: error banner + retry. If specific item load fails, show inline error on that card only.
- Network offline: persistent banner "You're offline. Changes will sync when reconnected." Queue mutations and replay.

## Performance Considerations

| Concern | Strategy |
|---|---|
| Board with 500+ items | Virtualize card lists per column. Use `react-virtuoso` column-scoped. |
| Board with 20+ columns | Lazy-render columns outside viewport. Horizontal scroll virtualization. |
| Tiptap re-renders | Memoize editor instances. Only update JSON on blur/save. |
| Drag-and-drop library | Use `@dnd-kit` — lightweight, tree-shakeable, accessible. NOT react-beautiful-dnd (unmaintained). |
| Socket floods | Batch item updates with 50ms debounce window. Apply en masse. |
| Column width resize | CSS `resize: horizontal` with min/max constraints. No JS drag-resizer needed. |

## Accessibility

- All drag-and-drop must have keyboard alternatives: Arrow keys + Space to pick up/place.
- Column headers are `<section>` landmarks with `aria-label`.
- Card tab order matches visual order.
- Slideover traps focus when open.
- Toast messages have `role="status"` / `aria-live="polite"`.

## CRITIQUE: Weak Ideas & Risks

1. **"Quick-edit inline" is a footgun with version conflicts.** If user A edits title while user B edits priority, one PUT overwrites the other. The backend has no partial update — it replaces the whole item. **Fix:** Change PUT to PATCH with field-level merge, or require the client to send ALL fields it knows about + `expected_version`. Either way, the spec above already mitigates this with the conflict detection, but the backend MUST support field-level PATCH for this to scale.

2. **Socket presence is listed but the backend has no presence endpoint or socket implementation described.** Unless there's a WebSocket server already wired, presence is vaporware. **Call out:** Needs a socket server (Socket.IO or native WS) with Redis adapter for multi-instance. Without it, presence + real-time updates are impossible.

3. **Calendar view has no backend support.** Items only have `due_date`. There's no `start_date`, `end_date`, or `all_day` flag. Without these, Calendar view is at best a "task due date list" — not an actual calendar. Needs backend schema changes.

4. **Timeline view requires date fields that don't exist.** Same issue as Calendar. Timeline without start/end dates shows bars of zero width — useless. Needs `start_date` and `duration` on items.

5. **Groups are a second-class concept in the API.** Items have `group_id` in the move endpoint, but there's no dedicated `/api/groups` CRUD. Looks like groups are embedded in boards? Needs clarification — is `groups` a field on the Board response? If so, group management is read-only without dedicated endpoints for add/rename/delete operations.

6. **No file upload endpoint for attachments.** Items have `attachments` conceptually but there's no `POST /api/items/{id}/attachments` in the API. Without it, the attachment list in the slideover is dead UI.

7. **Excalidraw state on board but no Excalidraw view mode.** `excalidraw_state` field exists but there's no Excalidraw view option. Either remove the field or add a whiteboard view mode. Half-baked.

8. **Column type is a string enum ("status", "date", "text", "person", "number") but no column type-specific rendering is designed.** The design above treats all columns equally. A "date" column should render a calendar picker; a "person" column should render an assignee dropdown. This needs to be part of the column config.

---

## Build Status (v0.1 — May 28, 2026)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| BoardsPage | `pages/boards/BoardsPage.tsx` | ✅ Upgraded | Card/Button/EmptyState components, search Input |
| BoardPage | `pages/boards/BoardPage.tsx` | ✅ Upgraded | Input/Button/Modal components, column/group management |
| ItemDetailModal | `components/board/ItemDetailModal.tsx` | ✅ Upgraded | Fetch by ID, Input/Select/Badge/Badge/Avatar, save/delete with confirmation |
| CalendarView | `components/board/CalendarView.tsx` | ⚠️ Existing | Pre-existing; ItemDetailModal integration updated |
| TableView | `components/board/TableView.tsx` | ⚠️ Existing | Pre-existing; ItemDetailModal integration updated |
| KanbanView | `components/board/KanbanView.tsx` | ⚠️ Existing | Pre-existing; drag-drop columns/groups/items |
| useItem hook | `hooks/useItems.ts` | ✅ Added | New `useItem(id)` query hook added |

### Not Yet Built (v0.2+)
- View switcher polish (Kanban/Table/Timeline/Calendar) — styling only, functionality exists
- Column type-specific rendering — requires backend contract clarification
- Calendar/Timeline views — blocked on missing date fields in backend
- File attachments on items — blocked on missing backend endpoint
