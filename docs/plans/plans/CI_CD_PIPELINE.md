# CI/CD PIPELINE — Mine System Enterprise Platform

**Version**: 2.0  
**Status**: AUTHORITATIVE  
**Owner**: Team Alpha (DevOps) + RUFLO deploy-guardian agent  

---

## 1. Pipeline Overview

Every code change follows this path before reaching production:

```
Developer writes code
    ↓
git push → GitHub/GitLab (feature branch)
    ↓
┌─────────────────── CI PIPELINE ───────────────────────┐
│  Stage 1: Lint & Static Analysis (< 2 min)            │
│  Stage 2: Unit Tests (< 5 min)                        │
│  Stage 3: Security Scan (< 5 min)                     │
│  Stage 4: Contract Tests (< 5 min)                    │
│  Stage 5: Build Docker Image (< 10 min)               │
│  Stage 6: Integration Tests on staging (< 15 min)     │
│  Stage 7: Performance Benchmark (< 10 min)            │
└───────────────────────────────────────────────────────┘
    ↓ ALL STAGES PASS
Pull Request review (human: Lead/Architect)
    ↓ APPROVED
Merge to main
    ↓
┌─────────────────── CD PIPELINE ───────────────────────┐
│  Deploy to staging (auto)                             │
│  Smoke tests (auto)                                   │
│  CCB approval for production (manual gate)            │
│  Deploy to production (manual trigger)                │
│  Post-deploy smoke tests (auto)                       │
│  Rollback on failure (auto)                           │
└───────────────────────────────────────────────────────┘
```

---

## 2. Branch Strategy

```
main          → Production. Protected. Requires 2 approvals.
staging       → Staging environment. Auto-deploys on merge from main.
develop       → Integration branch. All features merge here first.
feature/*     → Feature branches. PR → develop.
fix/*         → Bug fix branches. PR → develop (or main for hotfixes).
hotfix/*      → Emergency fixes. PR → main directly. Requires Lead approval.
```

**Branch Protection Rules** (main):
- Required status checks: all 7 CI stages must pass
- Required reviews: 2 (Lead + Architect)
- No force push
- No direct commits (PRs only)
- Auto-delete branch on merge

---

## 3. CI Pipeline Stages (Detailed)

### Stage 1: Lint & Static Analysis

```yaml
# .github/workflows/ci.yml  (or .gitlab-ci.yml)

lint:
  runs-on: ubuntu-latest
  steps:
    # Python (Gateway)
    - name: Ruff lint
      run: ruff check services/gateway/ --select E,W,F,I

    - name: MyPy type check
      run: mypy services/gateway/ --strict

    # PHP (YetiForce, AureusERP)
    - name: PHP CS Fixer
      run: php vendor/bin/php-cs-fixer fix --dry-run --diff

    # TypeScript (Twenty frontend)
    - name: ESLint
      run: npx eslint packages/twenty-front/src --max-warnings 0

    # Docker
    - name: Hadolint (Dockerfile lint)
      run: hadolint docker/*/Dockerfile

    # Secrets detection
    - name: Gitleaks (prevent secret commits)
      run: gitleaks detect --source . --no-git

  fail_fast: true
  timeout_minutes: 5
```

### Stage 2: Unit Tests

```yaml
unit-tests:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:15.6
      env:
        POSTGRES_PASSWORD: test_pass
        POSTGRES_DB: test_db
    redis:
      image: redis:7.2
  steps:
    # Gateway (Python)
    - name: pytest Gateway
      run: |
        cd services/gateway
        pytest tests/unit/ -v --cov=. --cov-report=xml --cov-fail-under=85
      env:
        DATABASE_URL: postgresql://postgres:test_pass@localhost/test_db
        REDIS_URL: redis://localhost:6379

    # PHP services
    - name: PHPUnit AureusERP
      run: |
        cd aureuserp-master
        php artisan test --parallel --coverage-min=80

    # Twenty CRM
    - name: Vitest Twenty
      run: |
        cd twenty-main
        yarn workspace twenty-server test:unit
        yarn workspace twenty-front test:unit

  timeout_minutes: 15
```

### Stage 3: Security Scan

