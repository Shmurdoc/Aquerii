---
member_id: member-05
owner: DevOps / CI Automation
area: devops-ci
priority: medium
estimated_hours: 4
created_at: 2026-06-04T04:00:00Z
updated_by: Leader
artifact_refs:
  - "team/GAPS.md (MED-018, MED-020, MED-021, LOW-013, LOW-015)"
---

# Plan

- Objective: Phase 4 infrastructure cleanup
- Deliverables:
  1. MED-018: Document Vault as wontfix for dev — add note that prod uses env vars directly. Or wire Vault secret injection for api service.
  2. MED-020: Replace SimpleSpanProcessor with BatchSpanProcessor in services/realtime/src/instrumentation.ts
  3. MED-021: Fix Jaeger OTel trace target — either add Jaeger to docker-compose.yml or change exporter to console/OTLP
  4. LOW-013: Fix services/realtime/Dockerfile EXPOSE 3000 → 3001
  5. LOW-015: Add staging→production promotion gate stub to .github/workflows/ci.yml (environment approval)
- Preconditions: Phase 3 infra complete
- Acceptance Criteria:
  - [ ] Realtime uses BatchSpanProcessor with maxExportBatchSize: 512, scheduledDelayMillis: 5000
  - [ ] OTel traces export to a working target (Jaeger added or console exporter)
  - [ ] Dockerfile EXPOSE matches runtime port (3001)
  - [ ] CI has a documented promotion gate between staging and production
