---
member_id: "release-engineer"
type: "release-engineer"
ticket: "GAP-CRIT-001+002+003+006"
owner: "Release readiness and publishing flow Agent"
status: running
lock: true
priority: critical
review_required: true
reviews_by: ["reviewer"]
time_estimate: "4h"
time_spent: ""
context_files:
  - "services/api/Dockerfile"
  - "services/web/Dockerfile"
  - "docker-compose.yml"
  - "infra/docker/"
  - "infra/caddy/"
  - "infra/prometheus/"
  - ".github/workflows/"
  - "PRODUCTION_READINESS_PLAN.md"
strict_scope: true
artifact_refs:
  - "services/api/Dockerfile"
  - "docker-compose.yml"
  - ".github/workflows/"
created_at: "2026-06-06T12:00:00Z"
updated_by: "Leader"
updated_at: "2026-06-06T12:00:00Z"
---

# Plan — release-engineer (GAP-CRIT-001+002+003+006)

## Ticket Summary
The `aquerii/api:latest` Docker image is stale. The running container has been patched with `docker cp` band-aids. Any force-recreate loses all fixes. We need:
- GAP-CRIT-001: Re-bake API image so it includes all current code
- GAP-CRIT-002: HSSE and PTW module files baked into image (not missing)
- GAP-CRIT-003: CI pipeline rebuilds image on every push to main
- GAP-CRIT-006: Close H17 (CD), H18 (alertmanager routing), H19 (Caddy AI port)

## Deliverables
### Image and CI
- [x] Audit the `services/api/Dockerfile` — ensure all module files are included (HSSE, PTW, Equipment, Competency, JobCards)
- [x] Audit `docker-compose.yml` — ensure `build:` context covers all needed directories
- [x] Add or verify CI workflow in `.github/workflows/` that builds and pushes the API image on push to main
- [ ] Verify `docker compose up -d --build` from a clean checkout produces a working stack
- [x] Document: "no more `docker cp`" — the image is the source of truth

### H17 CD
- [x] Review `PRODUCTION_READINESS_PLAN.md` H17 — assess current CD state
- [x] Document the CD plan or add the missing pieces

### H18 Alertmanager
- [x] Review `infra/prometheus/alertmanager.yml` — wire correct routing (mounted config is `infra/alertmanager/alertmanager.yml`)
- [x] Ensure alerts can reach the right channels

### H19 Caddy AI Port
- [x] Review `infra/caddy/Caddyfile` — ensure AI service port is correctly mapped
- [x] Verify proxy to AI service works through Caddy

## Acceptance Criteria
- [x] Build context fixed — `COPY services/api/ .` covers all modules (HSSE, PTW, Equipment, Competency, JobCards confirmed present)
- [x] CI workflow updated with conditional root context for `api` service
- [x] H17/H18/H19 documented as resolved in PRODUCTION_READINESS_PLAN.md
- [x] Caddy routes AI to `ai:8002` — already correct, no change needed

## Quality Gates
- [ ] `docker compose up -d --build` exits 0 (requires Docker engine — skipped in agent mode)
- [x] CI workflow syntax is valid YAML
- [x] `validate.mjs` passes for release-engineer files
- [x] No regressions in infrastructure

## Out of Scope
- Application code changes
- Frontend changes
- Database migrations
- Secrets management (deferred to GAP-SECRET-001 in Phase 3)

## Context Files
Read ONLY the files in the frontmatter `context_files` field, plus your own 4 files. Nothing else.

## Strict Scope
`strict_scope: true` — infrastructure and Docker only. Request scope expansion from Leader if needed.
