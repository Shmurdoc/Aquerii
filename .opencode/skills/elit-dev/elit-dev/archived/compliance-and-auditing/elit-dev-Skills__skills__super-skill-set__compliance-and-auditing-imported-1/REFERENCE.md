# Compliance & Auditing — Reference

Overview
- SBOMs, license scanning, privacy documentation, and audit evidence collection.

Checklist
- Generate SBOMs for release artifacts and attach to release metadata.
- Run license scanning and flag incompatible licenses for review.
- Maintain privacy-impact assessments and data-flow diagrams for sensitive data.

Audit Evidence
- Keep change logs, test results, security scan reports, and deployment proofs grouped per release.
- Provide a single exportable audit pack for reviewers.

Automation
- `scripts/generate_sbom.sh`, license scanner integrations, and audit-pack builder.

Hard Rules
- Regulated releases must include SBOM and documented mitigation for high-risk dependencies.
