---
ticket: GAP-BOARDS-DESIGN-001
author: designer
status: published
date: 2026-06-06
related: GAP-BOARDS-001 (builder will implement)
---

# DESIGN-GAP-BOARDS-001 — Boards Pages Visual/UX Overhaul Spec

## Problem Summary

The Boards pages (`BoardsPage`, `BoardPage`, `KanbanView`, `ItemCard`) accumulate 20+ visual/UX defects because the original implementation predates the current design system. Defects fall into four buckets:

1. **Hardcoded grays** — `text-white`, `text-gray-500`, `bg-gray-800`, `border-gray-700`, `border-indigo-500` etc. are scattered through all four files. These are not theme-aware, break the light-mode (if ever flipped), and visually drift away from the glass-card aesthetic used everywhere else in the app.
2. **Touch-inaccessibility** — Delete menus, group-edit actions, column-edit actions, and the manage-columns pencil all use `opacity-0 group-hover:opacity-100`. On a phone or a stylus device, the user has no way to discover or activate them.
3. **No structural framing** — Kanban columns are flat gray strips with no header card, no card, no shadow. Item cards are flat `bg-gray-800` boxes with no elevation, no drag state, no `isDragging` distinction, and no width cap — so a long title pushes the column wider than its siblings.
4. **Dead code & busywork** — `BoardPage.tsx` renders a second `<h2>` for the board name in addition to the one already in `BoardTopBar`. `handleCreate` hardcodes `'New Board'` and dumps the user into a renamed-by-clicking situation. The skeleton always shows 4 cards regardless of viewport.

This spec redesigns the four files against the existing design system tokens. No new design tokens are introduced; no new components are required. The existing `<Modal>`, `<Button>`, `<Card>`, `<Input>`, `<DropdownMenu>`, `<EmptyState>`, and `<PrintButton>` are reused.

## Design Principles

| # | Principle | Rationale |
|---|---|---|
| 1 | **CSS variables only** — every `text-*`/`bg-*`/`border-*` references `var(--color-*)` (or the Tailwind alias `text-text-primary`, `bg-bg-surface`, `border-glass-border`). | Theme-aware, consistent with the rest of the app, prevents future light/dark drift. |
| 2 | **Glass-card aesthetic** — all card-level surfaces use `bg-[var(--color-bg-surface)]` + `border-[var(--color-glass-border)]` + (where elevated) `shadow-[var(--shadow-lg)]`. | Matches the visual language of every other entity page. |
| 3 | **Touch-first** — destructive and contextual actions are always rendered (no `opacity-0 group-hover:opacity-100`). Hover-only styles use `hidden md:flex` or `opacity-0 md:group-hover:opacity-100` so they don't appear on touch at all. | A user on an iPad with a Bluetooth mouse and a user on a phone share the same screen; the latter never sees hover. |
| 4 | **Visual hierarchy** — columns are framed (header + body + footer), cards have elevation tiers (`shadow-sm` → `shadow-lg` on hover → `shadow-elevated + ring` while dragging), column widths are clamped (`min-w-[280px] max-w-[320px]`) so the grid stays uniform. | Long titles truncate cleanly; the eye scans columns left-to-right. |
| 5 | **Native browser confirm is forbidden** for destructive actions. Use `<Modal>` with a typed-confirmation footer (`Cancel` + `Delete`). | The app already has a `<Modal>` pattern; native `confirm()` breaks the visual contract. |

## Visual Mockup — BoardsPage (after)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Boards                                              [Search…]  [+ New]     │  ← h1, sub-heading, search, action
│ 12 workspaces · organize work into focused boards                          │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│ │ [Q]  Q3 Plan │  │ [B]  Brand   │  │ [T]  Tasks   │  │ [R]  Roadmap │ ⋯  │  ← icon chip + 3-dot menu ALWAYS visible
│ │ Quarterly…   │  │ Brand identity│  │ Personal to-dos│  │ H2 2026 plan │   │
│ │ 24 items · 3d│  │ 8 items · 1w  │  │ 56 items · 2h│  │ 12 items · 5d│   │
│ │ ●●●          │  │ ●●           │  │ ●●●●●        │  │ ●●●●         │   │  ← member avatar stack
│ └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│ ┌──────────────┐  ┌──────────────┐  …                                       │
│ │ [D]  Design  │  │ [M]  Mobile  │                                          │
│ │  …           │  │  …           │                                          │
│ └──────────────┘  └──────────────┘                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

