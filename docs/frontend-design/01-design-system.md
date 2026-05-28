# Aquerii Design System v1.0

## Purpose

Single source of truth for every visual and behavioral primitive in Aquerii. This system must scale across 50+ route-level views, three workspace tiers (free/pro/enterprise), and full light/dark mode without a single style leak. Every token, component, and animation defined here is enforced by design-token CI linting and visual regression tests. No exceptions.

---

## API Contract

This file defines no runtime API contract. It is consumed by:
- `tailwind.config.ts` (token mapping)
- `src/theme/tokens.css` (CSS custom properties)
- `src/components/ui/core/*` (component primitives)
- `src/components/ui/layout/*` (layout primitives)
- `src/components/ui/complex/*` (domain-specific composites)

Design tokens are compiled into a single `:root` / `[data-theme="dark"]` block and tree-shaken at build time. Runtime theme switching toggles the `data-theme` attribute on `<html>` — no recalculation, no flash.

---

## Color Palette

### Primary — #0b5fff
This is our brand anchor. It appears on primary buttons, links, active nav states, and brand marks.

| Token | Light | Dark |
|-------|-------|------|
| `--color-primary-50` | #eff6ff | #1a2332 |
| `--color-primary-100` | #dbeafe | #1e2d48 |
| `--color-primary-200` | #bfdbfe | #2a3f60 |
| `--color-primary-300` | #93c5fd | #3b5a87 |
| `--color-primary-400` | #60a5fa | #4f7ab0 |
| `--color-primary-500` | #0b5fff | #0b5fff |
| `--color-primary-600` | #0048e0 | #3a7bfe |
| `--color-primary-700` | #0039b3 | #5a92ff |
| `--color-primary-800` | #002b87 | #7aabff |
| `--color-primary-900` | #001e5c | #9fc4ff |
| `--color-primary-950` | #001033 | #c4ddff |

### Accent — #7c3aed (violet)
Used sparingly for premium/enterprise features, AI-powered actions, and pro-tier badge treatment.

| Token | Light | Dark |
|-------|-------|------|
| `--color-accent-500` | #7c3aed | #8b5cf6 |
| `--color-accent-600` | #6d28d9 | #a78bfa |

### Semantic

| Token | Light | Dark | Use Case |
|-------|-------|------|----------|
| `--color-success` | #16a34a | #22c55e | Completed items, green badges, success toasts |
| `--color-success-bg` | #dcfce7 | #052e16 | Success alert backgrounds |
| `--color-warning` | #d97706 | #f59e0b | In-progress, overdue soon, medium priority |
| `--color-warning-bg` | #fef3c7 | #451a03 | Warning alert backgrounds |
| `--color-danger` | #dc2626 | #ef4444 | Errors, deletions, blocked items |
| `--color-danger-bg` | #fee2e2 | #450a0a | Error alert backgrounds |
| `--color-info` | #0284c7 | #38bdf8 | System messages, info tooltips |
| `--color-info-bg` | #e0f2fe | #0c1929 | Info alert backgrounds |

### Neutral

| Token | Light | Dark |
|-------|-------|------|
| `--color-bg-primary` | #ffffff | #111111 |
| `--color-bg-secondary` | #f8fafc | #1a1a1a |
| `--color-bg-tertiary` | #f1f5f9 | #232323 |
| `--color-bg-elevated` | #ffffff | #1e1e1e |
| `--color-border` | #e2e8f0 | #2a2a2a |
| `--color-border-hover` | #cbd5e1 | #3a3a3a |
| `--color-text-primary` | #0f172a | #f1f5f9 |
| `--color-text-secondary` | #475569 | #94a3b8 |
| `--color-text-tertiary` | #94a3b8 | #64748b |
| `--color-text-inverse` | #ffffff | #0f172a |

---

## Typography

Family: `Inter`, system-ui fallback in `src/styles/fonts.css` with `@font-face` for woff2.

