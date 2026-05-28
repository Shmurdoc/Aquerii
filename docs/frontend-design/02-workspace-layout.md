# Aquerii Workspace Layout

## Build Status (v0.1 — May 28, 2026)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| NavRail | `layout/NavRail.tsx` | ✅ Enhanced | Sectioned nav, added My Day/Email/Support/Marketing items, notification badge, collapsed state |
| CommandPalette | `layout/CommandPalette.tsx` | ✅ Enhanced | Cmd+K with 3 sections (Commands/Recent/Search), keyboard nav, entity type icons, localStorage recents |
| NotificationCenter | `layout/NotificationCenter.tsx` | ✅ Built | Right slide-over, date-grouped, type icons, read/unread, skeletons, mark-all-read |
| TopBar | `layout/TopBar.tsx` | ✅ Built | Mobile top bar, breadcrumb, bell with badge, user dropdown |
| Sidebar | `layout/Sidebar.tsx` | ⚠️ Existing | Pre-existing; needs review against new designs |
| ContextPanel | `layout/ContextPanel.tsx` | ⚠️ Existing | Pre-existing; needs review |

### Not Yet Built (v0.2+)  
- Floating action palette (FAB) — deferred  
- Dockable/movable panel system  
- Resizable split panes  
- Customizable toolbar system  
- Presence indicators (requires backend socket events) — Production Spec

## Purpose

The workspace layout is the permanent chrome surrounding all product views. It must feel instantaneous, support deep navigation across 20+ entity types, and survive years of feature accretion without becoming a cluttered mess. Every millisecond of perceived latency here is a tax on every user interaction.

---

## API Contract

### Consumed Endpoints

| Endpoint | Method | Purpose | Payload |
|----------|--------|---------|---------|
| `/api/workspaces/{id}` | GET | Load current workspace metadata + member list | `{ id, name, logo, plan, members[] }` |
| `/api/auth/me` | GET | Current user for avatar + profile in user menu | `{ id, name, email, avatar_url, role, permissions }` |
| `/api/workspaces/{id}/notifications` | GET | Notification count for badge | `{ unread_count, items[] }` |
| `/api/workspaces/{id}/search?q=` | GET | Global search results | `{ items[], boards[], projects[], documents[], ... }` |
| `/api/onboarding/status` | GET | Check if onboarding prompt should show | `{ completed, steps[] }` |
| `/api/auth/logout` | POST | End session | — |

### Real-time Contract (Socket.IO)

```typescript
// Client connects to Socket.IO with auth token in handshake
socket.on('notification:new', (data: { id, type, title, body, workspace_id }) => {
  // Update notification badge, push to notification center
});
socket.on('presence:update', (data: { userId, status: 'online' | 'idle' | 'busy', workspace_id }) => {
  // Update presence indicators in sidebar members list, avatars
});
socket.on('user:typing', (data: { channel, userId, userName }) => {
  // Show typing indicator in chat/comment
});
```

---

## Component Tree