```yaml
security:
  runs-on: ubuntu-latest
  steps:
    # Python dependency CVE check
    - name: Safety check (Python)
      run: |
        pip install safety
        safety check -r services/gateway/requirements.txt --full-report

    # Node dependency CVE check  
    - name: npm audit (Node)
      run: |
        cd twenty-main
        npm audit --audit-level=high

    # PHP dependency check
    - name: Composer audit (PHP)
      run: |
        cd aureuserp-master
        composer audit

    # SAST (Static Application Security Testing)
    - name: Semgrep SAST
      run: |
        semgrep --config=auto services/gateway/ \
          --severity=ERROR --error

    # Bandit (Python security linter)
    - name: Bandit
      run: bandit -r services/gateway/ -ll

  timeout_minutes: 10
  # Allow security stage to proceed with warnings but fail on critical
```

### Stage 4: Contract Tests

```yaml
contract-tests:
  runs-on: ubuntu-latest
  steps:
    - name: API Contract Tests (Pact)
      run: |
        cd services/gateway
        pytest tests/contract/ -v
      # Validates: every external API call matches expected schema
      # Validates: every event emitted matches catalog in API_CONTRACTS.md

    - name: OpenAPI Schema Validation
      run: |
        # Ensure Gateway OpenAPI spec is valid and complete
        python -c "
        import yaml, jsonschema
        spec = yaml.safe_load(open('services/gateway/openapi.yaml'))
        # Validate all paths have auth, request/response schemas
        for path, methods in spec['paths'].items():
            for method, config in methods.items():
                assert 'security' in config, f'Missing auth on {method} {path}'
                assert 'responses' in config, f'Missing responses on {method} {path}'
        print('OpenAPI spec valid')
        "

  timeout_minutes: 10
```

### Stage 5: Build Docker Image

```yaml
build:
  runs-on: ubuntu-latest
  needs: [lint, unit-tests, security, contract-tests]
  steps:
    - name: Build Gateway image
      run: |
        docker build \
          -t mine-gateway:${GITHUB_SHA} \
          -f docker/gateway/Dockerfile \
          services/gateway/
    
    - name: Scan image (Trivy)
      run: |
        trivy image --exit-code 1 --severity CRITICAL \
          mine-gateway:${GITHUB_SHA}
    
    - name: Push to registry
      run: |
        docker tag mine-gateway:${GITHUB_SHA} registry.local/mine-gateway:${GITHUB_SHA}
        docker push registry.local/mine-gateway:${GITHUB_SHA}

  timeout_minutes: 15
```

### Stage 6: Integration Tests (Staging)

```yaml
integration-tests:
  runs-on: ubuntu-latest
  needs: [build]
  environment: staging
  steps:
    - name: Deploy to staging
      run: |
        # Pull new image to staging compose
        ssh staging-server "
          docker-compose -f docker/docker-compose.gateway.yml pull
          docker-compose -f docker/docker-compose.gateway.yml up -d gateway
          sleep 30  # Wait for startup
        "

    - name: Run integration tests
      run: |
        cd services/gateway
        pytest tests/integration/ -v \
          --base-url=http://staging.minesystem.local:8000 \
          -x  # Stop on first failure

    - name: Run API smoke tests
      run: |
        # Test critical paths
        curl -f http://staging.minesystem.local:8000/health
        curl -f http://staging.minesystem.local:8001/api/  # InvenTree
        curl -f http://staging.minesystem.local:8002/      # AureusERP
        curl -f http://staging.minesystem.local:3000/      # Twenty

  timeout_minutes: 20
```

### Stage 7: Performance Benchmark

```yaml
performance:
  runs-on: ubuntu-latest
  needs: [integration-tests]
  steps:
    - name: k6 load test
      run: |
        k6 run tests/load/gateway_benchmark.js \
          --env BASE_URL=http://staging.minesystem.local:8000 \
          --out json=results.json

    - name: Assert performance thresholds
      run: |
        python tests/load/assert_thresholds.py results.json
        # Fails if: P99 > 2s, error_rate > 2%, or throughput < baseline

  timeout_minutes: 15
```

---

## 4. CD Pipeline (Deployment)

