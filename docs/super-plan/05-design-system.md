# 05 — Design System

> Aquerii Design System v1.0  
> Stack: React + Tailwind CSS. No component library. Raw HTML tags styled with Tailwind.  
> Aesthetic target: Linear.app / Vercel dashboard — not Monday.com.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color Palette](#2-color-palette)
3. [Typography](#3-typography)
4. [Layout & Spacing](#4-layout--spacing)
5. [Component Specs](#5-component-specs)
6. [Icons](#6-icons)
7. [Motion & Transitions](#7-motion--transitions)
8. [Dark Mode](#8-dark-mode)
9. [Responsive Design](#9-responsive-design)
10. [Accessibility](#10-accessibility)
11. [Empty States](#11-empty-states)
12. [Page UX Specs](#12-page-ux-specs)
13. [Thou Shalt Not Rules](#13-thou-shalt-not-rules)

---

## 1. Design Philosophy

Aquerii is a tool used by professionals who live in it all day. The design must respect that. Every decision should reduce cognitive load, maximize information density, and never waste a pixel on decoration that doesn't serve the user.

### Core Principles

**Premium and information-dense.** The interface communicates competence. Data tables are tight. Cards show exactly what they need to show — nothing more. Whitespace is intentional, not generous. Users should be able to scan a page and immediately understand what requires their attention.

**Fast-feeling.** Transitions are short. Hover states respond immediately. Skeleton loaders appear on the first frame. Nothing flickers. Nothing jumps. The app should feel like a native desktop tool, not a web page.

**No decorative gradients on data surfaces.** Gradients are permitted on the marketing site only. Within the application, data cards, tables, modals, and panels use flat white or flat dark backgrounds with subtle borders. A gradient on a stat card is a red flag.

**Dark sidebar, white content.** The sidebar is always `#0f0f11` — dark, structured, permanent. The main content area is `#ffffff` (light mode) or `#09090b` (dark mode). This contrast is intentional: the sidebar is navigation infrastructure, the content is the work.

**Subtle shadows, not deep ones.** `shadow-sm` for cards at rest. `shadow-md` on hover or for elevated modals. `shadow-2xl` for modals/overlays. Never `shadow-xl` on a data card. Shadows indicate elevation — use them with that meaning, not for decoration.

**Every pixel intentional.** If you can't explain why a spacing value, color, or element exists, it should not exist. The 8px grid is not optional. Arbitrary `mt-3` values that break the rhythm are bugs, not style choices.

### What We Are Not

- Not a consumer app. No rounded-3xl buttons. No playful illustrations on data pages.
- Not a visual-heavy dashboard. Charts exist to answer questions, not to look impressive.
- Not a mobile-first product. Desktop is primary. Mobile is supported, not optimized.
- Not Monday.com. No color-explosion status columns. No oversized emoji-based labels.

---

## 2. Color Palette

### Brand & Interactive

| Role | Hex | Tailwind Token |
|---|---|---|
| Primary / Interactive | `#6366f1` | `indigo-500` |
| Primary hover | `#4f46e5` | `indigo-600` |
| Primary active | `#4338ca` | `indigo-700` |
| Primary light bg | `#eef2ff` | `indigo-50` |
| Primary light text | `#4338ca` | `indigo-700` |

### Surfaces

| Role | Hex | Tailwind Token |
|---|---|---|
| Sidebar background | `#0f0f11` | custom: `sidebar` |
| Content background | `#ffffff` | `white` |
| Body background | `#f4f4f5` | `zinc-100` |
| Card background | `#ffffff` | `white` |
| Card border | `#e4e4e7` | `zinc-200` |
| Divider | `#f4f4f5` | `zinc-100` |
| Hover surface | `#fafafa` | `zinc-50` |

### Text

| Role | Hex | Tailwind Token |
|---|---|---|
| Text primary | `#18181b` | `zinc-900` |
| Text secondary | `#71717a` | `zinc-500` |
| Text muted | `#a1a1aa` | `zinc-400` |
| Sidebar text default | `#a1a1aa` | `zinc-400` |
| Sidebar text active | `#ffffff` | `white` |
| Sidebar text hover | `#e4e4e7` | `zinc-200` |

### Semantic

| Role | Hex | Tailwind Token |
|---|---|---|
| Success | `#22c55e` | `green-500` |
| Success bg | `#f0fdf4` | `green-50` |
| Success text | `#15803d` | `green-700` |
| Warning | `#f59e0b` | `amber-500` |
| Warning bg | `#fffbeb` | `amber-50` |
| Warning text | `#b45309` | `amber-700` |
| Error | `#ef4444` | `red-500` |
| Error bg | `#fef2f2` | `red-50` |
| Error text | `#b91c1c` | `red-700` |
| Info | `#3b82f6` | `blue-500` |
| Info bg | `#eff6ff` | `blue-50` |
| Info text | `#1d4ed8` | `blue-700` |

### Priority Colors

| Priority | Dot Color | Hex |
|---|---|---|
| Urgent | Red | `#ef4444` |
| High | Orange | `#f97316` |
| Medium | Yellow | `#f59e0b` |
| Low | Green | `#22c55e` |
| None | Zinc | `#d4d4d8` |

### Tailwind Config Extension

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: '#0f0f11',
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs:   ['11px', { lineHeight: '16px' }],
        sm:   ['13px', { lineHeight: '20px' }],
        base: ['15px', { lineHeight: '24px' }],
        lg:   ['17px', { lineHeight: '28px' }],
        xl:   ['20px', { lineHeight: '28px' }],
        '2xl':['24px', { lineHeight: '32px' }],
        '3xl':['30px', { lineHeight: '36px' }],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
      },
    },
  },
  plugins: [],
}
```

---

## 3. Typography

### Font

Inter from Google Fonts. Load via `<link>` in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Set base in CSS:

```css
body {
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Type Scale

| Token | Size | Line Height | Use |
|---|---|---|---|
| `text-xs` | 11px | 16px | Labels, badges, table headers, captions |
| `text-sm` | 13px | 20px | Body text, inputs, buttons, sidebar items |
| `text-base` | 15px | 24px | Default body, descriptions |
| `text-lg` | 17px | 28px | Section headings, modal titles |
| `text-xl` | 20px | 28px | Page headings (secondary) |
| `text-2xl` | 24px | 32px | Stat card values, page titles |
| `text-3xl` | 30px | 36px | Large stat values, hero numbers |

### Weight Usage

| Weight | Class | Use |
|---|---|---|
| Regular (400) | `font-normal` | Body copy, secondary text |
| Medium (500) | `font-medium` | Buttons, nav items, labels |
| Semibold (600) | `font-semibold` | Headings, card titles, active nav |
| Bold (700) | `font-bold` | Stat values, emphasis |

### Heading Classes

```
H1 (page title):    text-xl font-semibold text-zinc-900
H2 (section title): text-base font-semibold text-zinc-900
H3 (card title):    text-sm font-semibold text-zinc-900
H4 (subsection):    text-xs font-semibold text-zinc-700
```

### Label Style

```
text-xs font-medium uppercase tracking-wide text-zinc-500
```

Used for: table column headers, section dividers in sidebar, form field labels, stat card labels.

### Prose / Descriptions

```
text-sm text-zinc-500 leading-relaxed
```

---

## 4. Layout & Spacing

### Grid

All spacing uses the **8px base grid**. Tailwind's default spacing scale maps cleanly: `p-1=4px`, `p-2=8px`, `p-3=12px`, `p-4=16px`, `p-5=20px`, `p-6=24px`, `p-8=32px`. Do not use arbitrary values like `mt-[13px]` or `gap-[7px]`.

### Shell Dimensions

| Element | Value | Tailwind |
|---|---|---|
| Sidebar width (full) | 240px | `w-60` |
| Sidebar width (icon-only) | 64px | `w-16` |
| Topbar height | 56px | `h-14` |
| Content horizontal padding | 24px | `px-6` |
| Content vertical padding | 24px | `py-6` |
| Card padding | 20px | `p-5` |
| Card inner gap | 16px | `gap-4` |
| Max content width | 1280px | `max-w-7xl` |
| Section gap (vertical) | 24px | `gap-6` or `space-y-6` |

### Z-Index Layers

```
base content:   z-0
sticky headers: z-10
dropdown menus: z-20
sidebar mobile: z-30
modal backdrop: z-40
modal panel:    z-50
toast:          z-50
```

### Common Layout Patterns

**Two-column dashboard grid:**
```
grid grid-cols-1 lg:grid-cols-3 gap-6
```
Left column `lg:col-span-2`, right column `lg:col-span-1`.

**Stat card row:**
```
grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4
```

**Table page:**
```
flex flex-col gap-4
```
Filter bar → table card → pagination.

---

## 5. Component Specs

All components use raw HTML/JSX with Tailwind. No component library.

---

### Button

**Primary:**
```
inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
```

**Secondary:**
```
inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-white text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50 active:bg-zinc-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
```

**Danger:**
```
inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
```

**Ghost:**
```
inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-transparent text-zinc-600 rounded-lg hover:bg-zinc-100 active:bg-zinc-200 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
```

**Sizes (override px/py/text):**

| Size | Classes |
|---|---|
| sm | `px-2.5 py-1.5 text-xs rounded-md` |
| md | `px-3.5 py-2 text-sm rounded-lg` (default) |
| lg | `px-4 py-2.5 text-sm rounded-lg` |

**Icon-only button:**
```
p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors duration-150
```

---

### Input

**Base:**
```
block w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-150
```

**With error:**
```
border-red-300 focus:ring-red-500 focus:border-red-300
```

**Disabled:**
```
bg-zinc-50 text-zinc-400 border-zinc-200 cursor-not-allowed
```

**Search input (with icon):**
```
pl-9  (icon absolutely positioned left-3 top-1/2 -translate-y-1/2 text-zinc-400 size-4)
```

**Textarea:**
Same base classes. Add `resize-none min-h-[100px]`.

**Select:**
Same base classes. Add `pr-9 appearance-none` with chevron icon absolutely positioned right-3.

**Form field wrapper:**
```html
<div class="flex flex-col gap-1.5">
  <label class="text-xs font-medium text-zinc-700">Label</label>
  <input ... />
  <p class="text-xs text-red-600">Error message</p>  <!-- only when error -->
</div>
```

---

### Badge

**Base wrapper:**
```
inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full
```

**Color variants:**

| Variant | Classes |
|---|---|
| Default | `bg-zinc-100 text-zinc-600` |
| Primary | `bg-indigo-50 text-indigo-700` |
| Success | `bg-green-50 text-green-700` |
| Warning | `bg-yellow-50 text-yellow-700` |
| Danger | `bg-red-50 text-red-700` |
| Info | `bg-blue-50 text-blue-700` |

**With dot:**
Prepend `<span class="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>` inside the badge.

---

### Card

**Base:**
```
bg-white border border-zinc-200 rounded-xl shadow-sm
```

**Clickable / hoverable card:**
```
bg-white border border-zinc-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer
```

**Card header (when present):**
```
flex items-center justify-between px-5 py-4 border-b border-zinc-100
```

**Card body:**
```
p-5
```

**Card footer (when present):**
```
flex items-center justify-between px-5 py-3 border-t border-zinc-100 bg-zinc-50 rounded-b-xl
```

---

### Modal

**Backdrop:**
```
fixed inset-0 bg-black/40 backdrop-blur-sm z-40
```

**Panel (centered dialog):**
```
fixed inset-0 z-50 flex items-center justify-center p-4
```
Inner panel:
```
bg-white rounded-2xl shadow-2xl w-full max-w-lg
```

**Modal header:**
```
flex items-center justify-between px-6 py-4 border-b border-zinc-100
```
Title: `text-base font-semibold text-zinc-900`
Close button: icon-only ghost button, `size-5` X icon.

**Modal body:**
```
px-6 py-5
```

**Modal footer:**
```
flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100
```

---

### SlideOver

**Backdrop:** Same as modal.

**Panel (right slide-over):**
```
fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col
```
Entry animation: `translate-x-0` → from `translate-x-full` via `transition-transform duration-300`.

**SlideOver header:**
```
flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0
```

**SlideOver body:**
```
flex-1 overflow-y-auto px-6 py-5
```

**SlideOver footer:**
```
flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 shrink-0
```

---

### Table

**Outer wrapper:**
```
bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden
```

**Table element:**
```
min-w-full divide-y divide-zinc-200
```

**thead:**
```
bg-zinc-50
```

**th:**
```
px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap
```

**td:**
```
px-4 py-3 text-sm text-zinc-700 whitespace-nowrap
```

**tr (body):**
```
hover:bg-zinc-50 transition-colors duration-100
```

**Pagination bar:**
```
flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-white
```
Left: `text-xs text-zinc-500` showing "Showing 1–25 of 142"
Right: prev/next buttons (ghost sm).

---

### Tabs

**Nav container:**
```
flex border-b border-zinc-200 gap-0
```

**Tab button (inactive):**
```
px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 border-b-2 border-transparent hover:border-zinc-300 transition-all duration-150 -mb-px
```

**Tab button (active):**
```
px-4 py-2.5 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 -mb-px
```

**Tab content:**
```
pt-5
```

---

### Sidebar Navigation

**Sidebar shell:**
```
fixed inset-y-0 left-0 w-60 bg-sidebar flex flex-col z-30
```

**Logo area:**
```
flex items-center gap-2.5 px-4 h-14 shrink-0 border-b border-white/5
```

**Nav section:**
```
flex-1 overflow-y-auto px-2 py-3 space-y-0.5
```

**Section header:**
```
px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-widest text-zinc-600
```

**Nav item (inactive):**
```
flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-400 rounded-lg hover:bg-white/5 hover:text-white transition-colors duration-150 cursor-pointer
```

**Nav item (active):**
```
flex items-center gap-3 px-3 py-2 text-sm font-medium bg-white/10 text-white rounded-lg
```

**Nav item icon:** `size-5 shrink-0`

**Sidebar footer:**
```
px-2 py-3 border-t border-white/5
```
User avatar row: `flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors duration-150`

---

### Kanban Card

**Card base:**
```
bg-white border border-zinc-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer select-none
```

**Card title:**
```
text-sm font-medium text-zinc-900 leading-snug mb-2
```

**Card meta row (bottom):**
```
flex items-center justify-between mt-3
```

**Priority dot:**
```
w-2 h-2 rounded-full shrink-0
```
Colors: `bg-red-500` (urgent), `bg-orange-400` (high), `bg-amber-400` (medium), `bg-green-500` (low).

**Assignee avatar stack:**
```
flex -space-x-1
```
Each avatar: `w-6 h-6 rounded-full ring-2 ring-white object-cover`

**Column header:**
```
flex items-center justify-between mb-3
```
Title: `text-sm font-semibold text-zinc-700`
Count badge: `text-xs text-zinc-400 font-normal ml-1.5`

**Column drop zone:**
```
min-h-[200px] flex flex-col gap-2
```

---

### Avatar

**Size variants:**

| Size | Classes |
|---|---|
| xs | `w-6 h-6` |
| sm | `w-8 h-8` |
| md | `w-10 h-10` |
| lg | `w-12 h-12` |

**Image avatar:**
```
rounded-full object-cover ring-2 ring-white
```

**Initials fallback:**
```
rounded-full flex items-center justify-center bg-indigo-100 text-indigo-700 font-semibold text-xs ring-2 ring-white
```

**Avatar group (overlap):**
```
flex -space-x-2
```
Each with `ring-2 ring-white`.

---

### Stat Card (Dashboard)

**Outer card:**
```
bg-white border border-zinc-200 rounded-xl p-5 shadow-sm
```

**Icon area (top right):**
```
w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600
```
Icon: `size-6`

**Value:**
```
text-2xl font-bold text-zinc-900 mt-3
```

**Label:**
```
text-sm text-zinc-500 mt-1
```

**Change indicator (positive):**
```
inline-flex items-center gap-1 text-xs font-medium text-green-600
```
Prepend `↑` or use ArrowUp `size-3`.

**Change indicator (negative):**
```
inline-flex items-center gap-1 text-xs font-medium text-red-500
```

---

### Toast

**Container (portal, fixed):**
```
fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end
```

**Toast item:**
```
flex items-start gap-3 p-4 bg-zinc-900 text-white rounded-xl shadow-2xl max-w-sm w-full text-sm
```

**Icon area:**
```
shrink-0 mt-0.5
```
Icon size: `size-5`. Colors: `text-green-400` (success), `text-red-400` (error), `text-yellow-400` (warning), `text-blue-400` (info).

**Content:**
```
flex-1 flex flex-col gap-0.5
```
Title: `font-medium text-white`
Message: `text-zinc-400 text-xs`

**Close button:**
```
shrink-0 text-zinc-500 hover:text-white transition-colors duration-150
```

---

### Skeleton / Loading

**Base:**
```
animate-pulse bg-zinc-200 rounded
```

**Variants:**

| Use | Classes |
|---|---|
| Text line short | `h-4 w-24 rounded` |
| Text line full | `h-4 w-full rounded` |
| Text line medium | `h-4 w-48 rounded` |
| Avatar | `h-10 w-10 rounded-full` |
| Button | `h-9 w-24 rounded-lg` |
| Card | `h-32 w-full rounded-xl` |
| Table row | Three `h-4` blocks in a flex row with gap-4 |

Use `bg-zinc-100` for lighter skeletons on zinc-50 backgrounds.

---

### Dropdown Menu

**Trigger:** Any button with `aria-haspopup="menu"`.

**Panel:**
```
absolute z-20 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 min-w-[160px]
```

**Menu item:**
```
flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer transition-colors duration-100
```

**Destructive item:**
```
flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors duration-100
```

**Divider:**
```
my-1 border-t border-zinc-100
```

---

### Tooltip

**Trigger:** Wrap element with relative div.

**Tooltip box:**
```
absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none
```
Positioning classes: `bottom-full left-1/2 -translate-x-1/2 mb-2` (above).

---

### Progress Bar

**Wrapper:**
```
w-full bg-zinc-100 rounded-full h-1.5
```

**Fill:**
```
h-1.5 rounded-full bg-indigo-600 transition-all duration-300
```

---

## 6. Icons

Use **Lucide React** exclusively. Do not mix icon sets.

```
npm install lucide-react
```

**Default sizes:**

| Context | Size | StrokeWidth |
|---|---|---|
| Inline text / buttons | `size-4` (16px) | 2 (default) |
| Navigation sidebar | `size-5` (20px) | 1.75 |
| Modal headers / labels | `size-5` (20px) | 1.75 |
| Stat card icons | `size-6` (24px) | 1.5 |
| Empty state illustration | `size-12` (48px) | 1 |
| Toast icons | `size-5` (20px) | 2 |

**Usage pattern:**
```jsx
import { Search, Plus, ChevronDown } from 'lucide-react'

// Inline with button
<button className="inline-flex items-center gap-2 ...">
  <Plus size={16} />
  New Item
</button>

// Navigation
<LayoutDashboard size={20} strokeWidth={1.75} />

// Stat card
<TrendingUp size={24} strokeWidth={1.5} />
```

**Never:**
- Use emoji as icons in the app UI
- Mix Lucide with Heroicons, Phosphor, etc.
- Scale icons with font-size — always use the `size` prop
- Use solid/filled icons where Lucide only provides outline (it's outline only — that is the style)

---

## 7. Motion & Transitions

### Speed Tiers

| Tier | Duration | Use |
|---|---|---|
| Fast | 150ms | Color changes, hover backgrounds, border colors |
| Normal | 200ms | Shadows, opacity, scale, transform on small elements |
| Slow | 300ms | Panel slide-in, modal open, drawer animation |

### Tailwind Classes by Tier

```
Fast:   transition-colors duration-150
        transition-opacity duration-150
Normal: transition-all duration-200
        transition-shadow duration-200
        transition-transform duration-200
Slow:   transition-transform duration-300
        transition-all duration-300
```

### Rules

- **Never** animate layout-shift properties: `width`, `height`, `margin`, `padding`, `top`, `left`, etc.
- Use `transform` and `opacity` for smooth GPU-accelerated animations.
- Kanban card lift: `hover:-translate-y-0.5 transition-transform duration-150`
- Modal open: fade backdrop (`opacity-0` → `opacity-100`, 200ms), slide panel (`translate-y-4` → `translate-y-0`, 200ms).
- SlideOver: `translate-x-full` → `translate-x-0`, 300ms.
- Skeleton: `animate-pulse` (Tailwind built-in, 2s ease-in-out infinite).
- Do not animate every element on a page. Motion should draw attention, not create visual noise.

---

## 8. Dark Mode

### Strategy

Use Tailwind's `class` strategy. Toggle `dark` class on `<html>` element.

```js
// tailwind.config.js
darkMode: 'class',
```

The sidebar is **always dark** regardless of mode. Dark mode applies to the content area.

### Surface Mapping

| Light | Dark | Role |
|---|---|---|
| `bg-white` | `dark:bg-zinc-900` | Card / panel |
| `bg-zinc-50` | `dark:bg-zinc-800` | Hover / subtle bg |
| `bg-zinc-100` | `dark:bg-zinc-800` | Dividers, input bg |
| `bg-white` body | `dark:bg-zinc-950` | Body / page |
| `border-zinc-200` | `dark:border-zinc-800` | Card borders |
| `border-zinc-100` | `dark:border-zinc-800` | Dividers |

### Text Mapping

| Light | Dark | Role |
|---|---|---|
| `text-zinc-900` | `dark:text-zinc-100` | Primary text |
| `text-zinc-700` | `dark:text-zinc-300` | Body text |
| `text-zinc-500` | `dark:text-zinc-400` | Secondary text |
| `text-zinc-400` | `dark:text-zinc-500` | Muted text |

### Input Dark Mode

```
dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500
dark:focus:ring-indigo-500
```

### Example Component with Dark Mode

```jsx
<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Title</h3>
  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Description</p>
</div>
```

---

## 9. Responsive Design

### Breakpoints (Tailwind defaults)

| Prefix | Min-width | Use |
|---|---|---|
| (none) | 0px | Mobile |
| `sm:` | 640px | Large mobile / small tablet |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop (primary) |
| `xl:` | 1280px | Wide desktop |

### Sidebar Behavior

| Screen | Sidebar State |
|---|---|
| Mobile (`< md`) | Hidden; off-canvas, toggled via hamburger button |
| Tablet (`md`) | Icon-only `w-16`, tooltips on hover |
| Desktop (`lg+`) | Full `w-60` with labels |

**Mobile sidebar overlay:**
```
fixed inset-0 z-30 flex
```
- Backdrop: `fixed inset-0 bg-black/50 z-30`
- Sidebar panel: `relative z-40 w-60 bg-sidebar h-full`

**Mobile topbar:**
```
flex items-center justify-between h-14 px-4 bg-white border-b border-zinc-200 lg:hidden
```
Hamburger button: `p-2 rounded-lg text-zinc-500 hover:bg-zinc-100`

### Content Grid Patterns

**Stat cards:**
```
grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4
```

**Dashboard two-column:**
```
grid grid-cols-1 lg:grid-cols-3 gap-6
```

**Kanban columns:**
```
flex gap-4 overflow-x-auto pb-4
```
Each column: `min-w-[280px] flex-1`

**Table on mobile:** Wrap in `overflow-x-auto`. Never truncate or hide table columns on mobile — allow horizontal scroll.

---

## 10. Accessibility

### Focus Visible Ring

All interactive elements must have a visible focus ring. Use:
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
```

Never use `outline-none` without also providing `focus-visible:ring-*`.

### Color Contrast

- All text must meet WCAG AA: **4.5:1** minimum for normal text, **3:1** for large text.
- `text-zinc-900` on `bg-white`: passes (21:1).
- `text-zinc-500` on `bg-white`: passes (4.6:1).
- `text-zinc-400` on `bg-white`: fails on its own — only use for muted/decorative text where the information is available elsewhere.
- Never rely on color alone to convey status — always pair with text, icon, or pattern.

### Semantic HTML

```html
<!-- Buttons for actions -->
<button type="button">Delete</button>

<!-- Links for navigation -->
<a href="/settings">Settings</a>

<!-- Tables with scope -->
<th scope="col">Name</th>
<th scope="row">Row label</th>

<!-- Form labels -->
<label for="email">Email address</label>
<input id="email" type="email" />
```

### Modal Accessibility

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Confirm Delete</h2>
  <p id="modal-description">This action cannot be undone.</p>
</div>
```

- On open: move focus to first focusable element inside modal.
- Trap focus within modal while open.
- On close: return focus to the trigger element.
- ESC key closes modal.

### Navigation

```html
<nav aria-label="Main navigation">
  <ul role="list">
    <li>
      <a href="/dashboard" aria-current="page">Dashboard</a>
    </li>
  </ul>
</nav>
```

### Live Regions

Toasts and status updates:
```html
<div aria-live="polite" aria-atomic="true" class="sr-only">
  <!-- Status message text injected here -->
</div>
```

### Screen Reader Utilities

```
sr-only   — visually hidden but available to screen readers
not-sr-only — undo sr-only
```

Use for icon-only buttons:
```html
<button aria-label="Close dialog">
  <X size={16} aria-hidden="true" />
</button>
```

---

## 11. Empty States

Use when a list, table, or view has no data to display.

### Structure

```html
<div class="flex flex-col items-center justify-center py-16 px-4 text-center">
  <!-- Icon -->
  <div class="w-12 h-12 text-zinc-300 mb-4">
    <InboxIcon size={48} strokeWidth={1} />
  </div>

  <!-- Heading -->
  <h3 class="text-sm font-medium text-zinc-900 mb-1">No items yet</h3>

  <!-- Description -->
  <p class="text-sm text-zinc-500 max-w-xs">
    Create your first item to get started. It will appear here.
  </p>

  <!-- Optional CTA -->
  <button class="mt-5 inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-150">
    <Plus size={16} />
    New Item
  </button>
</div>
```

### Rules

- Icon: `size-12`, `text-zinc-300`, `strokeWidth={1}`. Choose an icon semantically relevant to the content (not a generic star or sparkle).
- Heading: one line, factual, not cute. "No deals found." not "Nothing here yet! 🌟"
- Description: one to two sentences. Explain the context or how to add data.
- CTA: only when there is a direct action the user can take. Do not show a CTA if the empty state is due to a filter — show a "clear filters" link instead.
- Never use an illustration SVG unless the design explicitly calls for it. The icon-based empty state is the default.

---

## 12. Page UX Specs

---

### Login Page

**Layout:** Full-screen centered split layout.
- Left panel (hidden on mobile): `w-1/2 bg-zinc-950 hidden lg:flex flex-col justify-between p-12` — dark brand panel with logo, tagline, and a subtle testimonial quote at the bottom.
- Right panel: `w-full lg:w-1/2 flex items-center justify-center p-8`

**Form card (right):** Max width `max-w-sm w-full mx-auto`.

**Elements:**
1. Logo mark (`w-8 h-8`) + wordmark, centered above form.
2. `h2` "Welcome back" — `text-2xl font-semibold text-zinc-900`.
3. Subtext "Sign in to your workspace" — `text-sm text-zinc-500 mt-2 mb-8`.
4. Email input with label.
5. Password input with label + "Forgot password?" link (`text-xs text-indigo-600 hover:text-indigo-700`), right-aligned.
6. Primary button full-width: `w-full justify-center`.
7. Divider: `relative border-t border-zinc-200` with "or" centered over it.
8. SSO button (secondary, full-width): Google or Microsoft SSO.
9. Footer: `text-xs text-zinc-400 text-center mt-6` "Don't have an account? [Contact sales]"

**Interactions:**
- Submit triggers loading state on button: spinner replaces icon, button disabled.
- Inline validation on blur, not on keystroke.
- Failed login shows a banner above the form: `bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3`.

---

### Main App Shell

**Structure:**
```
body: flex h-screen overflow-hidden bg-zinc-100

├── Sidebar (fixed, w-60 on lg+, w-16 on md, hidden on mobile)
│   ├── Logo area (h-14)
│   ├── Nav sections (flex-1 overflow-y-auto)
│   │   ├── Section: Main
│   │   │   ├── Dashboard
│   │   │   ├── My Work
│   │   │   └── Inbox
│   │   ├── Section: Workspace
│   │   │   ├── Board
│   │   │   ├── CRM
│   │   │   ├── Invoicing
│   │   │   ├── HR
│   │   │   └── Reports
│   └── Footer (user avatar row + settings)
│
└── Main (flex-1 flex flex-col overflow-hidden)
    ├── Topbar (h-14, bg-white, border-b border-zinc-200)
    │   ├── Left: breadcrumb / page title
    │   ├── Center: global search (hidden on mobile, cmd+K trigger)
    │   └── Right: notifications bell + avatar dropdown
    │
    └── Content (flex-1 overflow-y-auto)
        └── Inner: max-w-7xl mx-auto px-6 py-6
```

**Topbar detail:**
- Height: `h-14 flex items-center px-6 gap-4 bg-white border-b border-zinc-200 shrink-0`
- Breadcrumb: `text-sm text-zinc-500` with `>` separator, last item `text-zinc-900 font-medium`
- Search trigger: `flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors w-64 cursor-pointer`
- Notification bell: icon-only ghost button, `size-5`, with `relative` wrapper for unread dot (`absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500`)
- Avatar: `w-8 h-8 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-zinc-200 transition-all`

---

### Board / Kanban View

**Page header:**
```
flex items-center justify-between mb-6
```
Left: page title `text-xl font-semibold text-zinc-900` + item count badge.
Right: filter bar (assignee filter, priority filter, group-by select) + "New Item" primary button.

**Filter bar:**
```
flex items-center gap-2
```
Each filter: secondary button sm with ChevronDown icon. Active filter: `bg-indigo-50 text-indigo-700 border-indigo-200`.

**Board container:**
```
flex gap-4 overflow-x-auto pb-6 -mx-6 px-6
```

**Column:**
```
flex flex-col min-w-[280px] max-w-[280px]
```

**Column header:**
```
flex items-center gap-2 mb-3 px-0.5
```
- Status dot or colored left-border indicator
- Column title: `text-sm font-semibold text-zinc-700`
- Count: `text-xs text-zinc-400`
- Add card button: icon-only ghost, `size-4` Plus, right-aligned `ml-auto`

**Column body:**
```
flex flex-col gap-2 min-h-[120px]
```
Drag-and-drop: highlight drop zone with `bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-xl`.

**Card (see Kanban Card component above)**

**Quick-add card (at bottom of column):**
```
bg-white border border-dashed border-zinc-300 rounded-xl p-3 text-sm text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer flex items-center gap-2
```

---

### ItemDetailModal (SlideOver)

Triggered by clicking any kanban card or list item. Opens as a right-side SlideOver (`max-w-2xl`).

**Header:**
- Item title: editable inline (`contenteditable` or click-to-edit) — `text-lg font-semibold text-zinc-900`
- Status badge (dropdown on click)
- Priority indicator
- Close (X) button right-aligned

**Tab bar (below header):**
Tabs: Overview | Activity | Comments | Attachments | Related

**Overview tab content:**
```
grid grid-cols-2 gap-4
```
Left column (main):
- Description (rich text area, placeholder "Add a description...")
- Checklist section
- Attachments drop zone

Right column (sidebar):
- Assignee picker
- Due date picker
- Priority select
- Labels multi-select
- Project/board select
- Created/updated timestamps (`text-xs text-zinc-400`)

**Activity tab:**
Timeline list: `space-y-4`. Each entry: avatar + `text-sm text-zinc-700` action + `text-xs text-zinc-400` timestamp.

**Comments tab:**
- Comment list with avatar, name, timestamp, and markdown-rendered body.
- Comment composer at bottom: textarea + Send button.

**Interactions:**
- All fields auto-save on blur/change. No "Save" button for field edits.
- Changes reflected in the board/list in real-time (optimistic update).
- Unsaved comments show as draft with "Save" / "Discard" buttons.

---

### CRM Pipeline

**Layout:** Kanban-style pipeline columns (Lead → Qualified → Proposal → Negotiation → Won/Lost).

**Deal card:**
```
bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer
```
- Company name: `text-sm font-semibold text-zinc-900`
- Contact name: `text-xs text-zinc-500 mt-0.5`
- Deal value: `text-sm font-semibold text-zinc-900 mt-2` — right-aligned or on its own line
- Expected close: `text-xs text-zinc-400`
- Owner avatar: bottom right
- Stage probability badge: bottom left (e.g., "60%")

**Pipeline header row:**
Above columns: `flex items-end gap-4 mb-1`
Each column header shows: stage name + deal count + total value (`text-xs text-zinc-500`).

**Won/Lost columns:** Won uses `bg-green-50` tint on column. Lost uses `bg-zinc-50`.

**Sidebar panel (deal detail):** Same SlideOver as ItemDetailModal, adapted for deal fields: Value, Stage, Close Date, Company, Contacts, Next Action, Notes.

---

### Invoicing Page

**Layout:** Standard list page.

**Toolbar:**
```
flex items-center gap-3 mb-5
```
Left: `text-xl font-semibold text-zinc-900` "Invoices"
Right: date range filter + status filter + "New Invoice" primary button.

**Stats strip (above table):**
Four inline stat chips:
```
flex gap-3 mb-5 flex-wrap
```
Each chip: `bg-white border border-zinc-200 rounded-lg px-4 py-2.5 flex items-center gap-3`
Stat value: `text-sm font-semibold text-zinc-900`, label: `text-xs text-zinc-500`.
Total Outstanding (amber), Overdue (red), Draft (zinc), Paid this month (green).

**Table columns:** #, Client, Amount, Status, Due Date, Issued Date, Actions

**Status badges:**
- Draft: `bg-zinc-100 text-zinc-600`
- Sent: `bg-blue-50 text-blue-700`
- Viewed: `bg-purple-50 text-purple-700`
- Paid: `bg-green-50 text-green-700`
- Overdue: `bg-red-50 text-red-700`
- Void: `bg-zinc-100 text-zinc-400`

**Row actions (hover reveal):**
`opacity-0 group-hover:opacity-100 transition-opacity` — View, Edit, Send, Void as icon-only ghost buttons.

**Invoice detail:** Full-page view (`/invoices/:id`) with printable layout. Not a SlideOver — too much content.

---

### HR Employees Page

**Layout:** List with filters.

**Toolbar:**
Search input (left) + Department filter + Status filter + "Add Employee" button (right).

**View toggle:** Table view / Card grid view (icon buttons: `LayoutList` / `LayoutGrid`).

**Card grid view:**
```
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4
```
Employee card:
```
bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer text-center
```
- Avatar `w-16 h-16 mx-auto mb-3`
- Name: `text-sm font-semibold text-zinc-900`
- Title: `text-xs text-zinc-500 mt-0.5`
- Department badge
- Email link: `text-xs text-indigo-600 mt-2`

**Table view columns:** Avatar+Name, Title, Department, Location, Start Date, Status, Actions.

**Employee detail:** SlideOver with tabs: Profile | Employment | Documents | Time Off | Notes.

Profile tab fields: Photo, Full Name, Email, Phone, Location, Manager, Department, Start Date.
Employment tab: Contract type, Salary (masked, reveal toggle), Equity, Benefits.

---

### Reports Dashboard

**Layout:** Grid of charts and stat cards.

**Page header:**
Title + date range picker (last 7d / 30d / 90d / custom) + Export button.

**Top row — KPI stats:**
```
grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6
```
Four stat cards (see Stat Card component).

**Main chart area:**
```
grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6
```
- Primary chart (`lg:col-span-2`): Line chart or bar chart. Card with title, subtext, and chart body.
- Secondary chart (`lg:col-span-1`): Donut/pie or summary list.

**Secondary row:**
```
grid grid-cols-1 lg:grid-cols-2 gap-6
```
Two medium charts.

**Chart card structure:**
```
bg-white border border-zinc-200 rounded-xl shadow-sm
```
Header: `flex items-center justify-between px-5 py-4 border-b border-zinc-100`
Title: `text-sm font-semibold text-zinc-900`
Chart area: `px-5 py-4` with fixed height (`h-56` or `h-72`).

**Chart colors:**
Primary series: `#6366f1` (indigo-500). Secondary: `#a5b4fc` (indigo-300). Tertiary: `#e0e7ff` (indigo-100).
Semantic series: use success/warning/error colors.
Never use rainbow multi-color charts unless each color has a distinct semantic meaning.

**Empty chart state:**
Centered within chart area: icon + "No data for this period" in `text-sm text-zinc-500`.

---

## 13. Thou Shalt Not Rules

These rules exist to prevent the specific failure modes that turn enterprise SaaS into "AI slop." They are non-negotiable.

1. **Thou shalt not use gradient backgrounds on data surfaces.** No `bg-gradient-to-*` on cards, tables, stat cards, or any surface that displays information. Gradients belong on the marketing site only.

2. **Thou shalt not use `rounded-3xl` or `rounded-full` on rectangular UI containers.** Cards are `rounded-xl`. Modals are `rounded-2xl`. Buttons are `rounded-lg`. Pill shapes (`rounded-full`) are only for badges and avatars.

3. **Thou shalt not use `shadow-xl` on a card at rest.** Cards at rest use `shadow-sm`. Cards on hover use `shadow-md`. `shadow-xl` and `shadow-2xl` are reserved for modals and floating panels only.

4. **Thou shalt not add a decorative color stripe or left-border accent to every card.** Color-coded left borders are meaningful when they indicate status or category. They are not decoration for default cards.

5. **Thou shalt not use emoji in the application UI.** Not in nav items. Not in headings. Not in empty states. Not in toasts. The UI is professional. Emoji are for Slack.

6. **Thou shalt not center-align body text in data-heavy views.** Center alignment is for empty states, login forms, and marketing. Data tables, form fields, descriptions, and card content are left-aligned.

7. **Thou shalt not create custom spacing values that break the 8px grid.** No `mt-[13px]`, no `gap-[7px]`, no `py-[11px]`. If the design requires it, the design is wrong. Adjust to the nearest grid value.

8. **Thou shalt not use `text-zinc-400` as the primary body text color.** Muted text (`text-zinc-400`) is for timestamps, placeholders, and captions. Body content is `text-zinc-700` or `text-zinc-900`. Muted text fails contrast for real content.

9. **Thou shalt not animate layout properties.** Never animate `width`, `height`, `max-height`, `margin`, `padding`, `top`, or `left`. Only animate `transform` and `opacity` for performant, jank-free motion.

10. **Thou shalt not use `outline-none` without a `focus-visible:ring-*` replacement.** Removing the default outline without a custom focus ring breaks keyboard navigation and fails WCAG 2.4.7.

11. **Thou shalt not use more than two font weights in a single component.** A card with `font-normal`, `font-medium`, `font-semibold`, and `font-bold` all at once is typographically chaotic. Use at most two: typically `font-medium` for labels and `font-semibold` for headings.

12. **Thou shalt not put a CTA button in every empty state.** If the empty state is the result of a search or filter returning no results, show "Clear filters" — not "Create new item." The user did not ask to create something; they asked to find something.

13. **Thou shalt not use placeholder text as a substitute for a label.** Every form input must have a visible `<label>`. Placeholder text disappears on input and fails accessibility. It can supplement a label but not replace it.

14. **Thou shalt not make every interactive element the same shade of indigo.** The primary color is for primary actions (one per view). Secondary and ghost buttons handle supporting actions. Links use indigo. Using `bg-indigo-600` on tertiary actions dilutes the visual hierarchy.

15. **Thou shalt not render a full-page spinner for every navigation.** Use skeleton screens for initial loads. Use optimistic updates for mutations. Use inline loading states (button spinner, row shimmer) for targeted actions. A full-screen `<Spinner />` is a last resort, not a default.

16. **Thou shalt not hard-code pixel widths on flexible layout elements.** Tables, cards, and content containers should flex and respond. Only use fixed widths for structural shell elements (sidebar: `w-60`, topbar: `h-14`) and constrained inputs where a specific width is meaningful.

17. **Thou shalt not put four different status-color badge variants on a single table column with no legend.** If color encodes meaning, that meaning must be accessible: include a visible label, a tooltip, or a legend. Never use color as the sole differentiator.

18. **Thou shalt not use `hover:scale-105` on cards.** Card lift uses `hover:-translate-y-0.5` — a 2px vertical shift. Scale transforms on cards cause layout jitter with surrounding elements and look like toy UI.

19. **Thou shalt not render inline SVG illustrations as decorative background elements on data pages.** No subtle watermark SVGs in card corners, no geometric background patterns on the content area. The content is the design.

20. **Thou shalt not skip the loading state.** Every data fetch has three states: loading, success, and error. All three must be handled. Showing nothing while loading, or crashing silently on error, is not acceptable.

---

*End of Design System v1.0*

> This document is the source of truth for all Aquerii UI decisions. Any component, pattern, or rule not covered here should be resolved by asking: "What would Linear do?" — then doing the simpler, more information-dense version of that.
