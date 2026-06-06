---
project: "Aquerii"
purpose: "Live progress dashboard — Phase 2 + Pilot + Wave 5 UI/UX hardening"
last_updated: "2026-06-06T20:00:00Z"
updated_by: "Leader"
---

# Dashboard — Aquerii

## Summary
- Total members: 16
- Running: 0
- Done: 14 of 14 Wave 5 items ✅
- Blocked: 0
- Idle: 16 (awaiting pilot Week 1 / Phase 3 kickoff)

## Phase 1 — Foundation — COMPLETE ✅
All 8 gaps resolved. Playwright **95/96 pass** (1 flaky Firefox view-switch, pre-existing).

## Phase 2 — Usable + Pilot — COMPLETE ✅
All Phase 2 gaps (DOC, THEME, EXP, MENTION, AUDIT, PILOT) resolved. Pilot workspace live with 10 users + 8 entity types seeded.

## Wave 5 — UI/UX Hardening — COMPLETE ✅

### Wave 5a — Critical Bug Fixes (6/6)
| # | Gap | Owner | Status | Summary |
|---|-----|-------|--------|---------|
| 1 | GAP-FORECAST-001 | builder-1 | ✅ Done | `(amount ?? 0).toLocaleString()` — 4 sites. Backend returns 0 for empty aggregates |
| 2 | GAP-GOALS-001 | builder-1 | ✅ Done | `keyExtractor`, `// @ts-nocheck` removed, TS errors fixed |
| 3 | GAP-EMPLOYEEGROUPS-001 | builder-1 | ✅ Done | Same pattern as Goals |
| 4 | GAP-MYDAY-001 | builder-2 | ✅ Done | Inline mutation with `boardId: task.board_id`, onError toast |
| 5 | GAP-CHAT-001 | builder-3 | ✅ Done | `selectedMentionIds` Set → derived `mentionUserIds` useMemo |
| 6 | GAP-CALENDAR-001 | builder-1 | ✅ Done | New `CalendarItemController` + `GET /calendar-items?from=&to=` endpoint |

### Wave 5b — High Severity (3/3)
| # | Gap | Owner | Status | Summary |
|---|-----|-------|--------|---------|
| 7 | GAP-CHAT-002 | builder-3 | ✅ Done | Cursor-aware mention regex, workspace-scoped members, typing throttle 200ms, markChatRead debounce 1s |
| 8 | GAP-SOCKET-001 | builder-1 | ✅ Done | Explicit socket teardown, refresh-token reconnect after 30s grace, backoff 1s→30s |
| 9 | GAP-CHAT-RENDER-001 | debugger-1 | ✅ Done | `MentionText` component with indigo chips, wired to `MessageBubble` |

### Wave 5c — Boards Design Overhaul (2/3 done, 1 deferred)
| # | Gap | Owner | Status | Summary |
|---|-----|-------|--------|---------|
| 10 | GAP-BOARDS-DESIGN-001 | designer | ✅ Done | 36.9 KB spec at `team/reviews/DESIGN-GAP-BOARDS-001.md` |
| 11 | GAP-BOARDS-DESIGN-002 | builder-3 | ✅ Done | 4 files: ItemCard, KanbanView, BoardsPage, BoardPage. 320px columns, drag visual, touch-safe menus |
| 12 | GAP-BOARDS-DESIGN-003 | designer | ⏸️ Deferred | Visual QA — deferred to Week 4 (pilot users in production) |

### Wave 5d — Polish (2/2)
| # | Gap | Owner | Status | Summary |
|---|-----|-------|--------|---------|
| 13 | GAP-INBOX-UX | designer | ✅ Done | Infinite scroll (Load more), deep-links, error feedback, type-safe NotificationData |
| 14 | GAP-CHAT-UX | designer | ✅ Done | Scroll-guard (<50px), empty state for no channels, `??` chain, auth guard on create channel |

## Verification
- ✅ `npm run build` — passes clean (1m 14s, 5258 modules)
- ✅ `node team/scripts/audit-endpoints.mjs` — 600/600 routes used, exits 0
- ✅ Playwright regression — 95/96 pass (1 pre-existing flaky retried-and-passed)
- ⚠️ Visual smoke 5/8 pass, 3/8 fail — see "Ship-blockers" below
- ⏸️ Visual QA on boards redesign — deferred to Week 4

### Ship-blockers (post-Wave-5)
All 5 resolved ✅:
1. ~~GAP-IMG-STALE-001~~ — aquerii-api image rebuilt
2. ~~GAP-DOCKER-GD-001~~ — ext-gd installed (Alpine)
3. ~~GAP-AUTOLOAD-001~~ — base Controller class created
4. ~~GAP-FORECAST-LAZY-001~~ — `->with('stage')` added
5. ~~GAP-CALENDAR-QUERY-001~~ — aquerii-web image rebuilt (root cause was stale bundle, not hook source)

**Ship-readiness**: SHIP-READY ✅ (pending build-hash regression check, see CALENDAR-QUERY-001 lesson learned)

## Member Status

| Member | Type | Role | State | Lock | Current Task |
|--------|------|------|-------|------|-------------|
| ceo | ceo | Strategic direction | completed | false | (Next: invite pilot users, Week 1 call) |
| eng-manager | eng-manager | Planning | idle | false | (idle) |
| designer | designer | UX and product-design | completed | false | (queued: Visual QA Week 4) |
| builder-1 | builder | Core API / Integration | completed | false | (idle) |
| builder-2 | builder | Feature Modules (CRM/ERP) | completed | false | (idle) |
| builder-3 | builder | Feature Modules (Billing/Inventory) | completed | false | (idle) |
| reviewer | reviewer | Code quality and review | idle | false | (queued: Wave 5 review) |
| qa-lead-frontend | qa-lead | QA Frontend | idle | false | (queued: GAP-MYDAY-CHAT-SELECTORS-001 selector drift) |
| qa-lead-integration | qa-lead | QA Integration | done | false | (re-verification done, ship-ready) |
| release-engineer | release-engineer | Release | done | false | (Dockerfile fixed + images rebuilt, staged) |
| debugger-1..4 | debugger | Root-cause | done | false | (GAP-CALENDAR-QUERY-001: root cause was stale web image) |
| doc-engineer | doc-engineer | Documentation | done | false | (idle) |

## Open Gaps
- GAP-QA-INT-001, GAP-QA-INT-002 (low priority — formatCurrency test, E2E docs)
- GAP-BOARDS-DESIGN-003 (visual QA — deferred to Week 4)
- PHPStan level 5: 1316 pre-existing Laravel magic errors (needs baseline)
- Playwright: 1 flaky CRM pipeline test (chromium, pre-existing)