Empty state (zero boards):

```
                              [LayoutGrid icon in accent-light circle]
                                  No boards yet
                       Create your first board to organize work.

                                       [+ New Board]
```

## Visual Mockup — BoardPage Title Bar (after)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [Q] Q3 Plan  [Q3 2026]  [🙋 🙋 🙋 +2]   [Share]  [Board]  [Kanban|Table|Cal|White] ⋯ │
└─────────────────────────────────────────────────────────────────────────────────────┘
   icon   h1 board name   groups pills   presence    button  PrintButton   view switch
```

Below the title bar:
- Online-users row is merged into the right side of the title bar (avatar stack + "N online" label) — not a separate row.
- Group-management row: pills with active state (`bg-bg-elevated border-glass-border` for active, `bg-bg-base border-glass-border-hover` for hover); the 3-dot on each pill is always visible at `xs` size, no `group-hover`.
- Manage-columns pencil and trash icons are always visible at `xs` size (no `opacity-0 group-hover/col:opacity-100`).
- The native `confirm()` calls are replaced with a `<Modal>` "Delete column?" / "Delete group?" footer with a "Type the column name to confirm" field for non-system columns.

## Visual Mockup — KanbanView Column (after)

```
┌──────────────────────┐  ← column wrapper: bg-bg-surface/60 border-glass-border rounded-xl
│ ● To Do      3  [+]  │  ← header: color dot · name · count · + Add item icon button
├──────────────────────┤
│ ┌──────────────────┐ │
│ │ [HIGH]           │ │  ← card: bg-bg-elevated border-glass-border rounded-lg
│ │ Renew SSL cert…  │ │     shadow-sm default
│ │ ───────────────  │ │     shadow-lg on hover
│ │ ●● 📅 Jun 12     │ │     shadow-elevated + ring-accent/50 while dragging
│ └──────────────────┘ │     min-w-[280px] max-w-[320px] enforced by parent
│   …                   │
│ + Add item            │  ← footer: full-width ghost button
└──────────────────────┘
```

The column is now an actual framed surface. Cards inside can never push the column wider than 320px. A long title wraps to two lines and gets `line-clamp-2` + `break-words` so it cannot escape.

---

## A. BoardsPage.tsx — Detailed Spec

### Diagnosis (verified against current code)

| # | Line | Issue | Fix |
|---|---|---|---|
| A1 | 41-47 | Empty `<div />` placeholder — no `<h1>`, no sub-heading, no search | Add `<h1>Boards</h1>` + sub-heading + search input + action |
| A2 | 50-53 | Skeleton hardcodes `bg-gray-800` and fixed-4 regardless of viewport | Use `bg-[var(--color-bg-surface)]` and a 3/2/1 responsive card count |
| A3 | 70-80 | Hardcoded `text-white`, `text-gray-500`, `text-indigo-300` on card body | Replace with `text-[var(--color-text-primary)]` and `text-[var(--color-text-muted)]` |
| A4 | 19-26 | `handleCreate` hardcodes `name: 'New Board'` and dumps user in board with no chance to name it | Open a `<Modal>` with `<Input>` for name; only create on submit |
| A5 | 84-99 | 3-dot menu uses `opacity-0 group-hover:opacity-100` — not touch-accessible | Always render the trigger button; use `opacity-0 md:group-hover:opacity-100` if we want a cleaner look on desktop, OR keep it always-visible (recommended) |
| A6 | 62 | Grid is `xl:grid-cols-4` (4 cols) — too cramped on most laptops; should be 3 | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (no `xl:`) |
| A7 | 65-82 | Card body is sparse — no description clamp, no item count, no last-modified, no member avatars | Add 2-line `line-clamp-2` description, `X items · 3d ago` footer, avatar stack |

### New structure (BoardsPage)

```jsx
<div className="p-6 space-y-6">
  {/* Header */}
  <div className="flex items-end justify-between gap-4 flex-wrap">
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Boards</h1>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">
        Organize work into focused boards.
      </p>
    </div>
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search boards…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        leftIcon={<Search size={14} />}
        className="w-64"
      />
      <Button variant="primary" onClick={() => setCreateOpen(true)}>
        <Plus size={14} /> New Board
      </Button>
    </div>
  </div>

  {/* Skeleton / empty / grid */}
  {isLoading ? <BoardsSkeleton /> : boards.length === 0 ? <EmptyState … /> : <BoardsGrid … />}
