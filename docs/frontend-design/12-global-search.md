# 12 — Global Search (Command Palette)

## Build Status (v0.1 — May 28, 2026)

| Feature | Status | Notes |
|---------|--------|-------|
| Cmd+K activation | ✅ | Global keyboard shortcut, toggle |
| Overlay backdrop | ✅ | bg-black/60 backdrop-blur-sm |
| Search input | ✅ | Auto-focused, debounced |
| Static Commands section | ✅ | All main pages |
| Recent Items section | ✅ | localStorage, max 8, persists across sessions |
| Search Results section | ✅ | TanStack Query, enabled at >1 char |
| Entity type icons | ✅ | 11 icons mapped to entity types |
| Keyboard navigation | ✅ | Arrow up/down, Enter, Escape |
| API integration | ✅ | GET /api/workspaces/{id}/search?q= |
| Close handlers | ✅ | Escape, click outside, result selection |

### Not Yet Built
- Result highlighting (matching text highlight in results) — deferred to v0.2
- Fuzzy search fallback when API returns empty — deferred
- Keyboard shortcut hint in sidebar ("⌘K") — cosmetic, low priority
- Search within specific entity type (e.g., `/boards query`) — requires backend support

## Activation

- **Keyboard shortcut**: `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux).
- Registered globally via a `useEffect` in the AppShell root. `event.preventDefault()` on the combo to avoid browser default.
- Also accessible via a search icon button in the top bar. Click opens same palette.
- On activation: focus immediately jumps to the search input, input is selected (highlighted).

## Overlay

### Backdrop
- Full-screen semi-transparent overlay: background `rgba(0,0,0,0.5)`, `z-index: 1000`.
- Clicking backdrop closes the palette (calls `onClose`).
- `Escape` key closes the palette.

### Palette Panel
- Centered, 640px wide, max-height 480px.
- White background, 8px border-radius, subtle shadow (elevation 24).
- Animate in: scale 0.95 → 1.0 + fade in over 150ms ease-out.
- Animate out: scale 1.0 → 0.95 + fade out over 100ms ease-in.

```
┌──────────────────────────────────────────────────┐
│  🔍  Search across workspace...    [⌘K to close] │
├──────────────────────────────────────────────────┤
│  (Search results or states below)                 │
│                                                    │
│  RECENT SEARCHES (3)                               │
│  ┌──────────────────────────────────────────────┐ │
│  │  🕐  Invoice INV-042  > Sales > Q2 Review    │ │
│  │  🕐  Project Orion    > Project settings     │ │
│  │  🕐  john@acme.com    > Contacts             │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  or                                                │
│                                                    │
│  RESULTS — found 12 results for "widget"           │
│  ┌──────────────────────────────────────────────┐ │
│  │  📦  Product: Widget A          Inventory    │ │
│  │     SKU: WDG-001 • Qty: 120                 │ │
│  │  📋  Sales Order: SO-042       Sales        │ │
│  │     Customer: Acme Corp • $3,400            │ │
│  │  📄  Document: Widget Specs    Documents    │ │
│  │     Updated 2d ago                          │ │
│  │  ...                                         │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### State Machine

```
Closed → Opening → Open (idle/typing) → Debouncing → Fetching → Results | Empty | Error
```

- **Opening**: Capture focus, render overlay, animate in.
- **Idle/Typing**: User types. Each keystroke resets debounce timer.
- **Debouncing**: 300ms debounce after last keystroke before firing API call.
- **Fetching**: Show loading skeleton in results area.
- **Results**: Display grouped results.
- **Empty**: Show "No results found" message.
- **Error**: Show error message with retry.

---

## Search Input

- Full-width input, 20px left padding for search icon, 16px font, placeholder: "Search across workspace..."
- No search button — fully type-driven.
- Input is uncontrolled with a ref for focus management.
- Minimum query length: 2 characters. Below 2 chars: show recent searches only.
- On clear (empty input): revert to recent searches view.

---

## Recent Searches Section

- Stored in `localStorage` with key `aquerii:recent-searches`.
- Max 10 items. Newest first. Deduplicated (move to top if same query re-searched).
- Each item stores: query text, timestamp, first result type (for icon), entity count.
- Rendered as a list of clickable items with clock icon.
- Clicking a recent item fills search input and triggers search immediately.
- "Clear recent searches" link at bottom of section.

---

## Results — Grouped by Entity Type

Backend: GET /api/workspaces/{id}/search?q= — single endpoint, returns all entity types in one response.

