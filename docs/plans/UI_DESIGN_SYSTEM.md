# UI Design System Overhaul

**Status:** DRAFT  
**Date:** 2026-05-25  
**Domain:** Frontend / Design

---

## 1. Design Direction

### Reference Analysis: `F:\project-management`

The reference app uses:
- **Dark-first glassmorphism** — deep `#07070d` base, `rgba()` surfaces with `backdrop-filter: blur(16px)`
- **Purple accent** — `#7c3aed` (violet-600), gradient `135deg #7c3aed → #a78bfa`
- **Inter** font, 14px base
- **Micro-animations** — `cubic-bezier(0.34, 1.56, 0.64, 1)` spring easing on slide-up
- **Thin scrollbars** — 4px, `rgba(255,255,255,0.08)`
- **Collapsible sidebar** with workspace switcher, section grouping, team avatars
- **Stat cards** with icon + coloured background chip
- **SVG pie chart** (hand-rolled, no chart library)
- **Consistent 4px border-radius scale** — 6 / 10 / 14 / 20px

### What Aquerii currently lacks vs the reference
| Dimension | Reference | Aquerii Now |
|-----------|-----------|-------------|
| Background depth | 3-layer (deepest/base/surface) | 2-layer |
| Glass surfaces | `backdrop-filter: blur(16px)` | Not consistently applied |
| Spring animations | Defined as CSS vars | Missing / inconsistent |
| Sidebar | Collapsible, workspace switcher | Fixed width, no collapse |
| Dashboard | Stat cards + pie chart + bars | Exists but unstyled |
| Scrollbars | 4px custom styled | Default |
| Accent themes | 6 switchable accent colours | Single hardcoded colour |
| Status colours | CSS vars with tokens | Hardcoded hex in components |

---

## 2. Design Tokens (Tailwind + CSS Custom Properties)

Define all tokens in `services/web/src/index.css` and mirror in `tailwind.config.ts` for Tailwind utility class support.

### 2.1 Colour Palette

```css
:root {
  /* Backgrounds */
  --color-bg-deepest:  #07070d;
  --color-bg-base:     #0b0b14;
  --color-bg-surface:  rgba(16, 16, 28, 0.85);
  --color-bg-elevated: rgba(22, 22, 38, 0.80);
  --color-bg-hover:    rgba(255, 255, 255, 0.06);
  --color-bg-active:   rgba(255, 255, 255, 0.10);
  --color-bg-input:    rgba(0, 0, 0, 0.35);

  /* Glass */
  --color-glass-border:       rgba(255, 255, 255, 0.07);
  --color-glass-border-hover: rgba(255, 255, 255, 0.15);
  --color-glass-bg:           rgba(16, 16, 30, 0.60);
  --color-glass-bg-strong:    rgba(16, 16, 30, 0.85);

  /* Text */
  --color-text-primary:   #f0f0f5;
  --color-text-secondary: #a0a0b8;
  --color-text-tertiary:  #606080;

  /* Accent (overridden by theme class) */
  --color-accent:       #7c3aed;
  --color-accent-hover: #6d28d9;
  --color-accent-light: rgba(124, 58, 237, 0.15);
  --color-accent-glow:  rgba(124, 58, 237, 0.35);
  --color-accent-text:  #a78bfa;

  /* Status */
  --color-status-todo:        #6b7280;
  --color-status-in-progress: #f59e0b;
  --color-status-review:      #3b82f6;
  --color-status-done:        #10b981;

  /* Priority */
  --color-priority-urgent: #ef4444;
  --color-priority-high:   #f97316;
  --color-priority-medium: #f59e0b;
  --color-priority-low:    #6b7280;

  /* Shadows */
  --shadow-sm:   0 2px 8px rgba(0,0,0,0.40);
  --shadow-md:   0 8px 32px rgba(0,0,0,0.50);
  --shadow-lg:   0 16px 48px rgba(0,0,0,0.60);
  --shadow-glow: 0 0 30px var(--color-accent-glow);
}

/* Accent themes */
.theme-violet  { --color-accent: #7c3aed; --color-accent-hover: #6d28d9; --color-accent-light: rgba(124,58,237,0.15); --color-accent-glow: rgba(124,58,237,0.35); --color-accent-text: #a78bfa; }
.theme-blue    { --color-accent: #2563eb; --color-accent-hover: #1d4ed8; --color-accent-light: rgba(37,99,235,0.15);  --color-accent-glow: rgba(37,99,235,0.35);  --color-accent-text: #93c5fd; }
.theme-teal    { --color-accent: #0d9488; --color-accent-hover: #0f766e; --color-accent-light: rgba(13,148,136,0.15); --color-accent-glow: rgba(13,148,136,0.35); --color-accent-text: #5eead4; }
.theme-rose    { --color-accent: #e11d48; --color-accent-hover: #be123c; --color-accent-light: rgba(225,29,72,0.15);  --color-accent-glow: rgba(225,29,72,0.35);  --color-accent-text: #fda4af; }
.theme-amber   { --color-accent: #d97706; --color-accent-hover: #b45309; --color-accent-light: rgba(217,119,6,0.15);  --color-accent-glow: rgba(217,119,6,0.35);  --color-accent-text: #fcd34d; }
.theme-emerald { --color-accent: #059669; --color-accent-hover: #047857; --color-accent-light: rgba(5,150,105,0.15);  --color-accent-glow: rgba(5,150,105,0.35);  --color-accent-text: #6ee7b7; }
```

