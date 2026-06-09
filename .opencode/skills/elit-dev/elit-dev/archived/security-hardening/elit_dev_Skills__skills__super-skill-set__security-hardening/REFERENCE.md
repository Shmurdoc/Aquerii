# Security & Hardening — Reference

Core Practices
- Threat modeling for new features crossing trust boundaries.
- Secure coding checklist: input validation, output encoding, auth checks, least privilege.
- Dependency management: SCA scans, pinning, and weekly dependency reviews.

CI Security Pipeline
- Quick SAST + dependency check on PRs; full SAST + DAST on merge.
- Block merges for Critical/High findings until triaged and mitigated.

Secrets & Credentials
- Use a secrets manager with rotation and audit logs.
- CI must inject secrets only via secure variables; redact logs and artifacts.

Incident readiness
- Ship basic incident runbook templates and breach notification steps.
- Maintain a list of critical assets and recovery owners.

Automation
- `scripts/run_sast.sh` wrapper for local developer runs.
- `scripts/generate_sbom.sh` for artifact SBOM generation before releases.

Example checklist for PRs touching auth or network code
- Has threat model been updated?
- Are new endpoints authenticated and authorized?
- Are inputs validated and logged safely?
- Has dependency risk been evaluated?

Policy-as-code
- Provide sample Policy-as-Code (e.g., OPA, InSpec) rules for infra and container images.

Hardening guides
- Platform-specific docs: container runtime, cloud IAM, networking, and database encryption.
