# Project Memory — Aquerii

## Architecture
- Monorepo: services/api (PHP 8.3/Laravel 11), services/web (React/TypeScript/Vite), services/ai (Python/FastAPI)
- Database: PostgreSQL
- Infrastructure: Docker, GitHub Actions, Cloud Run
- Testing: Pest PHP (backend), Playwright + Vitest (frontend), k6 (load)

## Patterns
- Sub-session orchestration via `task` tool with persistent memory
- State coordination through team/state/ JSON files
- Context graph auto-discovers relevant files for tasks
- Memory accumulates learnings across sub-sessions

## Gotchas
- PostgreSQL boolean casting differs from MySQL
- Always eager-load relationships to prevent lazy loading
- Cloud Run cold starts can cause 502s on first request
- GitHub Actions has a 6-hour timeout per job

- [2026-06-11] js with new colors/borderRadius/fontFamily/spacing/animations

- [2026-06-11] Phase 1 complete: expanded index
- [2026-06-11] css with 35 new design tokens (surface hierarchy, 3 accent axes, border hierarchy, radius, spacing, opacity), added 5 cinematic keyframes (fadeIn, slideUp, slideInLeft, pulse-glow, countUp), extended tailwind

- [2026-06-11] All using PageShell component system, motion

- [2026-06-11] 1 complete: Auth pages (Login, Register, ForgotPassword, ResetPassword, 2FA Setup, 2FA Challenge) upgraded with cinematic design - floating label inputs, gradient animated background panels, 6-digit MFA with auto-advance, multi-step registration, recovery codes with copy
- [2026-06-11] Dashboard/Boards/OrgChart/MyDay pages upgraded - MetricCards with count-up, staggered entrances, Kanban view with hover lift and glass columns, org chart with animated tree search, MyDay with collapsible groups and animated checkboxes

- [2026-06-11] tsx (glass page wrapper with breadcrumbs, loading/empty/error states, stagger entrance), MetricCard

- [2026-06-11] FIX: Phase 1b components were never created by sub-agents
- [2026-06-11] Created 5 missing shared components: PageShell