</div>

<Modal open={createOpen} onClose={…} title="New board" size="sm" footer={…}>
  <Input label="Name" value={name} onChange={…} autoFocus />
</Modal>
```

### BoardsSkeleton

- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
- Six placeholder cards (responsive count: 1 on mobile, 2 on tablet, 3 on desktop)
- Card: `h-32 bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] rounded-xl animate-pulse`

### BoardsGrid card anatomy (per card)

```
┌────────────────────────────────────────┐
│ ┌──┐  Q3 Plan                       ⋯ │  ← icon chip + name + always-visible 3-dot
│ │Q │  Quarterly planning & OKRs        │  ← description, 2 lines clamp
│ └──┘                                   │
│                                        │
│ 24 items · 3d ago                      │  ← meta footer
│ ● ● ●                                  │  ← assignee stack (3 + overflow)
└────────────────────────────────────────┘
```

Tailwind:
- Wrapper: `Card variant="interactive" padding="md"`
- Icon chip: `w-10 h-10 rounded-lg flex items-center justify-center text-body font-semibold text-white` (the `text-white` here is fine — it's on top of a colored chip, not on the app surface)
- Name: `text-sm font-semibold text-[var(--color-text-primary)] line-clamp-1`
- Description: `text-xs text-[var(--color-text-muted)] line-clamp-2 mt-0.5`
- Meta row: `text-xs text-[var(--color-text-muted)] mt-3 flex items-center gap-2`
- 3-dot trigger: `absolute top-3 right-3` (no `opacity-0`)

### New Board modal

```jsx
const [createOpen, setCreateOpen] = useState(false)
const [newName, setNewName]       = useState('')

<Modal
  open={createOpen}
  onClose={() => { setCreateOpen(false); setNewName('') }}
  title="New board"
  description="Give your board a name. You can rename it later."
  size="sm"
  footer={
    <>
      <Button variant="secondary" size="sm" onClick={() => { setCreateOpen(false); setNewName('') }}>
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        loading={createBoard.isPending}
        disabled={!newName.trim()}
        onClick={async () => {
          const res = await createBoard.mutateAsync({ name: newName.trim() })
          setCreateOpen(false); setNewName('')
          navigate(`/boards/${res.data.data.id}`)
        }}
      >
        Create board
      </Button>
    </>
  }
>
  <Input
    label="Name"
    placeholder="e.g. Q3 Plan"
    value={newName}
    onChange={e => setNewName(e.target.value)}
    onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) /* trigger create */ }}
    autoFocus
  />