```
<AppLayout>
  <TopHeader>
    <WorkspaceSwitcher />        ← dropdown with search, recent, create-new
    <GlobalSearch />              ← triggers CommandPalette on click/focus
    <span style="flex:1" />      ← spacer
    <NotificationBell />          ← badge with unread count, opens NotificationPanel
    <HelpButton />                ← context-sensitive help
    <UserMenu />                  ← avatar + dropdown (profile, preferences, theme, logout)
  </TopHeader>

  <AppShell>                      ← flex row with sidebar + main area
    <Sidebar collapsed={bool}>
      <SidebarHeader>
        <WorkspaceLogo />
        <CollapseToggle />
      </SidebarHeader>

      <SidebarNav>
        <NavSection label="Workspace">
          <NavItem icon={Home} label="Home" to="/" exact />
          <NavItem icon={Target} label="My Day" to="/my-day" badge={taskCount} />
          <NavItem icon={Inbox} label="Inbox" to="/inbox" badge={unreadNotifications} />
        </NavSection>

        <NavSection label="Boards">
          <NavItem icon={Board} label="All Boards" to="/boards" />
          {/* Dynamic board list fetched from GET /api/workspaces/{id}/boards */}
          <BoardNavItem board={board} />  ← for each board
        </NavSection>

        <NavSection label="Projects">
          <NavItem icon={Project} label="Projects" to="/projects" />
        </NavSection>

        <NavSection label="CRM">
          <NavItem icon={Contact} label="Contacts" to="/crm/contacts" />
          <NavItem icon={Pipeline} label="Pipeline" to="/crm/pipeline" />
        </NavSection>

        <NavSection label="Marketing">
          <NavItem icon={Campaign} label="Campaigns" to="/marketing/campaigns" />
          <NavItem icon={Email} label="Email" to="/marketing/email" />
        </NavSection>

        <NavSection label="Operations">
          <NavItem icon={Support} label="Support" to="/support" />
          <NavItem icon={ERP} label="ERP" to="/erp">
            <SubNavItem label="Inventory" to="/erp/inventory" />
            <SubNavItem label="Procurement" to="/erp/procurement" />
            <SubNavItem label="Expenses" to="/erp/expenses" />
          </NavItem>
        </NavSection>

        <NavSection label="Analytics">
          <NavItem icon={Reports} label="Reports" to="/reports" />
          <NavItem icon={Dashboard} label="Dashboards" to="/dashboards" />
        </NavSection>

        <NavSection label="Tools">
          <NavItem icon={AI} label="AI Chat" to="/ai-chat" />
          <NavItem icon={Document} label="Documents" to="/documents" />
          <NavItem icon={Email} label="Email" to="/email" />
          <NavItem icon={Calendar} label="Meetings" to="/meetings" />
          <NavItem icon={People} label="Employees" to="/employees" />
        </NavSection>

        <NavSection label="System">
          <NavItem icon={Settings} label="Settings" to="/settings" />
        </NavSection>
      </SidebarNav>

      <SidebarFooter>
        {/* compact presence list of workspace members */}
        <PresenceList members={members} onlineUsers={onlineUsers} />
      </SidebarFooter>
    </Sidebar>

    <MainContentArea>
      <Breadcrumb />               ← dynamic, reads from route matches
      <ErrorBoundary fallback={<PanelError />}>
        <Outlet />                 ← React Router v6 nested route
      </ErrorBoundary>
    </MainContentArea>
  </AppShell>

  <FloatingActionPalette>
    <QuickCreateButton type="task" />
    <QuickCreateButton type="meeting" />
    <QuickCreateButton type="project" />
    <QuickCreateButton type="note" />
    <QuickCreateButton type="email" />
  </FloatingActionPalette>

  <NotificationPanel />            ← slide-over from right
  <CommandPalette />               ← Cmd+K modal
  <OnboardingPrompt />            ← shown if GET /onboarding returns !completed
</AppLayout>
```

---

## UI States

### Loading

```
<AppLayout>
  <TopHeader>
    <Skeleton width="120px" height="32px" />  {/* workspace switcher */}
    <Skeleton width="200px" height="36px" />  {/* search bar */}
    <Skeleton width="32px" height="32px" borderRadius="full" />  {/* avatar */}
  </TopHeader>
  <AppShell>
    <Sidebar>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} width={random(160, 200)} height="28px" className="mb-2" />
      ))}
    </Sidebar>
    <MainContentArea>
      <Skeleton width="300px" height="32px" className="mb-4" />  {/* breadcrumb */}
      <Skeleton width="100%" height="400px" />  {/* content skeleton per route */}
    </MainContentArea>
  </AppShell>
</AppLayout>
```

Every panel has its own skeleton. We do NOT show a single spinner for the whole page. The sidebar renders independently of the main content area.

### Empty

First-time workspace with no boards/tasks: each empty view renders a contextual illustration + CTA button specific to that section.

### Error

Each panel (sidebar, header, main content) is wrapped in its own `<ErrorBoundary>`. A single crashing panel does not take down the entire app. The error boundary renders a compact "Something went wrong" card with a retry button.

```
<ErrorBoundary fallback={
  <PanelError onRetry={() => refetch()}>
    Failed to load workspace data
  </PanelError>
}>
  <Sidebar />
</ErrorBoundary>
```

### Edge Cases

- **Workspace has >500 boards**: Sidebar shows most recent 10, link to "View all boards" page. No infinite scroll in sidebar.
- **User in 50+ workspaces**: Workspace switcher is virtualized (`react-virtuoso`), searchable.
- **Offline**: When navigator.onLine is false, show offline indicator banner below header. Sidebar nav works (React Router). Any data mutation shows toast "You're offline. Changes will sync when connected." 
- **2,000+ notification unread count**: Badge shows "99+". Notification panel paginates at 50.
- **User has no avatar**: Initials fallback, generated from `user.name` with deterministic background color.
- **Workspace deleted while user is active**: Socket.IO emits `workspace:deleted`. Redirect to workspace selection with toast.

---

## Interaction Design

### Workspace Switcher

Clicking the workspace name/logo opens a dropdown with:
- Search input filtering workspaces
- Current workspace highlighted
- Recent workspaces section
- "Create new workspace" link at bottom

