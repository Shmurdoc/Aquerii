---
member_id: "builder-1"
type: "builder"
ticket: "GAP-THEME-001"
owner: "Implementation — Core API / Integration Agent"
status: running
lock: true
priority: high
review_required: true
reviews_by: ["reviewer"]
time_estimate: "4d"
time_spent: ""
context_files:
  - "services/web/src/pages/settings/"
  - "services/api/app/Core/Http/Controllers/Api/BrandingController.php"
  - "services/api/app/Core/Models/Workspace.php"
  - "services/api/database/migrations/"
  - "services/api/resources/views/"
strict_scope: true
artifact_refs:
  - "services/web/src/"
  - "services/api/app/"
created_at: "2026-06-06T15:00:00Z"
updated_by: "Leader"
updated_at: "2026-06-06T15:00:00Z"
---

# Plan — builder-1 (GAP-THEME-001)

## Ticket Summary
`BrandingController` exists and Workspace model has `logo_url`/`color` fields, but there's no UI to upload a logo or set a color. Logo/color are never applied to PDF Blade views.

## Deliverables
- [ ] **Logo upload UI**: Add file upload (logo image) to the settings/team page. Wire to `BrandingController` which saves the URL to workspace.
- [ ] **Color picker**: Add color input to the settings page. Wire to a PATCH endpoint that saves workspace color.
- [ ] **Backend**: Ensure `BrandingController` returns `logo_url` and `color` for the current workspace.
- [ ] **PDF integration**: Pass `workspace->logo_url` and `workspace->color` to all Blade PDF views in `resources/views/`. Add company address, VAT, registration number to PDFs.
- [ ] Verify `npm run build` and API tests pass

## Acceptance Criteria
- [ ] Settings page has a logo upload field (file input with preview)
- [ ] Settings page has a color picker input
- [ ] Uploaded logo URL is saved to workspace and returned by BrandingController
- [ ] Color is saved to workspace and returned by BrandingController
- [ ] PDF Blade views render logo and use workspace color
- [ ] `npm run build` passes

## Quality Gates
- [ ] `npm run build` passes
- [ ] `node team/scripts/validate.mjs` passes

## Out of Scope
- Print (GAP-DOC-001 — separate task)
- Export (GAP-EXP-001 — separate task)
- @Mentions (GAP-MENTION-001 — separate task)

## Strict Scope
Read ONLY context_files plus your own 4 files.