### Expected response shape
```json
{
  "results": [
    { "type": "product", "id": "123", "title": "Widget A", "subtitle": "SKU: WDG-001", "context": "Inventory", "url": "/inventory/products/123", "icon": "box" },
    { "type": "sales_order", "id": "42", "title": "SO-042", "subtitle": "Acme Corp • $3,400", "context": "Sales", "url": "/erp/sales/42", "icon": "receipt" },
    { "type": "document", "id": "7", "title": "Widget Specs.pdf", "subtitle": "Updated 2d ago", "context": "Documents", "url": "/documents/7", "icon": "file" },
    { "type": "contact", "id": "19", "title": "John Doe", "subtitle": "john@acme.com", "context": "Contacts", "url": "/contacts/19", "icon": "user" },
    { "type": "deal", "id": "8", "title": "Enterprise Deal", "subtitle": "$50,000 • 80%", "context": "CRM", "url": "/deals/8", "icon": "target" },
    { "type": "lead", "id": "12", "title": "Acme Corp", "subtitle": "jane@acme.com • +1 555...", "context": "CRM", "url": "/leads/12", "icon": "star" },
    { "type": "ticket", "id": "33", "title": "Login not working", "subtitle": "Open • High priority", "context": "Support", "url": "/tickets/33", "icon": "help-circle" },
    { "type": "email", "id": "201", "title": "RE: Q2 Proposal", "subtitle": "From: john@acme.com", "context": "Email", "url": "/email/201", "icon": "mail" },
    { "type": "meeting", "id": "5", "title": "Sprint Review", "subtitle": "Today 3:00 PM", "context": "Meetings", "url": "/meetings/5", "icon": "calendar" },
    { "type": "employee", "id": "3", "title": "Jane Smith", "subtitle": "Engineering • jane@...", "context": "HR", "url": "/employees/3", "icon": "briefcase" },
    { "type": "board", "id": "2", "title": "Q2 Tasks", "subtitle": "12 cards", "context": "Projects", "url": "/boards/2", "icon": "columns" },
    { "type": "item", "id": "45", "title": "Fix login bug", "subtitle": "Board: Q2 Tasks • Assignee: Jane", "context": "Projects", "url": "/items/45", "icon": "check-square" }
  ]
}
```

### Rendering
- Grouped by `context` (string). Group headers: "Inventory", "Sales", "Documents", etc.
- Within each group, items sorted by relevance (backend decides).
- Each result row: 36px icon (entity-appropriate SVG), title (14px semibold), subtitle (12px gray), context badge (small, right-aligned).
- Hover: light gray background, cursor pointer.
- Selected item (keyboard navigation): blue highlight, different background.

### Missing Entity Warning
- The search endpoint response must support ALL entity types above. If backend search does not return contacts, deals, leads, tickets, meetings, boards, items — those types will show zero results. The frontend renders them if present, gracefully omits group headers for empty types.

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Cmd+K` / `Ctrl+K` | Open palette (when closed) |
| `Escape` | Close palette (when open) |
| `↑` / `↓` | Navigate through results |
| `Enter` | Open selected result (navigate to URL) |
| `Backspace` (empty input) | Close palette |

- Navigation wraps at top/bottom of results list.
- Selected state maintained via `useRef` index counter.
- On `Enter` with selection: call `router.push(result.url)`, close palette.
- On `Enter` without selection: do nothing (no "search page" fallback — see callouts).

---

## Loading Skeleton

While debounce timer is active → show nothing.
While fetching → replace results area with skeleton:

```
┌──────────────────────────────────────────────────┐
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
└──────────────────────────────────────────────────┘
```

3-4 skeleton rows with animated pulse gradient (shimmer). Each row has two lines (title + subtitle).

---

## Empty State

Centered in results area:
```
          🔍
    No results found
  Try a different search term
```

72px search icon in gray. Title "No results found" 16px semibold. Subtitle "Try a different search term" 14px gray.

---

## Error State

```
          ⚠️
    Search failed
    [Try again] button
```

Red-tinted icon and message. Clicking "Try again" re-fetches with same query.

---

## Performance Considerations

- **300ms debounce**: prevents API call on every keystroke. Implemented with `useRef` setTimeout.
- **Request deduplication**: cancel previous in-flight request when a new one fires. Use AbortController.
- **localStorage for recent**: 10 items max, 5KB limit (won't be hit). JSON stringify.
- **No pagination**: results limited to top 20 by backend. Frontend shows all. If backend returns more, implement "Show all N results" link that navigates to full search page (which does not exist — see callouts).
- **Memoize result groups**: `useMemo` on grouped results to avoid re-render on unrelated state changes.

---

## BRUTAL CALL-OUTS

| Issue | Detail |
|-------|--------|
| **Single search endpoint** | The design assumes GET /api/workspaces/{id}/search?q= is a unified search across ALL entities. Confirm this endpoint actually exists and returns the rich response shape above. If it only searches a subset (e.g., only documents + CRM), the results will be incomplete. |
| **No "search page" fallback** | If user presses Enter on an empty selection, there's no `/search?q=` page to redirect to. Enter should simply close the palette. A dedicated search results page is a future feature. |
| **Recent searches persistence** | Only stored locally. No cross-device sync. This is acceptable for an MVP. |
| **No keyboard shortcut customization** | Cmd+K is hardcoded. No settings UI to rebind. Acceptable for now. |
| **Entity icons** | Need a reliable icon-per-type mapping. If a new entity type is added to backend but icon is missing in frontend, show a generic fallback icon. |
| **Result URL routing** | Each result URL must be a valid frontend route. If /inventory/products/123 doesn't exist as a route, the navigation will 404. Ensure deep-link routing is implemented before this feature ships. |
