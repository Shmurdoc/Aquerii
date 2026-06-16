# Infrastructure Memory — Docker/CI/CD

## Patterns
- Multi-stage Docker builds for smaller images
- GitHub Actions for CI/CD
- Cloud Run for deployment
- Terraform for infrastructure as code
- Helm for Kubernetes deployments

## Gotchas
- Cloud Run cold starts — use minimum instances for critical services
- Docker layer caching — put rarely-changing layers first
- GitHub Actions secrets are not available in pull requests from forks
- Terraform state must be locked for team operations

## Monitoring
- Use structured logging (JSON)
- Set up alerts for error rates > 1%
- Monitor cold start latency
- Track deployment frequency as a DORA metric
