# Frontend Architecture — Current State

> **Last updated**: 2026-05-23
> **Status**: Baseline audit. Redesign spec in `FRONTEND_UI_REDESIGN.md`. Implementation plan in `FRONTEND_ROADMAP.md`.

---

## 1. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18 |
| Language | TypeScript | 5.x |
| Build tool | Vite | 5.x |
| Styling | Tailwind CSS | 3.x |
| State | Zustand + Immer | 4.x |
| Data fetching | TanStack Query | 5.x |
| Routing | React Router DOM | 6.x |
| Realtime | Socket.IO client | 4.x |
| Rich text | BlockNote + Y.js | latest |
| Whiteboard | Excalidraw | latest |
| Drag-and-drop | @hello-pangea/dnd | latest |
| Icons | Lucide React | latest |
| Toasts | react-hot-toast | latest |
| HTTP client | Axios | latest |

No component library. All UI is hand-rolled with Tailwind utilities.

---

## 2. Directory Structure

```
services/web/src/
├── App.tsx                      # Router + RequireAuth + RequireOnboarding guards
├── main.tsx                     # Vite entry point
├── layouts/
│   ├── AppLayout.tsx            # Shell: Sidebar + TopBar + Outlet
│   └── AuthLayout.tsx           # Centered card for login/register
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   └── ResetPasswordPage.tsx
│   ├── boards/
│   │   ├── BoardsPage.tsx       # Board list grid
│   │   └── BoardPage.tsx        # Board detail with view switcher
│   ├── crm/
│   │   └── CRMPage.tsx          # Pipeline kanban (single pipeline only)
│   ├── documents/
│   │   ├── DocumentsPage.tsx    # Tabbed: Notes + Paperless files
│   │   └── DocumentPage.tsx     # Individual collaborative note (Y.js)
│   ├── settings/
│   │   └── SettingsPage.tsx     # PLACEHOLDER — "coming in Phase 3"
│   ├── onboarding/
│   │   └── OnboardingPage.tsx
│   └── NotFoundPage.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx          # 240px left nav — 4 fixed items
│   │   ├── TopBar.tsx           # 48px header — search trigger + bell + avatar
│   │   └── CommandPalette.tsx   # ⌘K modal — navigation only, no actions
│   ├── board/
│   │   ├── BoardTopBar.tsx      # View switcher + board title
│   │   ├── KanbanView.tsx       # Drag-and-drop columns + cards
│   │   ├── TableView.tsx        # Sortable table with group collapse
│   │   ├── CalendarView.tsx     # Month grid, items by due_date (3-cap per day)
│   │   ├── ExcalidrawView.tsx   # Lazy-loaded Excalidraw embed
│   │   ├── ItemCard.tsx         # Kanban card (title, priority, assignees, due)
│   │   └── ItemDetailModal.tsx  # Full-screen overlay modal — all item fields
│   ├── crm/
│   │   └── DealDetailModal.tsx  # CRM deal detail overlay modal
│   ├── documents/
│   │   └── PaperlessFileDrawer.tsx  # Paperless file detail — AI analyze, link-deal
│   └── notifications/
│       └── NotificationPanel.tsx    # Slide-over notification list
├── hooks/
│   ├── useItems.ts              # React Query + socket room join + invalidation
│   └── useNotifications.ts     # React Query 30s poll + markRead mutations
├── stores/
│   ├── authStore.ts             # Zustand: user, token, workspace (persisted sessionStorage)
│   ├── boardStore.ts            # Zustand: active board state
│   ├── itemStore.ts             # Zustand: item optimistic updates
│   ├── notificationStore.ts     # Zustand: unreadCount, addNotification (socket push not wired)
│   └── documentStore.ts        # Zustand: document state
└── lib/
    ├── api.ts                   # Axios: Bearer token, X-Workspace-ID, 401/402/429 handlers
    ├── socket.ts                # Socket.IO client: auth, reconnect, token refresh
    └── paperless.ts             # Paperless proxy helpers
```

---

## 3. Current Layout Shell

```
┌────────────────────────────────────────────────────────┐
│  TopBar (48px) — search | bell | avatar                │
├──────────┬─────────────────────────────────────────────┤
│          │                                             │
│ Sidebar  │          <Outlet />                         │
│  240px   │       (page content)                        │
│          │                                             │
└──────────┴─────────────────────────────────────────────┘
```

### Sidebar — Fixed 4 items
- Boards (`/boards`)
- Documents (`/documents`)
- CRM (`/crm`)
- Settings (`/settings`)

No hierarchy. No workspace context. No entity lists. Clicking "Boards" goes to a board list page; you can't jump directly to a specific board from the sidebar.

---