</Modal>
```

### Search/filter behavior

- `useState<string>('')` for the search box
- `const filtered = boards.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))`
- If `search` is non-empty and `filtered.length === 0`, render `<EmptyState title="No boards match …" />` instead of the grid
- If `search` is empty and `boards.length === 0`, render the original `<EmptyState title="No boards yet" />` (with the same "Create your first board" CTA, just wired to `setCreateOpen(true)` instead of the old `handleCreate`)

### Acceptance — BoardsPage

1. Page has a real `<h1>Boards</h1>` and a sub-heading — not the empty `<div />` placeholder.
2. Skeleton uses `bg-[var(--color-bg-surface)]` and the placeholder count matches the grid (3 / 2 / 1).
3. Clicking "New Board" opens a `<Modal>` with a name input — the board is only created on submit, and the user can cancel without creating.
4. The 3-dot menu on every card is rendered unconditionally (no `opacity-0 group-hover`) — works on touch.
5. Every card has: icon chip, name (clamp 1), description (clamp 2), `X items · 3d ago`, member avatar stack.
6. Grep for `text-gray-\|bg-gray-\|border-gray-` in the modified file returns zero matches inside the JSX.

---

## B. BoardPage.tsx — Detailed Spec

### Diagnosis (verified)

| # | Line | Issue | Fix |
|---|---|---|---|
| B1 | 117 | Loading spinner hardcoded `border-indigo-500 border-t-transparent` | Use `border-[var(--color-accent)] border-t-transparent` |
| B2 | 108, 124 | "Board ID is missing" / "Board not found" hardcodes `text-gray-500` | Use `text-[var(--color-text-muted)]` |
| B3 | 131-132, 230 | Several `border-gray-800` and `border-[var(--color-glass-border)]` (mixed) | Standardize on `border-[var(--color-glass-border)]` everywhere |
| B4 | 156 | Group pill `bg-gray-800 text-gray-300` — poor contrast vs the row's `border-gray-800` | Use `bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-glass-border)]` for the active pill; add a focus state |
| B5 | 183, 306 | Native `confirm()` for destructive actions | Replace with a `<Modal>` "Delete column?" / "Delete group?" with cancel + danger button |
| B6 | 230-233 | Title row is sparse — `<h2>board.name</h2>` is duplicated (also shown by `BoardTopBar`) and presence is in a separate row | Remove the duplicate title row; move presence avatars into the title row of `BoardTopBar` (see B10) |
| B7 | 252-257 | View switcher wrapper is not dead — but the surrounding `<div className="flex-1 overflow-hidden">` has no padding, making the inner views touch the viewport edge | Add `px-6` and `min-h-0` to allow inner views to scroll independently |
| B8 | 290-291 | Manage-columns modal: `text-xs text-gray-300` and `text-[10px] text-gray-600` (hardcoded) | Use `text-[var(--color-text-primary)]` and `text-[var(--color-text-muted)]` |
| B9 | 165, 297, 307 | `opacity-0 group-hover/...:opacity-100` on group-rename, col-rename, col-delete | Always render; downsize to `xs` instead of `sm` so they don't dominate |

### Title bar (consolidated)

The current architecture has two title rows: one in `BoardPage.tsx` (line 230-233) and one in `BoardTopBar.tsx` (line 23-65). The BoardPage one is redundant — `BoardTopBar` already renders the icon, name, and view switcher. Spec:

- **Delete** lines 230-233 of `BoardPage.tsx` entirely. The duplicate `<h2>board.name</h2>` goes away.
- **Keep** `BoardTopBar` as the single title bar. Augment it with:
  - Presence avatars + "N online" label injected on the right (or passed in as a prop from `BoardPage` to keep `BoardTopBar` data-dumb — preferred)
  - A "Share" `<Button variant="secondary" size="sm">` with a `Share2` icon, between the name and the view switcher
  - The `PrintButton` (already present) is the leftmost action in the right cluster
  - A "Columns" button (already present) gets `variant="secondary"` styling to be consistent with Share

### Group-management row

- The pill currently uses `bg-gray-800 text-gray-300` with a `borderLeft: 3px solid <color>`. Change to:
  - Pill wrapper: `inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)]`
  - Color dot: `w-2 h-2 rounded-full` (filled with group color)
  - Name: `text-xs font-medium text-[var(--color-text-primary)]`
  - 3-dot trigger: `Button variant="ghost" size="xs" iconOnly` — always rendered, no `opacity-0 group-hover`
- "Add group" button: `Button variant="ghost" size="sm"` with a `Plus` icon
- The 3-dot menu opens a `<DropdownMenuItems>` with "Rename" and "Delete group". "Delete group" action now opens a `<Modal>` "Delete group? — This will also delete the items in this group. This action cannot be undone." with Cancel + Delete.

### Manage-columns modal

- Header: `<Modal title="Manage columns">` (already wired via `showColumns`)
- Column list rows: use `Card variant="default" padding="sm"` to give each row a defined surface, instead of bare `<div>`s
- Column name: `text-sm text-[var(--color-text-primary)]`
- Type chip: `text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]`
- Edit pencil + trash icons: `Button variant="ghost" size="xs" iconOnly` — always visible, no `group-hover`
- Trash opens a `<Modal>` "Delete column? — Items in this column will lose their <name> value." for non-system columns (system columns show the pencil only, no trash)

### Acceptance — BoardPage

1. No `text-gray-*` / `bg-gray-*` / `border-gray-*` / `border-indigo-*` literals in the JSX (only in the safe colored-chip spots where the value is dynamic from the board/group `color`).
2. No native `confirm()` calls. All destructive actions go through a `<Modal>`.
3. Board name appears exactly once in the title bar (in `BoardTopBar`).
4. Presence avatars and "N online" label are inside the title bar, not in a separate row.
5. Group pills have proper contrast on both light and dark theme tokens.
6. Manage-columns modal rows use a `<Card>` surface; trash + pencil are always visible.

---

## C. KanbanView.tsx — Detailed Spec

### Diagnosis (verified)

| # | Line | Issue | Fix |
|---|---|---|---|
| C1 | 25 | `[...board.groups].sort(…)` — no `?? []` guard | Use `board.groups ?? []` to prevent runtime crash on missing groups |
| C2 | 102 | `min-w-[280px]` only — no `max-w` | Add `max-w-[320px] w-[320px]` so cards cannot push the column wider |
| C3 | 104-111 | Column header is a bare row — no surface, no card frame | Wrap the column in a `Card variant="glass" padding="none"` and put the header in a sticky top |
| C4 | 132-135 | Column body is a flat gray strip (`bg-indigo-950/40` / `bg-gray-900/40`) with no border | Use `bg-[var(--color-glass-bg)]` for the empty body, `bg-[var(--color-accent-light)]` while dragging-over |
| C5 | 114-123 | Drag clone uses `opacity-80` to indicate drag — too subtle, blends with rest | Use `scale-105 ring-2 ring-[var(--color-accent)] shadow-[var(--shadow-elevated)]` for visible lift |
| C6 | 179-185 | "Add item" is a bare text button — no surface, no padding inside the column | Promote to a `Button variant="ghost" size="sm" fullWidth` at the column footer |

### Column structure (after)

```jsx
<div className="flex flex-col w-[320px] min-w-[280px] max-w-[320px] mr-4 shrink-0">
  {/* Header (sticky) */}
  <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl border border-b-0 border-[var(--color-glass-border)] bg-[var(--color-bg-surface)]">
    <div className="w-2.5 h-2.5 rounded-full" style={{ background: group.color }} />
    <span className="text-sm font-semibold text-[var(--color-text-primary)] flex-1 truncate">{group.name}</span>
    <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{groupItems.length}</span>
    <Button variant="ghost" size="xs" iconOnly aria-label="Add item" onClick={() => onAddItem(group.id)}>
      <Plus size={12} />
    </Button>
  </div>

  {/* Body (scrollable, drop target) */}
  <div className="flex-1 min-h-[160px] border border-b-0 border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] overflow-y-auto">
    {groupItems.length === 0 ? <DroppableEmptyHint /> : <VirtualizedItems />}
  </div>

  {/* Footer (full-width add) */}
  <div className="rounded-b-xl border border-t-0 border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] p-2">
    <Button variant="ghost" size="sm" fullWidth onClick={() => onAddItem(group.id)}>
      <Plus size={12} /> Add item
    </Button>
  </div>