### Scale (rem, 16px base)

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|-------|------|--------|-------------|----------------|-----|
| `--text-h1` | 2.25rem (36px) | 700 | 1.2 | -0.025em | Page titles (dashboard, board) |
| `--text-h2` | 1.875rem (30px) | 700 | 1.3 | -0.02em | Section headers |
| `--text-h3` | 1.5rem (24px) | 600 | 1.35 | -0.015em | Panel titles |
| `--text-h4` | 1.25rem (20px) | 600 | 1.4 | -0.01em | Card headers |
| `--text-h5` | 1.125rem (18px) | 600 | 1.45 | 0 | Sub-section headers |
| `--text-h6` | 1rem (16px) | 600 | 1.5 | 0 | Item group labels |
| `--text-body-lg` | 1rem (16px) | 400 | 1.6 | 0 | Body copy, descriptions |
| `--text-body` | 0.875rem (14px) | 400 | 1.5 | 0 | Table cells, form labels |
| `--text-body-sm` | 0.8125rem (13px) | 400 | 1.5 | 0 | Meta text, timestamps |
| `--text-caption` | 0.75rem (12px) | 400 | 1.4 | 0 | Badge text, avatars |
| `--text-overline` | 0.6875rem (11px) | 600 | 1.2 | 0.08em | Section overlines, tabs |
| `--text-monospace` | 0.8125rem (13px) | 400 | 1.5 | 0 | Code blocks, IDs, API keys |

Headings use `font-feature-settings: "cv02", "cv03", "cv04", "cv11"` for Inter's contextual alternates.

---

## Spacing Scale

4px grid. Every margin, padding, and gap snaps to this scale.

| Token | PX | REM |
|-------|----|-----|
| `--space-1` | 4px | 0.25rem |
| `--space-2` | 8px | 0.5rem |
| `--space-3` | 12px | 0.75rem |
| `--space-4` | 16px | 1rem |
| `--space-5` | 20px | 1.25rem |
| `--space-6` | 24px | 1.5rem |
| `--space-8` | 32px | 2rem |
| `--space-10` | 40px | 2.5rem |
| `--space-12` | 48px | 3rem |
| `--space-14` | 56px | 3.5rem |
| `--space-16` | 64px | 4rem |

No fractional spacing. An 18px gap is a bug.

---

## Elevation & Shadow

### Layer Definitions

| Layer | Light Shadow | Dark Shadow | Use |
|-------|------------|-------------|-----|
| `--elevation-0` | none | none | Base surface |
| `--elevation-1` | `0 1px 2px rgba(0,0,0,0.04)` | `0 1px 2px rgba(0,0,0,0.3)` | Cards, sidebar items |
| `--elevation-2` | `0 2px 8px rgba(0,0,0,0.06)` | `0 2px 8px rgba(0,0,0,0.35)` | Dropdowns, popovers |
| `--elevation-3` | `0 4px 16px rgba(0,0,0,0.08)` | `0 4px 16px rgba(0,0,0,0.4)` | Modals, side panels |
| `--elevation-4` | `0 8px 32px rgba(0,0,0,0.10)` | `0 8px 32px rgba(0,0,0,0.45)` | Floating action palette, command palette |
| `--elevation-5` | `0 16px 48px rgba(0,0,0,0.12)` | `0 16px 48px rgba(0,0,0,0.5)` | Toast stack, critical alerts |

### Glassmorphism (subtle backdrop blur)

Modals and side panels at elevation-3 and above use:
```css
background: rgba(255, 255, 255, 0.85); /* light */
background: rgba(30, 30, 30, 0.85);     /* dark */
backdrop-filter: blur(16px) saturate(1.05);
-webkit-backdrop-filter: blur(16px) saturate(1.05);
```

Applied only when `prefers-reduced-transparency` is not set. Respect OS accessibility.

---

## Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-none` | 0 | |
| `--radius-sm` | 4px | Inputs, buttons, badges |
| `--radius-md` | 6px | Cards, selects |
| `--radius-lg` | 8px | Modals, panels, sidebars |
| `--radius-xl` | 12px | Kanban cards, rich tooltips |
| `--radius-2xl` | 16px | Command palette, leaf modals |
| `--radius-full` | 9999px | Avatars, pills, toggles |

