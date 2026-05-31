# Phase 3 — Frontend UI/UX & Design System

## Objective
Create a consistent, professional, and powerful design system that works across all 43 pages. Fix the existing fragmentation (dual Sidebar/NavRail, double settings tabs) and build a cohesive visual language.

## Current State Problems
- Dark theme only (no light mode)
- No design token system (hardcoded colors)
- Dual navigation: Sidebar.tsx + NavRail.tsx coexist
- Double settings tab components: both `pages/settings/` and `components/settings/`
- No consistent spacing/typography system
- No loading skeletons on most pages
- No responsive layout (desktop-only)
- No animation system

## Design System

### Tokens (CSS Custom Properties)
```css
--color-bg-deepest:     #07070d
--color-bg-base:        #0b0b14
--color-bg-surface:     #111122
--color-bg-elevated:    #1a1a2e

--color-accent:         From branding API (#7c3aed default)
--color-accent-hover:   Lightened 15%
--color-accent-light:   rgba(124, 58, 237, 0.15)

--color-text-primary:   #f1f5f9
--color-text-secondary: #94a3b8
--color-text-muted:     #64748b

--radius-sm:    4px
--radius-md:    8px
--radius-lg:    12px
--radius-xl:    20px

--shadow-sm:    0 1px 2px rgba(0,0,0,0.3)
--shadow-md:    0 4px 12px rgba(0,0,0,0.4)
--shadow-lg:    0 8px 32px rgba(0,0,0,0.5)

--easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1)
--easing-smooth: cubic-bezier(0.4, 0, 0.2, 1)
```

### Component Library
Standardize on these shared components:

| Component | Purpose | Status |
|-----------|---------|--------|
| `Button` | Primary, secondary, ghost, danger variants | New |
| `Dialog` | Modal dialog with title, body, actions | New |
| `Select` | Styled select with search | New |
| `Input` | Text input with label, error, icon | New |
| `Table` | Sortable, filterable, paginated table | Partial |
| `Badge` | Status/priority/label badge | Existing (StatusBadge) |
| `Card` | Container with header, body, footer | Partial |
| `Tabs` | Tab navigation | Existing |
| `Skeleton` | Loading placeholder | Existing |
| `Toast` | Notification toast | Via react-hot-toast |
| `Tooltip` | Hover tooltip | New |
| `Avatar` | User/entity avatar | Existing (InitialsAvatar) |
| `EmptyState` | Empty/blank state with illustration | New |
| `Spinner` | Loading spinner | New |

### Page Layout Standard
```
┌─────────────────────────────────────────────────┐
│  NavRail (collapsible)          │  TopBar        │
│  ┌───────┬──────────────────────┴───────────────┤
│  │       │                                      │
│  │Context│  Page Content (responsive grid)      │
│  │Panel  │                                      │
│  │(per   │                                      │
│  │route) │                                      │
│  │       │                                      │
│  └───────┴──────────────────────────────────────┘
```

### Light Mode
Add `data-theme="light"` support:
- Invert bg/text colors
- Keep accent colors
- Store preference in localStorage
- Toggle in Settings > Appearance

### Animation System
- Page transitions: fade + slide (100ms)
- Modal/drawer: scale + fade (200ms)
- Card hover: lift + glow (150ms)
- List item: stagger entry (50ms each)
- Use CSS `@keyframes` only (no Framer Motion dependency)

## Tasks

### 3.1 — Design Token Cleanup
- Audit all hardcoded colors in Tailwind config
- Replace with CSS variable references
- Add light mode variable set
- Create `ThemeContext` with toggle

### 3.2 — Navigation Consolidation
- Remove duplicate Sidebar.tsx
- Make NavRail the single navigation component
- Add workspace switcher dropdown to NavRail
- Responsive: collapse to icons on small screens

### 3.3 — Settings Tab Consolidation
- Remove `components/settings/` duplicate tabs
- Keep `pages/settings/` as the single source
- Add Settings layout with tab routing

### 3.4 — Shared Component Library
- Build missing components: Button, Dialog, Select, Input, Tooltip, EmptyState, Spinner
- Standardize existing: Table, Card, Badge
- Document component props and usage

### 3.5 — Page Polish Pass
- Add Skeleton loading states to every data-fetching page
- Add EmptyState when no data
- Add error boundary with retry
- Standardize spacing (use design tokens)

### 3.6 — Light Mode
- Complete light mode color palette
- `ThemeContext` with localStorage persistence
- Toggle in Settings > Appearance
- Test all 43 pages in both themes

### 3.7 — Responsive Layout
- Mobile: stack nav vertically, full-width content
- Tablet: collapsed nav rail, two-column layouts
- Desktop: full nav rail, multi-column

## Files Modified
- `tailwind.config.js` (design tokens)
- `src/index.css` (light mode variables, animations)
- `src/contexts/ThemeContext.tsx` (new)
- `src/components/layout/NavRail.tsx` (consolidate)
- `src/components/ui/` (new shared components)
- Every page file (skeleton states, empty states)

## CI Gate
```bash
npm run test:unit && npm run build
```

## Commit Strategy
One component per commit, then one bulk polish commit per section:
1. `feat(ui): design token system with light mode variables`
2. `feat(ui): Button, Dialog, Select, Input components`
3. `feat(ui): Tooltip, EmptyState, Spinner components`
4. `feat(ui): consolidate navigation to single NavRail`
5. `feat(ui): consolidate settings tabs`
6. `feat(ui): add skeleton loading states to all pages`
7. `feat(ui): add empty states and error boundaries`
8. `feat(ui): implement light mode theme toggle`
9. `feat(ui): responsive layout support`
