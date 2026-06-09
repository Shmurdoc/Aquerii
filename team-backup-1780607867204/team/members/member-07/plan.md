---
member_id: member-07
owner: Senior Lead — CRM + ERP
area: crm-erp
priority: low
estimated_hours: 4
created_at: 2026-06-04T04:00:00Z
updated_by: Leader
artifact_refs:
  - "team/GAPS.md (MED-002, MED-022, MED-023, MED-024, MED-025, LOW-009)"
---

# Plan

- Objective: Phase 4 security/realtime cleanup
- Deliverables:
  1. MED-002: Fix InternalSecret middleware — add per-route scope via an allowed_services config array in the request
  2. MED-022: Add TTL to room_members Redis keys in services/realtime/src/rooms/RoomManager.ts (86400s = 24h)
  3. MED-023: Wire PresenceManager.heartbeat() — call on socket ping event or 30s interval per connection
  4. MED-024: Delete dead realtime code: services/realtime/src/broadcaster/EventBroadcaster.ts, handlers/documentHandlers.ts, middleware/auth.ts. Verify no imports break.
  5. MED-025: Add Zod validation schemas for socket events (room:join, room:leave, doc:update, cursor:update, typing:start, typing:stop)
  6. LOW-009: Delete duplicate CI file at services/.github/workflows/ci.yml
  7. Run npx tsc --noEmit to verify no type errors in realtime service
- Preconditions: CRM module complete
- Acceptance Criteria:
  - [ ] InternalSecret middleware validates per-route service scope
  - [ ] Redis room_members keys have 24h TTL
  - [ ] Presence heartbeat fires on socket ping, clears stale presence within 10min
  - [ ] Dead realtime code deleted without breaking imports
  - [ ] Zod schemas reject malformed socket payloads with structured error events
  - [ ] Duplicate CI file deleted
  - [ ] npx tsc --noEmit passes in services/realtime/