---

## Motion & Animation

### Durations

| Token | ms | Curve | Use |
|-------|----|-------|-----|
| `--motion-fast` | 120ms | `cubic-bezier(0.4, 0, 0.6, 1)` | Hover states, color transitions |
| `--motion-normal` | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Panel open/close, dropdown |
| `--motion-slow` | 300ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Page transitions, modal enter |

### Presets

- **Enter**: `opacity 200ms ease-out, transform 200ms ease-out`
- **Exit**: `opacity 150ms ease-in, transform 150ms ease-in`
- **Scale**: `transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)` (spring-like for FAB/palette)
- **Slide**: `transform 250ms cubic-bezier(0.4, 0, 0.2, 1)` for side panels
- **Stagger**: Children animate with `animation-delay` increments of 30ms, capped at 300ms max total delay

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

No exceptions. If a motion is critical for UX (progress indicators), use `transform` or `opacity` only.

---

## Component Architecture

### Core (src/components/ui/core/)

| Component | Radix Primitive | States | Notes |
|-----------|----------------|--------|-------|
| Button | `@radix-ui/react-slot` | default, hover, active, disabled, loading, focus-visible | Variants: primary, secondary, tertiary, danger, ghost, link. Sizes: sm, md, lg, xl. Icon-only variant with tooltip. Loading spinner replaces icon, shrinks text. |
| Input | `@radix-ui/react-text-field` | default, hover, focus, error, disabled, read-only | With leading/trailing icon slots, character count, clear button. |
| Textarea | — | same as Input | Resize: vertical only (CSS `resize: vertical`). Auto-grow via `useAutoResize` hook. |
| Select | `@radix-ui/react-select` | default, focus, error, disabled, open | Searchable if options > 7. Virtualized list if > 50. |
| Checkbox | `@radix-ui/react-checkbox` | unchecked, checked, indeterminate, disabled, focus-visible | Indeterminate for tree-select. |
| Radio | `@radix-ui/react-radio-group` | unchecked, checked, disabled, focus-visible | Horizontal or vertical orientation prop. |
| Toggle | `@radix-ui/react-toggle` | off, on, disabled | Used in toolbar groups, settings. |
| Switch | `@radix-ui/react-switch` | off, on, disabled | Label placement left/right. |
| Avatar | — | image-loaded, initials, fallback | Props: src, name (for initials), size (sm/md/lg/xl). Fallback is first+last initial on neutral bg. Stacked variant for group avatars. |
| Badge | — | variant: success/warning/danger/info/neutral, subtle/outline/solid | Count variant for notification numbers. |
| Tooltip | `@radix-ui/react-tooltip` | hidden, visible | 200ms delay on enter, 0ms on leave. Side/top/bottom. Max-width 240px. |
| Popover | `@radix-ui/react-popover` | closed, open | With arrow. Close on outside click + Escape. |
| DropdownMenu | `@radix-ui/react-dropdown-menu` | closed, open, item-hover, item-focus, disabled | With separator, checkbox items, sub-menus. |
| Command | `cmdk` (pacocoursey) | closed, open, searching, empty, selected | Virtualized list, keyboard navigation, search groups. |
| Dialog | `@radix-ui/react-dialog` | closed, open, closing | Overlay with backdrop blur. Sizes: sm/md/lg/xl/full. Trap focus. |
| Sheet | `@radix-ui/react-dialog` | closed, open, closing | Side panel from left/right. Sizes: sm/md/lg. |
| Toast | `@radix-ui/react-toast` | enter, visible, swipe-out | Stack at bottom-right. Auto-dismiss 5s (error: manual dismiss). Max 3 visible. |
| ProgressBar | — | indeterminate, determinate, complete | Indeterminate for loading. Determinate with percentage label. |
| Skeleton | — | shimmer | CSS-only shimmer animation, no JS. Accepts width/height/border-radius. |

