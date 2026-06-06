# Changelog

## 0.2.0 (2026-06-06)

### Fixed
- **DataTable safeData coercion** (TKT-D.SLICE-001): Defensive coercion handles arrays, paginated objects `{data: [...]}`, `undefined`, and `null` — eliminates "D.slice is not a function" ErrorBoundary crash across 27 consumers. 3 regression tests added.
- **Dashboard KPI double-grid** (TKT-DASH-001): Removed redundant outer grid wrapper around KpiRow. KPI cards now render correctly at sm/md/lg breakpoints without overlapping the activity widget.
- **TicketDetailPage TS2367** (TKT-D.SLICE-001): Fixed `in_progress` status comparison type error. TypeScript `--noEmit` now passes.
- **API response validation** (GAP-VAL-001): `team/scripts/validate.mjs` rewritten to read member IDs from `team.config.json` (v3 schema) instead of hardcoded `member-XX` names. 17 false-positive errors eliminated.

### Added
- **Upcoming Meetings KPI** (TKT-API-001): `ReportController::dashboard()` now returns `upcoming_meetings` (int) — count of meetings with `starts_at >= now()` and `starts_at <= now() + 7 days`, excluding soft-deleted records.

### Changed
- **API shape audit** (TKT-API-002): Full inventory of all 77 API list endpoints. All consistently use `->paginate()`. No inconsistency found. Defensive DataTable coercion was handling call-site edge cases, not API design issues.

### Quality
- **QA verification** (TKT-QA-FE-001): 13/13 DataTable tests pass, `tsc --noEmit` clean, `vite build` clean. 25 DataTable consumer pages verified with correct data shapes.
- **Integration smoke** (TKT-QA-INT-001): `validate.mjs` and `enforce.mjs` pass. E2E and API tests gated on local PostgreSQL availability (known env constraint).