</div>
```

The 320px column width is the **fixed** width. `min-w-[280px]` is left as a safety net so a future 2-col layout doesn't squish below readable; `max-w-[320px]` caps it.

### Drag clone & isDragging

- Both the live (`<Draggable>`) and the rendered clone (`renderClone`) accept a `snapshot.isDragging` boolean. Apply:
  - Default: no extra classes (let `ItemCard` handle its own default styling)
  - `isDragging`: `scale-[1.02] ring-2 ring-[var(--color-accent)] shadow-[var(--shadow-elevated)] z-[var(--z-modal)]`
- Remove the `opacity-80` in both spots — opacity hides information; scale + ring + shadow communicates "this is being moved" without losing readability.
- The renderClone currently reads `groupItems[rubric.source.index]`. If the source column's `groupItems` shifts (e.g. another drop completed first), the clone will show stale data. Fix by reading from a `useMemo` that takes the live `items` array:
  ```ts
  const itemById = useMemo(() => new Map(items.map(i => [i.id, i])), [items])
  // then: <ItemCard item={itemById.get(draggableId)!} boardId={boardId} />
  ```
  Pass `itemById` to `KanbanColumn` so the clone and the source read from the same map.

### Empty drop hint

When a column has no items, render a centered hint inside the body:

```jsx
<div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)] px-3 text-center">
  Drop items here or click + Add item