### Staging Auto-Deploy

```yaml
deploy-staging:
  on:
    push:
      branches: [main]
  steps:
    - name: Deploy to staging
      run: |
        ssh staging-server "
          cd /opt/mine-system
          git pull origin main
          ./scripts/deploy.sh staging ${GITHUB_SHA}
        "
    
    - name: Wait for healthy
      run: |
        ./scripts/wait-healthy.sh staging 120  # 2 min timeout
    
    - name: Smoke tests
      run: pytest tests/smoke/ --base-url=http://staging.minesystem.local

    - name: Notify Zulip
      run: |
        curl -X POST http://zulip.local/api/v1/messages \
          -d "type=stream&to=deployments&topic=staging&content=✅ Staging deploy successful: ${GITHUB_SHA}"
```

### Production Deploy (Manual Gate)

```yaml
deploy-production:
  on:
    workflow_dispatch:  # Manual trigger only
      inputs:
        sha: { required: true, description: "Commit SHA to deploy" }
        approved_by: { required: true, description: "CCB approver name" }
  environment:
    name: production
    url: https://minesystem.local
  steps:
    - name: Verify CCB approval
      run: |
        # Check PLAN_REVIEW.md for signed-off approval
        python scripts/verify_ccb_approval.py ${inputs.sha} ${inputs.approved_by}

    - name: Backup before deploy
      run: ./scripts/backup-all.sh production

    - name: Deploy
      run: ./scripts/deploy.sh production ${inputs.sha}

    - name: Health check
      run: ./scripts/wait-healthy.sh production 180

    - name: Smoke tests
      run: pytest tests/smoke/ --base-url=https://minesystem.local

    - name: Notify Zulip
      run: |
        curl ... "✅ PRODUCTION deploy successful: ${inputs.sha} (approved by ${inputs.approved_by})"

    - name: Rollback on failure
      if: failure()
      run: |
        ./scripts/rollback.sh production
        curl ... "🚨 PRODUCTION deploy FAILED: rolled back. Investigate immediately."
```

---

## 5. Deployment Scripts

### deploy.sh
```bash
#!/bin/bash
# scripts/deploy.sh <environment> <sha>
ENVIRONMENT=$1
SHA=$2

echo "Deploying ${SHA} to ${ENVIRONMENT}..."

# Pull specific version
docker-compose \
  -f docker/docker-compose.core.yml \
  -f docker/docker-compose.gateway.yml \
  pull

# Rolling update (gateway)
docker-compose \
  -f docker/docker-compose.gateway.yml \
  up -d --no-deps gateway

echo "Deploy complete."
```

### wait-healthy.sh
```bash
#!/bin/bash
# scripts/wait-healthy.sh <environment> <timeout_seconds>
BASE_URL=${ENVIRONMENT_URLS[$1]}
TIMEOUT=$2
ELAPSED=0

until curl -sf "$BASE_URL/health" > /dev/null; do
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "Health check timed out after ${TIMEOUT}s"
    exit 1
  fi
done

echo "Service healthy after ${ELAPSED}s"
```

### rollback.sh
```bash
#!/bin/bash
# scripts/rollback.sh <environment>
# Reads previous SHA from deployment log, rolls back
PREV_SHA=$(cat .deploy-history | tail -2 | head -1)
echo "Rolling back to ${PREV_SHA}..."
./scripts/deploy.sh $1 ${PREV_SHA}
```

---

## 6. Blackout Windows (No Deploy)

| Period | Reason |
|--------|--------|
| Friday 17:00 - Monday 09:00 | Weekend freeze |
| Month-end day (last day of month) | AureusERP financial close |
| During SigNoz alert (P0/P1 active) | System under incident |
| During CCB meeting | Team unavailable |

---

## 7. Environment Promotion Matrix

```
feature/* ──→ develop ──→ staging ──→ production
                │              │            │
           Auto test       Auto deploy  Manual gate
           on PR open      on merge     + CCB approval
```

---

*Owner: Team Alpha (DevOps)*  
*Agent: RUFLO deploy-guardian, agency-agents deploy-guardian*  
*Review: Update when pipeline tools or deployment process changes*