Switching workspace calls `useWorkspaceStore.switchWorkspace(id)` which:
1. Updates Zustand currentWorkspace
2. Navigates to `/<newWorkspaceId>/`
3. Socket.IO client disconnects from old namespace, connects to new
4. TanStack Query cache is NOT cleared (user may switch back). `staleTime` handles freshness.

### Global Search (Cmd/Ctrl+K)

The CommandPalette component wraps `cmdk`:

```
<CommandPalette open={isOpen} onOpenChange={setIsOpen}>
  <CommandInput placeholder="Search anything... | Tasks, boards, documents, people..." />
  <CommandList>
    <CommandGroup heading="Recent">
      <CommandItem>Recent task title</CommandItem>
      <CommandItem>Recent board name</CommandItem>
    </CommandGroup>
    <CommandGroup heading="Boards">
      {/* results from GET /api/workspaces/{id}/search?q= */}
    </CommandGroup>
    <CommandGroup heading="Tasks">
      {/* results with assignee, status, due date */}
    </CommandGroup>
    <CommandGroup heading="Documents">
      {/* results from document search */}
    </CommandGroup>
  </CommandList>
  <CommandEmpty>No results found for "<SearchTerm />"</CommandEmpty>
</CommandPalette>
```

**Interaction**:
- Real-time search as user types, debounced 300ms
- Calls `GET /api/workspaces/{id}/search?q={term}`
- Arrow keys navigate groups + items
- Enter selects item and navigates to that entity's detail page
- Esc closes palette
- Results grouped by entity type with icons

### Notification Center

Panel slides from right edge. Stacked on top of sidebar, below header.

**Grouping**:
- `notifications:grouped` by type (mentions, assignments, due dates, system)
- Each group has "Mark all read" button
- Individual notification: click navigates to relevant item, marks read
- "Mark all read" calls `POST /api/workspaces/{id}/notifications/read-all`
- Individual read calls `PATCH /api/workspaces/{id}/notifications/read` with `{ ids: [id] }`

**Real-time**: Socket.IO `notification:new` event pushes to top of notification list and increments badge. If notification panel is open, it animates the new item in.

### Floating Action Palette (FAB)

Positioned at bottom-right. Configurable in settings:
- `dock` — pinned to bottom-right, 24px offset
- `float` — user can drag anywhere (position persisted in useFloatingActionsStore)
- `hidden` — disabled

Clicking opens a radial menu (or simple list) of quick-create actions:
- New Task → navigates to board with create modal
- New Meeting → opens meeting creation modal
- New Project → opens project creation wizard
- New Note → opens rich text editor
- New Email → opens compose modal

**Interaction**: Scale spring animation (see Motion section in design-system.md). Esc closes. Outside click closes.

### Breadcrumb

Dynamic breadcrumb reads from React Router's `useMatches()`:

```
<nav aria-label="Breadcrumb">
  <ol>
    <li><Link to="/">Home</Link></li>
    <li><ChevronRightIcon /></li>
    <li><Link to={`/${workspaceId}/boards`}>Boards</Link></li>
    <li><ChevronRightIcon /></li>
    <li aria-current="page">Sprint 24</li>
  </ol>
</nav>
```

Max depth: 4 levels. Beyond that, collapse middle items into "..." dropdown.

### User Menu

```
<DropdownMenu>
  <DropdownMenuTrigger>
    <Avatar src={user.avatar_url} name={user.name} size="md" />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
    <DropdownMenuLabel variant="muted">{user.email}</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={() => navigate('/settings/profile')}>Profile</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => navigate('/settings/preferences')}>Preferences</DropdownMenuItem>
    <DropdownMenuItem>
      Theme <ThemeToggle />  {/* switch inside menu item */}
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={handleLogout}>Log out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Presence Indicators

In sidebar footer and member list avatars:
- Green dot bottom-right of Avatar → online
- Orange dot → idle (no interaction >5min)
- Red dot with "busy" tooltip → Do Not Disturb
- No dot → offline

Socket.IO handles presence with heartbeat pings every 30 seconds. If no heartbeat for 90 seconds, mark offline.

---

## Data Flow

```
AppLayout mounts
  ├─ useAuthStore → validate token (GET /api/auth/me)
  │   └─ fail → redirect to /login
  ├─ useWorkspaceStore → GET /api/workspaces/{id}
  │   └─ load metadata → populate sidebar, header
  ├─ useQuery(['notifications', workspaceId]) → GET /api/workspaces/{id}/notifications?unread=true
  │   └─ badge count + notification panel data
  ├─ Socket.IO connect → join workspace room
  │   └─ listen for notification:new, presence:update, workspace:updated
  └─ useQuery(['onboarding']) → GET /api/onboarding/status
      └─ if !completed → show OnboardingPrompt

