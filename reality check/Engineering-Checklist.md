# Engineering Checklist — Production Readiness

- **Architecture Review**: reviewed by senior architects; documented diagrams, scalability limits, failure modes.
- **Infrastructure-as-Code**: Terraform/CloudFormation manifests in repo; deployments reproducible.
- **CI/CD**: automated pipelines for build/test/deploy with approvals for production.
- **Secrets Management**: no secrets in repo; use Vault/KeyVault/Secrets Manager.
- **Access Controls**: RBAC for consoles, least-privilege IAM roles, SSO for staff.
- **Data Backups & Recovery**: backup policy, automated restores tested quarterly.
- **Scaling Plan**: autoscaling rules, capacity testing results, cost/scale tradeoffs.
- **Feature Flags**: all user-facing feature rollouts behind flags.
- **Dependencies Inventory**: 3rd-party services and SLAs documented; mitigation for vendor outages.
- **Release Process**: documented release steps, rollback plan, tagging and changelogs.
