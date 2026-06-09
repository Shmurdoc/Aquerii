# CI/CD & Release Engineering — Reference

Pipeline Design
- Stages: build, unit-test, security-scan, integration-test, package, deploy-staging, canary, promote.
- Immutable artifacts and signed releases where applicable.

Release Strategies
- Canary: small percentage of traffic, observe, then ramp.
- Blue/Green: keep last-known-good environment for fast rollback.
- Feature flags for gradual exposure and kill-switch patterns.

Rollback & Recovery
- Provide documented rollback steps for each deploy path.
- Keep quick revert artifacts and database migration rollbacks guarded behind feature toggles.

Release Automation
- Auto-generate changelogs from conventional commits or PR labels.
- Tagging policy: semver + build metadata.

Artifact Management
- Store artifacts in an immutable registry with retention policy and SBOM support.

Checklist before production deploy
- All gating tests passed
- Security scan pass or mitigations tracked
- Observability and alerts configured
- Runbooks and rollback steps present

Example pipeline conceptual snippet
```yaml
- build
- test/unit
- scan/sast
- test/integration
- package
- deploy:staging
- run:smoke-tests
- deploy:canary
- observe 30m
- promote
```

Hooks & Approvals
- Require manual approval for production deployment when release impact is high.
- Automate approvals for routine low-risk releases with preconditions.