</div>
```

### Acceptance — KanbanView

1. Columns render at exactly 320px wide on desktop; never wider; never narrower than 280px.
2. Column has a visible three-zone frame (header / body / footer), all with `border-[var(--color-glass-border)]` that visually stitches into a single rounded card.
3. While dragging, the picked-up card visibly scales up + gets an accent ring + a heavy shadow (visible against any background).
4. Drag clone data is read from a single source of truth (`Map<id, Item>`) so reordering while another drop is in flight does not show stale titles.
5. Empty columns show a centered drop hint, not a bare gray void.

---

## D. ItemCard.tsx — Detailed Spec

### Diagnosis (verified)

| # | Line | Issue | Fix |
|---|---|---|---|
| D1 | 22 | `bg-gray-800 border border-gray-700` — flat, no shadow, no hover elevation | `bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)]` |
| D2 | 22 | `hover:border-indigo-500/40` — uses raw indigo + hardcoded alpha | `hover:border-[var(--color-glass-border-hover)]` (or `hover:border-[var(--color-accent)]` for stronger affordance) |
| D3 | 31 | Title has `line-clamp-2` but no `break-words` — a 60-char unbreakable token can overflow | Add `break-words` (or `break-all` for stricter behavior) |
| D4 | 38-58 | Avatar rendering: if `a.avatar_url` is present, render `<img>`; else render a chip with `a.name[0]`. Two issues: (a) the img uses `border-gray-700`; (b) the fallback uses `a.name[0]` which can be a space for names like " X " | Use `text-[var(--color-text-primary)]` and a `(a.name?.[0] ?? '?').trim().toUpperCase()` fallback |
| D5 | (new) | No `isDragging` state passed in to elevate the card | Accept `isDragging?: boolean` prop; apply `scale-[1.02] ring-2 ring-[var(--color-accent)] shadow-[var(--shadow-elevated)]` when true |

### New structure (ItemCard)

```jsx
interface Props {
  item: Item
  boardId: string
  isDragging?: boolean  // NEW — passed by KanbanView Draggable/renderClone
}

