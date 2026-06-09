---
member_id: member-02
owner: Developer A Agent
area: developer-a-features
priority: high
estimated_hours: 8
created_at: 2026-06-04T02:00:00Z
updated_by: Leader
review_required: true
reviews_by: [member-07]
artifact_refs:
  - "FEATURE-AUDIT-MASTER.md (Section 11 Support, Section 19 Settings)"
  - "team/GAPS.md (MED-006, MED-007)"
---

# Plan

- Objective: Implement Support Desk + Settings/Notification Polish
- Deliverables:
  1. Support Desk — add ticket CRUD UI (tab on sidebar), list/detail views, status workflow, assignment, priority
  2. Knowledge Base — KB article list + search + create/edit in Support section
  3. Notifications backend — create migration + endpoint (GET/PUT /me/notification-preferences), wire NotificationsTab to use it (MED-006)
  4. Sidebar workspace switcher — add dropdown of user's workspaces + "Create workspace" option, wire navigation (MED-007)
- Preconditions: Lead review approval from member-07 (member-07 complete). API base exists.
- Acceptance Criteria:
  - [ ] Support tickets CRUD works end-to-end with status workflow
  - [ ] KB articles can be created, searched, and viewed
  - [ ] Notification preferences persist across sessions (backend-backed)
  - [ ] Sidebar workspace switcher navigates between workspaces
  - [ ] npm run build passes
