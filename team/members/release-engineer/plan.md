---
ticket: PROD-RELEASE-001
priority: high
est_hours: 5
state: assigned
---

# release-engineer — DMR Exports, Security Hardening, Production Infrastructure

## Objective
Build DMR Section 23 export PDF, COIDA form pre-population, replace X-Internal-Secret with short-lived JWTs, set up cloud infrastructure config.

## Acceptance Criteria
1. **DMR Section 23 Export** (Dangerous Occurrence Report):
   - Create Blade template matching official DMRE form fields
   - `GET /workspaces/{id}/hsse/incidents/{incident}/export/dmr` — returns PDF
   - Pre-filled from incident data (title, type, date, location, description, injured workers, witnesses, causes, actions)
   - Uses Gotenberg or DomPDF for rendering
2. **COIDA Form Pre-population** (W.Cl.2 First Medical Report):
   - Create Blade template matching Compensation Fund format
   - `GET /workspaces/{id}/hsse/incidents/{incident}/export/coida` — returns PDF
   - Pre-filled with worker data, incident data, employer info
3. **Service-to-Service JWT Auth**:
   - Create `App\Services\InternalAuthService` — issues short-lived JWTs (5-min TTL)
   - Create middleware `auth.internal-jwt` — validates JWT signature on internal routes
   - Replace X-Internal-Secret usage on web.php internal routes with JWT
   - Auth service has its own key pair (configurable via env)
4. **Cloud Run Deployment Config**:
   - Create `infra/cloudrun/` directory with service YAML files:
     - `api-service.yaml` — Cloud Run service for Laravel API
     - `worker-service.yaml` — Cloud Run job for queue worker
     - `scheduler-service.yaml` — Cloud Run job for scheduled tasks
   - Each with: region (africa-south1), memory limits, concurrency, environment variable mapping
   - Add `.github/workflows/deploy-cloudrun.yml` — deploy workflow triggered on merge to master
5. **Update CI pipeline**: Add DMR/COIDA PDF generation tests

## Context Files
- C:\Users\madoc\source\repos\Aquerii\services\api\routes\web.php
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Modules\HSSE\Models\Incident.php
- C:\Users\madoc\source\repos\Aquerii\services\api\config\services.php
- C:\Users\madoc\source\repos\Aquerii\infra\ (directory)
- C:\Users\madoc\source\repos\Aquerii\.github\workflows\ci.yml
- C:\Users\madoc\source\repos\Aquerii\ALIGNED-PLAN.md

## Quality Gates
- PDF generation works (test via curl or PHP)
- JWT auth works: valid token passes, invalid/expired token returns 401
- Cloud Run config is syntactically valid YAML
- CI is updated with deploy workflow