### 2.2 Spacing & Radius

```css
:root {
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
}
```

Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64px (Tailwind default spacing is fine)

### 2.3 Typography

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
html { font-size: 14px; }
```

Scale:
- `text-xs` — 11px / 1.4 — labels, badges, helper text
- `text-sm` — 13px / 1.5 — body, form fields, table cells
- `text-base` — 14px / 1.5 — default
- `text-md` — 15px / 1.4 — sub-headings
- `text-lg` — 17px / 1.3 — section headings
- `text-xl` — 20px / 1.2 — page titles
- `text-2xl` — 24px / 1.1 — stat card values

### 2.4 Animation Tokens

```css
:root {
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out:    cubic-bezier(0.16, 1, 0.30, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-fast:    150ms;
  --dur-normal:  300ms;
  --dur-slow:    500ms;
}
```

Standard keyframes: `slide-up`, `slide-down`, `fade-in`, `scale-in` (same as reference).

---

## 3. Component Refresh

### 3.1 AppLayout Sidebar

**Target behaviour (matching reference):**
- Collapsible — icon-only rail at 64px when collapsed
- Workspace switcher at top (click → dropdown with workspace list + "Create workspace")
- Search bar (Ctrl+K)
- Navigation items with icon + label, active state with accent bg pill
- Collapsible section groups: Favourites, Projects, Team
- Team member avatar row with online status dot
- Accent theme switcher (6 swatches)
- User avatar at bottom

**Current gap:** sidebar is fixed-width, no collapse, no workspace switcher UI.

### 3.2 Glass Card Component

```tsx
// components/ui/GlassCard.tsx
// bg: var(--color-bg-surface), backdrop-filter: blur(16px),
// border: 1px solid var(--color-glass-border),
// border-radius: var(--radius-lg),
// box-shadow: var(--shadow-md)
```

Used for: modals, panels, stat cards, dashboard widgets.

### 3.3 Stat Card

```tsx
// Matches reference DashboardView StatCard
// Icon with coloured chip background, large value, secondary label
```

### 3.4 Button Variants

```
primary   — accent bg, white text, glow shadow on hover
secondary — glass bg, border, text-primary
ghost     — transparent, text-secondary, bg-hover on hover
danger    — red-600 bg
icon      — square, ghost variant
```

### 3.5 Form Inputs

- Background: `var(--color-bg-input)`
- Border: `var(--color-glass-border)`
- Focus: border changes to `var(--color-accent)` with `box-shadow: 0 0 0 3px var(--color-accent-light)`
- No browser outline

### 3.6 Table Component

Consistent table style:
- Header: `text-xs uppercase tracking-wide text-tertiary`
- Row hover: `bg-hover`
- Row border: `border-b border-glass`
- Sticky first column for wide tables

---

## 4. Page-Specific Improvements

### 4.1 Dashboard

Add (or upgrade existing `DashboardView`):
- 4-up stat card row (Total Tasks, In Progress, Overdue, Completion %)
- Task distribution donut chart (hand-rolled SVG, no library)
- Tasks by project bar chart
- Recent activity feed with timeline dots
- Upcoming meetings widget (from meetings module)
- Recent invoices widget (total outstanding)

### 4.2 AppLayout Header

Add global header bar (56px) with:
- Breadcrumb: Workspace > Section > Page
- Global search (Ctrl+K) — opens `CommandPalette`
- Notifications bell with unread count badge
- User avatar + dropdown (profile, settings, sign out)

### 4.3 Kanban Board

- Card hover: `translate-y(-2px)` spring animation
- Drag-and-drop visual: card gets slight scale + shadow
- Column header: task count badge, add task button
- Empty column: dashed border drop target

### 4.4 ERP Module Pages

Apply consistent glass card layout to all ERP pages:
- Table inside a `GlassCard`
- Action bar above table (search, filters, + New button)
- Status badges using consistent colour tokens

---

## 5. Motion Design Principles

1. **Entrances:** `slide-up` + `fade-in` for modals; `slide-right` for side panels
2. **Exits:** `fade-out` + `scale-down` for modals (150ms)
3. **Hover states:** 150ms ease-out
4. **Active/pressed:** `scale(0.97)` for buttons
5. **Loading:** shimmer skeleton with `rgba` gradient sweep
6. **Spring:** use `--ease-spring` only for satisfying snaps (sidebar collapse, card lift)

---

## 6. Tailwind Config Extension

```ts
// tailwind.config.ts
extend: {
  colors: {
    accent: 'var(--color-accent)',
    'accent-hover': 'var(--color-accent-hover)',
    'accent-light': 'var(--color-accent-light)',
    'bg-base': 'var(--color-bg-base)',
    'bg-surface': 'var(--color-bg-surface)',
    'bg-elevated': 'var(--color-bg-elevated)',
    'text-primary': 'var(--color-text-primary)',
    'text-secondary': 'var(--color-text-secondary)',
    'text-tertiary': 'var(--color-text-tertiary)',
    'glass-border': 'var(--color-glass-border)',
  },
  borderRadius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
  },
  transitionTimingFunction: {
    spring: 'var(--ease-spring)',
    'ease-out': 'var(--ease-out)',
  },
  boxShadow: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    glow: 'var(--shadow-glow)',
  },
}
```

---

## 7. Implementation Phases

### Phase 1: Token Layer (1 day)
- Write design tokens to `index.css`
- Extend `tailwind.config.ts`
- Apply base font, scrollbar, body background

### Phase 2: Core Components (2 days)
- `GlassCard`, `Button` variants, `Input`, `Badge`, `Avatar`, `Tooltip`
- Storybook-style visual test page at `/dev/components`

### Phase 3: AppLayout Overhaul (2 days)
- Collapsible sidebar with workspace switcher
- **Workspace logo / InitialsAvatar in sidebar header** — `logo_url` from workspace context; falls back to `InitialsAvatar` with brand colour (see `COMPANY_BRANDING.md`)
- **Brand colour injection** — `workspace.color` applied as `--color-accent` CSS var on workspace load; all accent-derived tokens update automatically
- Header bar with breadcrumb, search, notifications, user menu
- Accent theme switcher stored in `workspace.settings`

### Phase 4: Page Polish (3 days)
- Dashboard widgets
- ERP table/card consistency
- Kanban animations
- Modal enter/exit animations

---

## 8. Multi-Select & Bulk Operations UI Patterns

All list/table views (Invoices, Sales Orders, Purchase Orders, Contacts, Deals, Products, Tasks) must support multi-select and bulk operations. This section defines the shared UI contract; backend implementation is detailed in `BULK_OPERATIONS.md`.

### 8.1 Checkbox Column

- First column of every table: 16px checkbox, hidden until row is hovered (then visible at 40% opacity) or when any row is already selected (then all visible at full opacity).
- Header checkbox: indeterminate state when some rows selected; checked when all visible rows selected.
- Clicking a row's checkbox does not open the row detail; clicking the row body does.

```tsx
// Reusable pattern
<thead>
  <tr>
    <th className="w-10 px-3">
      <Checkbox
        checked={allSelected}
        indeterminate={someSelected}
        onChange={toggleAll}
      />
    </th>
    ...columns
  </tr>
