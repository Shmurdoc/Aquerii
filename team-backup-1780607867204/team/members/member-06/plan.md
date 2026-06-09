---
member_id: member-06
owner: Design Team Agent
area: design-frontend
priority: low
estimated_hours: 4
created_at: 2026-06-04T04:00:00Z
updated_by: Leader
artifact_refs:
  - "team/GAPS.md (MED-013, MED-016, MED-017, LOW-003, LOW-004, LOW-005, LOW-006, LOW-007, LOW-008)"
---

# Plan

- Objective: Phase 4 frontend cleanup — dead code removal, polish, dependency fixes
- Deliverables:
  1. MED-013: Add GET /me call in AppLayout.tsx on mount to refresh authStore (user profile stays fresh)
  2. MED-016: Delete dead stores: services/web/src/stores/boardStore.ts, itemStore.ts, documentStore.ts
  3. MED-017: Delete or wire MutationQueue.ts — if offline queue not needed, delete it
  4. LOW-003: Remove idb and immer from package.json dependencies (used only by deleted stores)
  5. LOW-004: Move @tanstack/react-query-devtools to devDependencies in package.json
  6. LOW-005: Replace api.patch call in ItemDetailModal.tsx with useUpdateItem() hook
  7. LOW-006: Call useSocket() in AppLayout.tsx so socket initializes on app load
  8. LOW-007: Replace hardcoded toast colors in App.tsx with Tailwind config tokens
  9. LOW-008: Replace hardcoded presence color #6366f1 in DocumentPage with per-user generated color
  10. npm run build to verify
- Preconditions: Phase 2 UI complete
- Acceptance Criteria:
  - [ ] AuthStore refreshed on app load via GET /me
  - [ ] Dead stores deleted, no orphaned imports
  - [ ] idb and immer removed from dependencies
  - [ ] devtools moved to devDependencies
  - [ ] ItemDetailModal uses useUpdateItem hook
  - [ ] Socket connects on app load
  - [ ] Toast colors use Tailwind tokens
  - [ ] Presence color generated per-user
  - [ ] npm run build passes
