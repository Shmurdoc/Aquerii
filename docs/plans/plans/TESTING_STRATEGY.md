# Testing Strategy

## Testing Levels

### Unit Testing
| Component | Framework | Target Coverage | Owner |
|-----------|------------|-----------------|-------|
| Gateway API | pytest | 80% | Gamma (RUFLO test-writer) |
| Sync Logic | pytest | 90% | Gamma |
| Webhook Handlers | pytest | 85% | Gamma |
| Frontend Widgets | Vitest | 70% | Delta (Devine Brain) |

### Integration Testing
| Test | Tool | Owner |
|------|------|-------|
| InvenTree ↔ Gateway | pytest + httpx | Gamma |
| ERPNext ↔ Gateway | pytest + httpx | Gamma |
| Twenty ↔ Gateway | pytest + httpx | Gamma |
| Webhook Flow | pytest + respx | Gamma |

### End-to-End Testing
| Scenario | Tool | Owner |
|----------|------|-------|
| Stock low → PO created | Playwright | Gamma + Beta |
| Sale → Stock reserved | Playwright | Gamma + Beta |
| Document upload → OCR | Manual first | Beta |
| ChatOps query | Manual | Delta |

### Security Testing
| Type | Tool | Owner |
|------|------|-------|
| Static Analysis | bandit, semgrep | gstack-main (security) |
| Dependency Scan | safety, pip-audit | gstack-main |
| Penetration Test | OWASP ZAP | gstack-main (red-team) |
| RBAC Verification | Manual | Security Lead |

## Test Environments
| Environment | Purpose | Data |
|-------------|---------|------|
| Local dev | Development | Seed data only |
| Staging | Pre-production validation | Anonymized copy |
| Production | Live system | Real data, read-only tests |

## Testing Commands (to be defined)
```bash
# Gateway unit tests
cd services/gateway && pytest --cov=app --cov-report=term-missing

# Integration tests
pytest tests/integration/

# Frontend tests
pnpm test

# Security scan
bandit -r services/gateway/
```

## Test Data Strategy
- Use `tests/fixtures/` for mock data
- Seed scripts in `scripts/seed/`
- Anonymize production data for staging

## Acceptance Criteria Per Phase
| Phase | Criteria |
|-------|----------|
| Phase 1 | All infra tests pass; Caddy serves HTTPS |
| Phase 2 | Each service reachable; DB connections verified |
| Phase 3 | Webhooks deliver; sync logic passes integration tests |
| Phase 4 | UI accessible; ChatOps responds; Excalidraw loads |

## Tools from Source Folders
- **elit dev Skills/tests/**: `test_refactor.py`, `test_plan.py` patterns
- **RUFLO/.opencode/agents/test-writer.md**: Test writing agent
- **gstack-main/review/specialists/testing.md**: Testing specialist
- **Devine Brain/advanced skills/query/**: Testing patterns