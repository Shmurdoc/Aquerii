---
member_id: member-03
owner: Developer B Agent
area: developer-b-features
priority: high
estimated_hours: 8
created_at: 2026-06-04T02:00:00Z
updated_by: Leader
review_required: true
reviews_by: [member-08]
artifact_refs:
  - "FEATURE-AUDIT-MASTER.md (Section 15 Documents, Section 16 Calendar)"
  - "team/GAPS.md (MED-001, MED-003)"
---

# Plan

- Objective: Implement Documents UI + Calendar + Meetings
- Deliverables:
  1. Document folders — add folder CRUD to DocumentsPage, wire DocumentFolder model (MED-003)
  2. Fix useDocument() URL — change /documents/:docId to /workspaces/:wid/documents/:docId (MED-001)
  3. Calendar view — add calendar tab/view showing board items and events with due dates (CAL-01 through CAL-04)
  4. Meetings — create meeting CRUD UI with agenda, minutes, action items (CAL-08 through CAL-12)
  5. Wire presence indicators — call usePresence hook in BoardPage and DocumentPage headers (MED-015)
- Preconditions: Lead review approval from member-08 (member-08 complete). API base exists.
- Acceptance Criteria:
  - [ ] Document folders CRUD works (create/rename/delete folders)
  - [ ] useDocument hook calls correct workspace-prefixed URL
  - [ ] Calendar shows board items with due dates
  - [ ] Meetings can be created with agenda and minutes
  - [ ] Presence indicators show online users in board/document pages
  - [ ] npm run build passes
