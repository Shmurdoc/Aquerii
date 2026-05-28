# Background Features Tracker (bg-01 → bg-15)

Track implementation status. When starting a new feature, confirm the previous one is complete.

---

## Status Legend
- ✅ **DONE** — Backend + Frontend implemented and verified
- 🔧 **PARTIAL** — Some pieces exist, needs completion
- ❌ **NOT STARTED** — No implementation yet

---

## Feature List

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| bg-01 | Voice commands (Whisper + WS streaming) | HIGH | ❌ NOT STARTED | Needs Whisper integration + WebSocket audio streaming |
| bg-02 | Multi-provider conferencing (Zoom/Meet/Teams/Webex) | HIGH | ❌ NOT STARTED | Needs third-party API integrations |
| bg-03 | Project email addresses (inbound → tasks) | MEDIUM | ❌ NOT STARTED | Needs email parsing + auto-task creation |
| bg-04 | Real-time chat system | HIGH | ❌ NOT STARTED | User-to-user chat (AI chat exists, this is different) |
| bg-05 | KB auto-capture from resolved issues | MEDIUM | ❌ NOT STARTED | Auto-generate KB articles from resolved tickets |
| bg-06 | Offline sync (conflict resolution) | HIGH | 🔧 PARTIAL | `MutationQueue.ts` exists, needs conflict resolution logic |
| bg-07 | Sentiment/burnout detection | HIGH | ❌ NOT STARTED | ML-based sentiment analysis on team activity |
| bg-08 | Predictive project management (ML) | VERY HIGH | ❌ NOT STARTED | ML models for deadline prediction, risk scoring |
| bg-09 | Digital twin / what-if simulation | VERY HIGH | ❌ NOT STARTED | Simulation engine for project scenarios |
| bg-10 | Meeting effectiveness + OKR cascade | HIGH | ❌ NOT STARTED | Meeting scoring + OKR alignment tracking |
| bg-11 | AI-recommended automations (pattern detection) | HIGH | ❌ NOT STARTED | AI suggests automations based on usage patterns |
| bg-12 | Team capacity backend (workload model) | MEDIUM | ✅ DONE | Migration + Controller + Frontend Capacity tab |
| bg-13 | My Day backend (task pinning, auto-populate) | LOW | ✅ DONE | `MyDayPage.tsx` + `useMyDayTasks` hook + `GET /my-day` API |
| bg-14 | Plugin system & marketplace | HIGH | ❌ NOT STARTED | Plugin architecture + marketplace UI |
| bg-15 | Field-level permissions + SCIM 2.0 | HIGH | ❌ NOT STARTED | Granular field permissions + SCIM provisioning |

---

## Completed Features Detail

### bg-12: Team Capacity Backend ✅
**Completed:** 2026-05-28
**Files:**
- `services/api/database/migrations/2026_05_28_000075_add_capacity_to_workspace_members.php` — adds `weekly_capacity_hours`, `capacity_notes`
- `services/api/app/Core/Http/Controllers/Api/TeamCapacityController.php` — `GET /hr/capacity` (utilization calc), `PATCH /hr/capacity/{userId}`
- `services/api/routes/modules/hr.php` — registered routes
- `services/api/app/Core/Models/WorkspaceMember.php` — updated fillable
- `services/web/src/pages/employees/EmployeePage.tsx` — new Capacity tab with utilization bars

**API:**
- `GET /api/workspaces/{id}/hr/capacity` — returns per-member: `weekly_capacity_hours`, `assigned_hours`, `utilization_pct`, `active_task_count`
- `PATCH /api/workspaces/{id}/hr/capacity/{userId}` — update `weekly_capacity_hours`, `capacity_notes`

**Verified:** Routes registered, TypeScript compiles, 52 Python tests pass.

---

### bg-13: My Day Backend ✅
**Completed:** Pre-existing
**Files:**
- `services/web/src/pages/my-day/MyDayPage.tsx` — full UI with overdue/today/tomorrow/this-week sections
- `services/web/src/hooks/useMyDayTasks.ts` — data hook
- `services/api/app/Core/Http/Controllers/Api/ItemController.php` — `myDay()` method
- `routes/api.php` — `GET /workspaces/{workspace}/my-day`

**Verified:** Route registered, page renders with task classification.

---

## Next Feature to Implement

**Next up: bg-05 — KB auto-capture from resolved issues** (MEDIUM priority)

When starting, confirm bg-12 is working correctly by running:
```bash
docker compose exec api php artisan route:list --path=capacity
```

---

## How to Use This File

1. Before starting a new feature, check this file for the next `❌ NOT STARTED` item
2. Confirm the previous feature's routes load: `php artisan route:list --path=<feature>`
3. After completing a feature, update status to ✅ DONE and add details above
4. Run Python tests: `cd services/ai && python -m pytest tests/unit -v`
5. Run TypeScript check: `cd services/web && npx tsc --noEmit --skipLibCheck`