Sidebar renders
  ├─ useQuery(['boards', workspaceId]) → GET /api/workspaces/{id}/boards
  │   └─ dynamic board nav items
  └─ usePresenceStore → Socket.IO presence:update
      └─ online users list, status indicators
```

---

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | >=1024px | Full sidebar (240px), full header |
| Tablet | 640-1023px | Sidebar collapses to icon-only (64px). Header shows only essential items. Notification panel becomes full-screen overlay. |
| Mobile | <640px | Sidebar becomes bottom navigation (4-5 main icons). Header collapses to hamburger + workspace name. FAB hides (use bottom nav's "+" button instead). |

### Responsive Component States

```
const { isDesktop, isTablet, isMobile } = useResponsive();

// Sidebar width controlled by CSS class:
// .sidebar-desktop { width: 240px; }
// .sidebar-tablet  { width: 64px;   } ← icons only, tooltips on hover
// .sidebar-mobile  { display: none; } ← hidden, bottom nav appears
```

Bottom navigation for mobile:
```
<BottomNav>
  <BottomNavItem icon={Home} label="Home" to="/" />
  <BottomNavItem icon={Board} label="Boards" to="/boards" />
  <BottomNavItem icon={PlusCircle} label="Create" onClick={openQuickCreate} />
  <BottomNavItem icon={Bell} label="Alerts" badge={unreadCount} onClick={openNotifications} />
  <BottomNavItem icon={User} label="Profile" onClick={openUserMenu} />
</BottomNav>
```

---

## Performance Considerations

1. **Sidebar is memoized.** It re-renders ONLY when `collapsed` state changes or the boards list query updates. The workspace switcher is a separate `React.memo` component to isolate its re-renders.

2. **Command palette is lazily loaded.** `React.lazy(() => import('./CommandPalette'))`. It's heavy (cmdk + search logic). No need to load it on initial paint.

3. **Notification panel is lazily loaded.** Same pattern. The bell icon shows the unread count without loading the panel component.

4. **Sidebar nav items are pre-computed.** The nav configuration is a static tree object (not generated at render). Only the "Boards" section is dynamic. This avoids re-creating the nav array on every render.

5. **Debounced search.** Global search fires API calls only after 300ms of no input. Previous requests are cancelled with AbortController.

6. **Socket.IO connection is single.** One connection per workspace. Joining/leaving rooms on the server side, not multiple client connections.

7. **CSS containment on sidebar and main area:** `contain: layout style paint` on both elements to isolate their layout from each other.

8. **Breadcrumb is cheap.** It reads from route matches (no API call). It's a `React.memo` component.

---

## Brutal Notes

1. **The sidebar is the app's largest re-render risk.** Every TanStack Query refetch on the boards list will cascade. Use `select` to return only the data the sidebar needs (id + name + icon), memoize that selector. The sidebar does NOT need `description`, `itemCount`, or any other board metadata.

2. **If the workspace switcher is slow, users blame the whole app.** Preload the workspace list in the background when the app mounts. Cache it for 5 minutes. The switcher should show data instantly even if the user navigated to `/login` first.

3. **Search debounce of 300ms is not optional.** Without it, every keystroke hits the API. With 50 users hitting Cmd+K, that's 50 API calls per user per search session. Cap it.

4. **Mobile bottom nav is not a copy of the sidebar.** You have room for 5 icons max. Choose Home, Boards, Create, Notifications, Profile. Everything else lives under a "More" overflow. Do NOT try to fit 20 nav items into a bottom bar.

5. **Presence indicators break without WebSocket fallback.** Socket.IO supports long-polling fallback, but presence becomes sluggish. Detect WebSocket support on connect and show a subtle "Reconnecting..." indicator when the transport downgrades.

6. **Workspace switcher must NOT clear React Query cache.** Users frequently switch between workspaces. A stale cache is better than a loading spinner. Use `staleTime: 30000` so data refreshes within 30 seconds anyway.

7. **The breadcrumb route matching can break with nested routes.** React Router's `useMatches()` returns all matched routes. We need to filter to only routes that have `handle: { crumb: ... }`. Without this, even layout routes (which have no breadcrumb) will generate empty breadcrumb items.

8. **Every panel error boundary is a deliberate choice.** Top-level error boundaries would catch rendering crashes in sidebar or notification panel and blow away the entire workspace view. Panel-level boundaries mean a broken notification panel doesn't nuke the user's current work.
