# Design Memory — UI Patterns

## Design System
- All components use custom CSS with Tailwind — NO shadcn/ui, NO MUI, NO Chakra
- Design tokens defined in `index.css`: `--font-heading` (Figtree), `--font-ui` (Inter), `--duration-*`, `--ease-*`, `--glass-*`, `--shadow-*`
- `lib/motion.ts` provides DURATION/EASE constants, `useReducedMotion`, `useCountUp`, `staggerStyle`
- Every page wraps content in `<PageShell>` for consistent breadcrumbs/header/loading/empty/error states
- Cinematic animations on all interactive elements (hover lift, press shrink, entrance stagger)

## Patterns
- Mobile-first responsive design
- Consistent spacing using Tailwind's spacing scale (8px grid)
- Accessibility: WCAG 2.1 AA compliance
- 3 semantic color axes: blue (primary/info), amber (warning), emerald (success)
- Glassmorphism for surfaces: `glass-surface` and `glass-surface-strong` classes

## Gotchas
- Tailwind's `dark:` prefix requires class strategy, not media query
- Use `rem` for font sizes, `px` for borders
- Test with real content, not Lorem Ipsum
- Consider colorblind users when using color alone for meaning
- Docker web container has NO bind mounts — code is baked into Docker image. Run `docker compose up -d --build web` after every frontend change.

## Components
- Named exports, not default exports
- Keep component files under 300 lines
- One component per file

- [2026-06-11] use consistent spacing tokens