export default function ItemCard({ item, boardId: _boardId, isDragging = false }: Props) {
  const isOverdue = item.due_date && new Date(item.due_date) < new Date()

  return (
    <div className={clsx(
      'rounded-lg border p-3 cursor-pointer',
      'transition-[box-shadow,border-color,transform] duration-180 ease-out',
      isDragging
        ? 'border-[var(--color-accent)] shadow-[var(--shadow-elevated)] ring-2 ring-[var(--color-accent)]/40 scale-[1.02]'
        : 'bg-[var(--color-bg-elevated)] border-[var(--color-glass-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] hover:border-[var(--color-glass-border-hover)]',
    )}>
      {/* Priority badge */}
      {item.priority && (
        <span className={clsx(
          'text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded mb-1.5 inline-block',
          PRIORITY_BG[item.priority] ?? 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]',
        )}>
          {item.priority}
        </span>
      )}

      {/* Title */}
      <p className="text-sm leading-snug text-[var(--color-text-primary)] line-clamp-2 break-words">
        {item.title}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-2.5">
        {item.assignees?.length > 0 && (
          <div className="flex -space-x-1.5">
            {item.assignees.slice(0, 3).map(a => {
              const initial = (a.name?.[0] ?? '?').trim().toUpperCase() || '?'
              return a.avatar_url ? (
                <img key={a.id} src={a.avatar_url} alt={a.name}
                  className="w-5 h-5 rounded-full border-2 border-[var(--color-bg-elevated)]" />
              ) : (
                <div key={a.id}
                  className="w-5 h-5 rounded-full border-2 border-[var(--color-bg-elevated)] flex items-center justify-center text-[9px] font-bold text-[var(--color-text-primary)]"
                  style={{ background: 'var(--color-accent-light)' }}>
                  {initial}
                </div>
              )
            })}
            {item.assignees.length > 3 && (
              <div className="w-5 h-5 rounded-full border-2 border-[var(--color-bg-elevated)] bg-[var(--color-bg-hover)] flex items-center justify-center text-[9px] font-semibold text-[var(--color-text-muted)]">
                +{item.assignees.length - 3}
              </div>
            )}
          </div>
        )}

        {item.due_date && (
          <div className={clsx(
            'flex items-center gap-1 text-xs ml-auto px-1.5 py-0.5 rounded',
            isOverdue
              ? 'text-[var(--color-status-blocked)] bg-[var(--color-status-blocked)]/10'
              : 'text-[var(--color-text-muted)] bg-[var(--color-bg-hover)]',
          )}>
            {isOverdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
            {format(new Date(item.due_date), 'MMM d')}
          </div>
        )}
      </div>
    </div>
  )
}
```

### Priority palette (replace hardcoded indigo/gray with theme tokens)

```ts
const PRIORITY_BG: Record<string, string> = {
  critical: 'bg-[var(--color-status-blocked)]/15 text-[var(--color-status-blocked)]',
  high:     'bg-[var(--color-status-progress)]/15 text-[var(--color-status-progress)]',
  medium:   'bg-[var(--color-status-review)]/15 text-[var(--color-status-review)]',
  low:      'bg-[var(--color-status-todo)]/20 text-[var(--color-text-muted)]',
}
```

### Acceptance — ItemCard

1. Default: `bg-bg-elevated border-glass-border shadow-sm`.
2. Hover: `shadow-lg` and `border-glass-border-hover` (no raw indigo).
3. While dragging (when `isDragging` is true): `border-accent ring-2 ring-accent/40 scale-[1.02] shadow-elevated`.
4. Title uses `line-clamp-2 break-words` — a 60-char unbreakable string cannot exceed 2 lines or escape the card width.
5. Assignee fallback initials are safe for empty/space-only names.
6. Assignee stack shows a `+N` overflow chip when there are more than 3.

---

## E. Implementation Order

Build the changes in this order to keep the app runnable at every step:

| Step | File | Change | Why this order |
|---|---|---|---|
| 1 | `ItemCard.tsx` | Add `isDragging` prop, new elevation classes, `break-words`, theme tokens for priority + assignee | Pure presentational; no API changes; safe to land first |
| 2 | `KanbanView.tsx` | Add `?? []` guard, pass `isDragging` to `ItemCard`, replace flat body with bordered frame, clamp column width to 320px, add drag-clone scale/ring/shadow, add empty drop hint, full-width "Add item" footer | Depends on `ItemCard` accepting `isDragging`; lands the framing fix |
| 3 | `BoardsPage.tsx` | Add `<h1>`, sub-heading, search input, "New Board" `<Modal>`, replace hardcoded grays, change grid to `lg:grid-cols-3`, always-render 3-dot menu, add card meta footer (description, item count, last-modified, avatars) | Independent; visually unblocks the list page |
| 4 | `BoardPage.tsx` | Remove duplicate title row, replace native `confirm()` with `<Modal>` for group/column delete, replace hardcoded grays in the manage-columns modal, downgrade 3-dot/pill icons to `xs` and always render, move presence indicator into `BoardTopBar` via prop | Depends on the title-bar consolidation plan being agreed |

If the builder wants a smaller diff, steps 1-2 and 3-4 can ship as two separate PRs without blocking each other.

---

## F. Cross-Cutting Acceptance Criteria (build & lint)

1. `npm run build` in `services/web/` exits 0.
2. `npm run lint` (or whatever the project uses) exits 0.
3. Grep for hardcoded grays in the four files:
   ```sh
   rg "text-(gray|white|indigo|red|orange|yellow|blue|green)-\d{2,3}" services/web/src/pages/boards services/web/src/components/board
   rg "bg-(gray|indigo|red|orange|yellow|blue|green)-\d{2,3}"   services/web/src/pages/boards services/web/src/components/board
   rg "border-(gray|indigo|red|orange|yellow|blue|green)-\d{2,3}" services/web/src/pages/boards services/web/src/components/board
   ```
   The only allowed hits in the four files are:
   - The `text-white` on a colored icon-chip where the chip color is dynamic (`board.color` / `group.color`) — this stays white by design
   - The `borderColor: group.color` inline style for the legacy group pill if we keep the `borderLeft` accent (alternatively, drop it and use the dot only)
4. No `confirm(` or `window.confirm(` calls remain in the four files.
5. No `opacity-0` classes remain on action buttons in the four files. If a hover-only treatment is desired, it must be wrapped in `hidden md:flex` or `md:opacity-0 md:group-hover:opacity-100` so it disappears entirely on touch.

## G. Manual QA Checklist

- [ ] **Touch test (BoardsPage)**: open the app on a phone-sized viewport. Tap the 3-dot menu on any board card without hovering. The dropdown opens. Tap "Delete board" — a `<Modal>` appears (not a native browser confirm). Cancel does nothing; Delete removes the board.
- [ ] **Touch test (BoardPage)**: tap the 3-dot on any group pill — dropdown opens. Tap "Delete group" — `<Modal>` appears.
- [ ] **Touch test (BoardPage)**: tap the trash icon on a non-system column in Manage Columns — `<Modal>` appears.
- [ ] **Drag test (Kanban)**: pick up any card. While dragging: the card visibly scales up (~1.02), has a glowing accent ring, and a heavy drop-shadow. On a dark surface the shadow is still visible.
- [ ] **Width test (Kanban)**: create an item with a 200-character unbreakable title (e.g. 200 × `a`). Drop it into any column. The column stays at 320px. The title wraps to multiple lines and is truncated by `line-clamp-2` (overflowing beyond 2 lines is hidden, not pushed wider).
- [ ] **Create flow (BoardsPage)**: click "+ New Board". A `<Modal>` opens. Cancel does nothing. Entering "Q4 Plan" and clicking "Create board" creates the board and navigates into it.
- [ ] **Skeleton (BoardsPage)**: reload `/boards` while throttled. The skeleton renders 3 cards on desktop, 2 on tablet, 1 on mobile — all using `bg-bg-surface` (not `bg-gray-800`).
- [ ] **Theme**: if a light theme exists, toggle it. Cards, columns, pills, modals, and the title bar all use tokens that flip cleanly. (Verify by flipping `index.css`'s `data-theme` or whatever the project's theme switcher is.)

---

## H. Trade-offs & Open Questions

1. **Column width is now fixed at 320px.** The previous version scaled columns with content. This is a deliberate trade: visual uniformity > organic growth. If a workspace has 20 columns the horizontal scroll is still fine (kanban was already a horizontal-scroll surface). If the product later wants 2-col or full-bleed modes, that becomes a separate ticket.
2. **3-dot menu is always visible.** This costs ~24px of card width on desktop. The alternative (`opacity-0 md:group-hover:opacity-100`) saves space but breaks the touch contract; we chose the contract.
3. **Drag clone uses a `Map<id, Item>` for staleness protection.** This is a small re-render cost (one extra `useMemo`) in exchange for correctness during concurrent moves. If profiling shows it's hot, we can drop it and accept rare stale data — but I'd rather pay the cost.
4. **Manage-columns modal doesn't change column order.** The current UI has a `GripVertical` icon but no drag handler is wired. This spec leaves it as-is — ordering via drag is a separate feature. I'm flagging it so the builder doesn't accidentally re-add it.
5. **Title bar consolidation (`BoardTopBar` absorbs the presence row)**. This requires changing `BoardTopBar`'s prop signature. If we want to keep `BoardTopBar` zero-dep, we can wrap it in a small new `<BoardHeader>` component instead — but the inline-prop approach is simpler. **Builder: pick one and document it.**
6. **No new tokens.** I deliberately did not add any new CSS variables. If a future ticket needs a `--color-priority-critical-bg`, it can be added then. The current priority palette is constructed from existing status tokens + alpha.
7. **No new components.** No new files are required for this spec. The existing `<Modal>`, `<Button>`, `<Card>`, `<Input>`, `<DropdownMenu>`, `<EmptyState>`, `<PrintButton>` are reused. If the builder wants to extract a `<BoardCard>` for the grid, that's a small refactor and not blocking.

---

## File Changes (for the builder)

### Modify
1. `services/web/src/components/board/ItemCard.tsx` — D section
2. `services/web/src/components/board/KanbanView.tsx` — C section
3. `services/web/src/pages/boards/BoardsPage.tsx` — A section
4. `services/web/src/pages/boards/BoardPage.tsx` — B section (depends on `BoardTopBar` prop change)
5. `services/web/src/components/board/BoardTopBar.tsx` — B section (accept `presence` + `onShare` props; render the title bar consolidation)

### No new files
### No CSS / token changes

---

## Sign-off

This spec is the designer's recommendation. Builder should land steps 1-2 first (ItemCard + KanbanView) as a self-contained visual fix, then steps 3-4-5 (BoardsPage + BoardPage + BoardTopBar) as the layout consolidation. Each step should pass the acceptance criteria in its own section plus the cross-cutting build/lint criteria in section F.
