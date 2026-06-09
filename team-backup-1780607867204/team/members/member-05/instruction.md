---
member_id: member-05
instructions_version: 3
updated_at: 2026-06-04T00:00:00Z
---

# Instructions

1. **READ `team/SYSTEM.md` FIRST** — understand the full coordination system
2. Follow infrastructure standards in repo/CONTRIBUTING.md
3. Branch naming: `feature/member-05/<short-description>`
4. Commit prefix: `[member-05] description`
5. Run tests before marking done: Docker build success + CI pipeline green + Helm lint
6. If blocked, update `wait.md` and `status.md` immediately
7. Update `last_heartbeat` in `status.md` every 15 minutes while working
8. Own `infra/`, `.github/workflows/`, and all `Dockerfile`s
9. Use Docker Compose for local dev, Helm charts for K8s production
10. All infrastructure changes must be reversible and documented
11. Maintain CI pipeline stages: lint, test, build, security scan, deploy
12. Monitor Docker image sizes and build times, report regressions

## Tool Recommendations
- Load `/ship` skill for deployment workflow
- Load `/canary` skill for post-deploy monitoring
- MCP servers: filesystem, github
- Before deploying: run `/ship` to validate deployment readiness
- After deploying: run `/canary` to monitor for regressions
