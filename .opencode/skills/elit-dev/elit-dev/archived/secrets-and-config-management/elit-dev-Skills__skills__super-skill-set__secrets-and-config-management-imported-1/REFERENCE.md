# Secrets & Config Management — Reference

Overview
- Manage secrets lifecycle, environment separation, config validation, and runtime safety.

Checklist
- Use a secrets manager (Vault, cloud KMS, or managed secret store) with rotation and audit logs.
- Validate configuration at startup and fail fast for missing critical values.
- Keep environment-specific overrides out of source control; provide templates only.

CI/CD Safety
- Ensure secrets are injected via secure variables; redact sensitive logs and artifacts.
- Test that CI jobs cannot leak secrets by accident.

Deliverables
- `scripts/validate_secrets.sh`, sample env templates, and rotation/runbook for secret compromise.

Hard Rules
- Never commit secrets to the repository. Use automated checks to block accidental commits.