</thead>
```

### 8.2 Bulk Action Bar

When 1+ rows are selected, a floating action bar animates up from the bottom of the viewport:

```
┌────────────────────────────────────────────────────────────────┐
│  ✓ 3 selected   [Archive]  [Delete]  [Change Status ▾]  [×]   │
└────────────────────────────────────────────────────────────────┘
```

CSS:
```css
.bulk-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(calc(100% + 32px));
  transition: transform var(--duration-300) var(--ease-spring);
}
.bulk-bar.visible {
  transform: translateX(-50%) translateY(0);
}
```

Actions vary by context:
| Page | Available Bulk Actions |
|------|----------------------|
| Invoices | Send, Mark Paid, Void, Delete |
| Sales Orders | Confirm, Cancel, Delete |
| Purchase Orders | Send to Supplier, Mark Received, Delete |
| Contacts/Companies | Archive, Delete, Assign Account Manager, Export CSV |
| Products | Archive, Delete, Update Price %, Assign Category |
| Tasks | Mark Complete, Change Assignee, Move to Board, Delete |

### 8.3 Soft Delete Visual States

Soft-deleted records:
- Show with 50% opacity and a strikethrough on the primary name field
- Not visible in default list (use `?show=archived` query param to fetch)
- "Archived" filter pill at top of list tables

```tsx
// Filter pill row above tables
<div className="flex gap-2 mb-3">
  <FilterPill active={filter === 'active'} onClick={() => setFilter('active')}>Active</FilterPill>
  <FilterPill active={filter === 'archived'} onClick={() => setFilter('archived')}>Archived</FilterPill>
  <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterPill>
</div>
```

Archived records show a "Restore" button in their action menu. Permanently deleted only from archived state with a confirmation dialog showing cascade consequences.

### 8.4 Selection Persistence

- Selection cleared on: page change, filter change, new search query.
- Selection persists across: sort order change, column visibility toggle.
- "Select all on this page" vs "Select all N records" — when all visible rows are selected, show a prompt: "42 records on this page selected. Select all 318 records?" 

---

## 9. Success Criteria

- [ ] All design tokens defined in `index.css` and Tailwind config
- [ ] Sidebar collapses to icon rail; workspace switcher functional
- [ ] 6 accent themes switchable from sidebar
- [ ] Dashboard shows 4 stat cards, donut chart, activity feed
- [ ] All modals use `slide-up` entrance animation
- [ ] No hardcoded colour hex values in component files (all use tokens)
- [ ] `tsc --noEmit` still passes after all changes
- [ ] Visually surpasses reference `F:\project-management` on: depth, animation polish, information density
- [ ] All list/table views have multi-select checkbox column
- [ ] Bulk action bar animates up when selection is non-empty
- [ ] Archived filter pill on all list views; soft-deleted rows styled at 50% opacity
- [ ] "Select all N records" prompt when full-page selection is made