## 4. Page Inventory

### `/boards` — BoardsPage
- Grid of board cards
- "New Board" button
- No filtering, no sorting, no folder/section grouping

### `/boards/:id` — BoardPage
- View switcher: Kanban / Table / Calendar / Whiteboard
- Item CRUD via ItemDetailModal (full-screen overlay)
- No item filters exposed in UI (API supports group, assignee, status, due_before)
- No batch select

### `/crm` — CRMPage
- Single pipeline only (`pipelines[0]`)
- Kanban stages with deal cards
- AI score badge (green/yellow/red)
- No drag-and-drop between stages
- No multi-pipeline support in UI

### `/documents` — DocumentsPage
- Two tabs: Notes (Y.js collaborative) + Files (Paperless-ngx)
- Notes: list of documents, click to open DocumentPage
- Files: Paperless file browser with AI analyze, auto-tag, link-to-deal

### `/documents/:id` — DocumentPage
- BlockNote editor
- Y.js CRDT collaboration via Socket.IO
- No sidebar/outline

### `/settings` — SettingsPage
- **Literally a placeholder string.** No functionality.

---

## 5. State Management

### Zustand Stores

| Store | Persisted | Purpose |
|-------|-----------|---------|
| authStore | sessionStorage | user, token, workspace; logout clears |
| boardStore | No | active board, view type |
| itemStore | No | optimistic item updates |
| notificationStore | No | unreadCount, notification list |
| documentStore | No | Y.js document state |

### React Query

Used for all API data: boards, items, CRM pipelines/deals, notifications, documents, Paperless files.

Cache invalidation is socket-event-driven in `useItems.ts` — `item.*` events from Socket.IO trigger `queryClient.invalidateQueries`.

Notifications use 30s polling interval as primary delivery mechanism. Real-time socket push exists in the job layer but `notificationStore.addNotification` is never called from any hook.

---

## 6. Realtime Architecture

```
Laravel API ──► SendNotification job ──► Redis pub/sub ──► Socket.IO server
                                                               │
                                              ┌────────────────┘
                                              │
                                         Socket.IO client (socket.ts)
                                              │
                                    ┌─────────┴──────────┐
                                    │                    │
                               useItems.ts         useNotifications.ts
                           (invalidates query)    (30s poll fallback)
                                    │
                               boardStore          notificationStore
                                                 (addNotification never called)
```

**Gap**: `notificationStore.addNotification` is defined but never called from any hook. The socket event never reaches the Zustand store. Only the 30s poll delivers notifications to the UI.

---

## 7. Known Gaps (Frontend)

### Bugs

| # | Bug | File | Impact |
|---|-----|------|--------|
| F1 | `description` stored as JSONB array but UI treats as plain string | ItemDetailModal.tsx | Description shows as `[object Object]` |
| F2 | `done` field on subitems written but no DB column | ItemDetailModal.tsx | Silent failures on subitem completion |
| F3 | Comment author shows UUID not name | No join in CommentController | All comments show raw UUID |
| F4 | Paperless thumbnail route missing in api.php | paperless.ts | Images 404 |
| F5 | File URL field missing in FileController response | FileController | Attachments don't load |
| F6 | Tag IDs shown instead of tag names in Paperless drawer | PaperlessFileDrawer.tsx | Tags unreadable |
| F7 | Calendar "+N more" doesn't expand | CalendarView.tsx | Overflow items invisible |

### Missing UI for DB-ready Features

| Feature | DB Status | API Status | UI Status |
|---------|-----------|------------|-----------|
| Reminders | `reminder_at`, `reminder_sent_at` columns exist | SendDueReminders command exists | No UI |
| Item dependencies | `item_dependencies` table exists | No endpoint | No UI |
| Activity log | `activity_log` table + route exists | GET /items/:id/activity | No UI in modal |
| Time tracking | `tracked_hours`, `estimated_hours` columns exist | No endpoint | No UI |
| Global search | Meilisearch + Searchable trait on Item | GET /search?q= exists | Command palette navigates only |
| Item filters | API accepts group/assignee/status/due_before | Fully working | No filter UI in board views |
| Multi-pipeline CRM | Multiple pipelines supported | API supports pipeline_id param | UI hardcodes `pipelines[0]` |
| Settings page | — | — | Placeholder string |

### Architecture Gaps

- No batch item operations (select multiple, bulk status/assignee change)
- No keyboard shortcuts beyond ⌘K
- No virtual scrolling for large boards (>100 items)
- No undo / redo
- No mobile responsive layout
- No ARIA / accessibility anywhere in components
- Notification socket push never reaches Zustand store
- Item `expected_version` never sent from frontend (backend supports optimistic locking)