### Layout (src/components/ui/layout/)

| Component | Purpose | Props |
|-----------|---------|-------|
| Grid | CSS Grid layout | cols, gap, responsive breakpoints |
| Stack | Flex column/row with gap | direction, gap, align, justify |
| SplitPane | Resizable left/right or top/bottom | defaultSize, minSize, maxSize, direction |
| ResizablePanel | Drag-to-resize container | initialSize, onResize, minWidth |
| FloatingPanel | Absolutely positioned, draggable | defaultPosition, onPositionChange, dockable |

### Complex (src/components/ui/complex/)

| Component | Dependencies | Notes |
|-----------|-------------|-------|
| DataTable | TanStack Table v8 | Virtualized rows (react-virtuoso), column resize, reorder, hide/show, filter, sort, multi-select. Server-side pagination. Row click expands detail panel. |
| KanbanBoard | custom (`@dnd-kit` dnd-kit) | Column add/remove, card drag between columns, optimistic updates with rollback, swimlanes. |
| Timeline | custom | Horizontal/vertical, zoom levels (day/week/month/quarter), drag items, dependency lines, milestone markers. |
| GanttChart | custom | Same as Timeline but with dependent task bars, critical path highlight, baseline comparison. |
| Calendar | custom | Month/week/day views, drag-create events, click-to-expand. Event overlap resolution. |
| RichTextEditor | TipTap (Prosemirror) | Slash-commands (/), @-mentions for users, #-mentions for items, drag-drop images to upload (POST /api/upload), markdown shortcuts. |
| FileUploader | custom | Drag-drop zone, multi-file, progress per file, preview generation, DELETE /api/upload/{id}. |

### Workspace (src/components/ui/workspace/)

| Component | Purpose |
|-----------|---------|
| DockablePanel | Panel that can dock to any edge or float as a window |
| CollapsibleSidebar | Sidebar that collapses to icons on toggle/responsive |
| FloatingQuickActions | FAB that supports dock-to-bottom, position memory |
| CustomizableToolbar | Toolbar with add/remove/reorder buttons, persisted per workspace |

---

## State Management Pattern

### Zustand Stores (per domain)

```
src/stores/
  useAuthStore.ts        — user, token, mfa_required, login/logout/refresh actions
  useWorkspaceStore.ts   — currentWorkspace, member list, switchWorkspace
  useSidebarStore.ts     — collapsed, activeItem, pinned
  useThemeStore.ts       — light/dark/system, persisted
  useFloatingActionsStore.ts — visible, position, docked
  usePresenceStore.ts    — onlineUsers (via Socket.IO), status
```

TanStack Query handles ALL server state:
```typescript
// Example pattern
function useBoardItems(boardId: string) {
  return useQuery({
    queryKey: ['board', boardId, 'items'],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/boards/${boardId}/items`),
    staleTime: 30_000,
    cacheTime: 5 * 60_000,
  });
}
```

Zustand stores NEVER cache server data. They hold only client-only UI state and synchronized auth tokens.

### Mutation Pattern

```typescript
const mutation = useMutation({
  mutationFn: (newOrder) => api.post(`/api/workspaces/${id}/boards/${boardId}/reorder`, newOrder),
  onMutate: async (newOrder) => {
    await queryClient.cancelQueries(['board', boardId, 'items']);
    const previous = queryClient.getQueryData(['board', boardId, 'items']);
    queryClient.setQueryData(['board', boardId, 'items'], optimisticOrder);
    return { previous };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['board', boardId, 'items'], context.previous);
    toast.error('Reorder failed');
  },
  onSettled: () => queryClient.invalidateQueries(['board', boardId, 'items']),
});
```

Socket.IO updates invalidate relevant query keys to keep server state fresh.

---

## Accessibility

- Target: WCAG 2.1 Level AA (AAA where practical)
- All interactive elements reachable via keyboard (Tab in logical order, Shift+Tab reverse)
- Focus indicators: `outline: 2px solid var(--color-primary-500); outline-offset: 2px;` — never `outline: none` without a replacement
- `aria-label` on all icon-only buttons
- `aria-expanded`, `aria-controls`, `aria-selected`, `aria-current="page"` on nav
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on modals/sheets
- Form inputs paired with `<label>` (hidden labels use `.sr-only`)
- Color contrast: all text combos pass 4.5:1 (normal) / 3:1 (large). CI check via `contrast-finder`
- Reduced motion media query respected (see Motion section)
- Reduced transparency media query respected
- Focus trap in modals, command palette, notification panel
- Skip-to-content link as first focusable element

We use Radix primitives for 90% of interactive components because they handle ARIA and keyboard interactions correctly out of the box. Custom components (Kanban, Gantt, Timeline) have dedicated a11y audits in CI.

---

## CSS Variable Strategy

```css
/* src/theme/tokens.css — compiled from design tokens, not hand-edited */
:root {
  --color-primary-500: #0b5fff;
  --color-bg-primary: #ffffff;
  --text-h1: 2.25rem;
  --space-4: 1rem;
  --elevation-2: 0 2px 8px rgba(0,0,0,0.06);
  --radius-md: 6px;
  --motion-normal: 200ms;
}

[data-theme="dark"] {
  --color-primary-500: #3a7bfe;
  --color-bg-primary: #111111;
}

/* Consumed via Tailwind */
/* tailwind.config.ts maps --color-* to custom colors */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          /* ... */
        },
      },
      spacing: {
        1: 'var(--space-1)',
        /* ... */
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
      },
    },
  },
};
```

Runtime theme switching: set `document.documentElement.dataset.theme = 'dark'`. All colors respond reactively. No flicker because we inject `<script>` in `index.html` that reads `localStorage.getItem('theme')` before first paint.

---

## Performance Budget

| Metric | Target | Enforcement |
|--------|--------|-------------|
| Time to Interactive (initial route) | <2s on Moto G4 / slow 3G | Lighthouse CI, bundlesize |
| Time to Interactive (subsequent routes) | <200ms | Route-based code splitting |
| First Contentful Paint | <1.2s | Inline critical CSS, preload Inter woff2 |
| Animation framerate | 60fps (no jank) | `will-change` on animated elements, GPU compositing |
| Component render | <16ms per frame | React.memo where proven needed (profiler), never proactively |
| Bundle size (gzip) | initial JS <120KB, total <300KB | `react-lazy`, `@loadable/component`, dynamic imports |
| Image loading | lazy (loading="lazy", IntersectionObserver) | Next-gen formats (webp/avif) |
| Code splitting | Per route + per panel (DataTable, Kanban, Gantt, Calendar) | Each complex component is `lazy(() => import(...))` |
| CSS | <30KB, no unused selectors | PurgeCSS in build, Tailwind JIT |

### Bundle Splitting Strategy

```
/chunk-main.js        — React, React Router, Zustand, TanStack Query, Socket.IO client, Radix core
/chunk-ui-core.js     — Button, Input, Select, etc. (shared across routes)
/chunk-auth.js        — Login, Register, ForgotPassword, ResetPassword, 2FA pages
/chunk-dashboard.js   — Dashboard widgets (split further if >50KB)
/chunk-board.js       — KanbanBoard, DataTable, Timeline
/chunk-workspace.js   — Sidebar, header, notification center, command palette
/chunk-settings.js    — All settings pages
/chunk-vendor.js      — TipTap, @dnd-kit, react-virtuoso (leaf dependencies, loaded only when route requires)
```

---

## Brutal Notes

1. **No CSS-in-JS.** We evaluated styled-components, emotion, and vanilla-extract. Tailwind + CSS variables wins for build-time extraction, zero runtime overhead, and team velocity. If you want dynamic styles, use inline `style` props with CSS variables — not a runtime library.

2. **No design token package.** Tokens live in `tokens.css` and are consumed by Tailwind config. A separate npm package adds CI overhead with zero benefit for a single-app codebase. If we grow to multi-app, extract then.

3. **Radix is not optional.** Every attempt to hand-roll a dropdown or dialog will introduce a focus-trap or aria bug. If a Radix primitive doesn't exist (Kanban, Gantt), the custom component must have a dedicated a11y test suite in Playwright.

4. **Skeleton shimmer is CSS-only.** No JS animation library for loading states. The shimmer gradient is defined in CSS, looped via `@keyframes shimmer`. This costs 0 bytes of JS and 0 layout shifts.

5. **File size above 200KB gzip is a release blocker.** The CI pipeline will fail any PR that increases total gzip by more than 5%. Use `webpack-bundle-analyzer` in the build pipeline.

6. **No `React.memo` by default.** Profile first, memo second. Unnecessary memo calls waste memory and add maintenance burden. Use `memo` only when the profiler shows >5 re-renders of a large subtree.

7. **Token changes require visual regression review.** Every PR modifying `tokens.css` must include Chromatic or Percy snapshots of all 24 baseline components in light and dark mode. No exceptions.

8. **The dark color palette is not inverted light.** Dark mode uses entirely different color values, not opacity-based inversion. Opacity on dark backgrounds creates muddy, unreadable text. Every dark token is hand-selected.

9. **Font-display: swap is non-negotiable.** We use `@font-face { font-display: swap; }` with a 100ms fallback to system-ui. If Inter fails to load, the UI remains functional. We preload Inter woff2 in the `<head>` to minimize FOUT.

10. **Motion curves are not decorative.** The `cubic-bezier(0.4, 0, 0.2, 1)` curve (standard easing) is used for almost everything because it feels natural. The spring curve on the FAB is the ONE exception. If you need a custom curve, justify it in a code review.

---

## Build Status

### Implemented (v0.1 — May 28, 2026)

All 13 UI primitives are built and compiling cleanly in `src/components/ui/`:

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Button | `ui/Button.tsx` | ✅ | 6 variants, 3 sizes, loading/disabled, polymorphic `as` prop, forwardRef |
| Input | `ui/Input.tsx` | ✅ | Label/error/helper, icon, clearable, password toggle, 3 sizes, forwardRef |
| Select | `ui/Select.tsx` | ✅ | Native styled select, label/error/helper, placeholder |
| Textarea | `ui/Textarea.tsx` | ✅ | Resize, char count, auto-grow, label/error |
| Badge | `ui/Badge.tsx` | ✅ | 6 variants, 3 sizes, dot/pill, removable, icon |
| Card | `ui/Card.tsx` | ✅ | 3 variants (default/interactive/glass), Header/Body/Footer, 4 padding levels |
| Modal | `ui/Modal.tsx` | ✅ | Portal, 5 sizes, escape/click-outside, locked body scroll |
| Toggle | `ui/Toggle.tsx` | ✅ | Label (left/right), 2 sizes, 3 color variants |
| Checkbox | `ui/Checkbox.tsx` | ✅ | Label, indeterminate, error state, forwardRef |
| DropdownMenu | `ui/DropdownMenu.tsx` | ✅ | Compound API, keyboard nav, icons, shortcuts, submenus |
| Avatar | `ui/Avatar.tsx` | ✅ | Image→initials fallback, 5 sizes, presence dot, Group |
| Tabs | `ui/Tabs.tsx` | ✅ | Compound Tabs/List/Panel, controlled/uncontrolled, horizontal/vertical |
| EmptyState | `ui/EmptyState.tsx` | ✅ | Icon, title, desc, action, compact/full |
| index | `ui/index.ts` | ✅ | Re-exports all |

### Not Yet Built
- `ui/toast.tsx` — uses react-hot-toast for now (v0.1); migrate to custom component in v0.2
- `ui/DataTable.tsx` — complex composite; deferred to v0.2 when table-heavy pages are rebuilt
- `ui/KanbanBoard.tsx` — deferred; existing board components work
- `ui/RichTextEditor.tsx` — deferred; BlockNote is imported directly
- Light theme CSS variables — deferred; dark-only in v0.1
