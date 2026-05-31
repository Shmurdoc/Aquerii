# Elite Team Responsibilities

## Team Assignment Matrix

Based on scanned skill projects from:
- `E:\RUFLO\ruflo-main\ruflo-main`
- `E:\Devine Brain`
- `E:\elit dev Skills`
- `E:\elit dev Skills1\gstack-main`

---

## Team Alpha: Core Infrastructure

**Focus**: Foundation services (Caddy, Homarr, PostgreSQL, SigNoz)

### Members & Skills

| Member | Primary Skills | Tasks |
|--------|---------------|-------|
| **@Devine Brain (microservices)** | Terraform, Kubernetes, Docker, Infrastructure | Container orchestration, Terraform configs |
| **@gstack-main (review)** | Security auditing, API contracts, Code review | Security configs, SSL/TLS, API validation |
| **@RUFLO (autopilot)** | Automation scripts, Monitoring | Backup automation, SigNoz config |

### Skill Sources

- `@Devine Brain/advanced skills/microservices-demo/terraform/` - Infrastructure as Code
- `@elit dev Skills1/gstack-main/review/specialists/security.md` - Security review
- `@RUFLO/ruflo-main\ruflo-main/plugins/ruflo-autopilot/` - Automation

---

## Team Beta: Business Systems

**Focus**: Core business applications (ERPNext, Twenty CRM, InvenTree, Paperless-ngx)

### Members & Skills

| Member | Primary Skills | Tasks |
|--------|---------------|-------|
| **@elit dev Skills (code_refactor)** | Python, ERPNext customization, Code architecture | ERPNext deployment |
| **@Devine Brain (bulletproof-react)** | React, Frontend, TypeScript, State management | Twenty CRM frontend |
| **@RUFLO (intelligence)** | Python SDK, AI integration, Data processing | InvenTree setup + SDK |
| **@RUFLO (workflows)** | Workflow automation, Task orchestration | Paperless-ngx + integrations |

### Skill Sources

- `@elit dev Skills/tests/code_refactor/` - Python code refactoring
- `@Devine Brain/advanced skills/bulletproof-react/` - React best practices
- `@RUFLO/ruflo-main\ruflo-main/plugins/ruflo-intelligence/` - AI/ML integration
- `@RUFLO/ruflo-main\ruflo-main/plugins/ruflo-workflows/` - Workflow automation

---

## Team Gamma: Integration Layer

**Focus**: API Gateway, Webhooks, Data Sync, AI Agents

### Members & Skills

| Member | Primary Skills | Tasks |
|--------|---------------|-------|
| **@RUFLO (workflows)** | FastAPI, Webhooks, API development | Gateway, webhook handlers |
| **@gstack-main (investigate)** | Investigation, Debugging, API contracts | API sync logic, data pipelines |
| **@RUFLO (browser)** | Browser automation, AI agents | AI Agent Framework |
| **@RUFLO (autopilot)** | Automation, Monitoring | Retry logic, queues |

### Skill Sources

- `@RUFLO/ruflo-main\ruflo-main/plugins/ruflo-workflows/` - FastAPI workflows
- `@elit dev Skills1/gstack-main/investigate/SKILL.md` - Investigation
- `@RUFLO/ruflo-main\ruflo-main/plugins/ruflo-browser/` - Browser automation
- `@gstack-main/review/specialists/api-contract.md` - API contracts

---

## Team Delta: User Experience

**Focus**: Dashboard, ChatOps, Visual Tools

### Members & Skills

| Member | Primary Skills | Tasks |
|--------|---------------|-------|
| **@Devine Brain (query)** | Vue Query, Data fetching, State management | Homarr dashboard widgets |
| **@gstack-main (context-save)** | State management, Context saving | Session management, state |
| **@elit dev Skills (plan_sequential)** | Sequential planning, UX flows | UX implementation |

### Skill Sources

- `@Devine Brain/advanced skills/query/` - Vue Query patterns
- `@elit dev Skills1/gstack-main/context-save/SKILL.md` - Context saving
- `@elit dev Skills/tests/plan_sequential/` - Sequential planning

---

## Skill Reference Table

| Skill Name | Location | Used By |
|-----------|----------|---------|
| Terraform | `Devine Brain/advanced skills/microservices-demo/terraform/` | Alpha |
| Security Review | `elit dev Skills1/gstack-main/review/specialists/security.md` | Alpha |
| Automation | `RUFLO/plugins/ruflo-autopilot/` | Alpha |
| Code Refactor | `elit dev Skills/tests/code_refactor/` | Beta |
| Bulletproof React | `Devine Brain/advanced skills/bulletproof-react/` | Beta |
| Intelligence AI | `RUFLO/plugins/ruflo-intelligence/` | Beta |
| Workflows | `RUFLO/plugins/ruflo-workflows/` | Gamma |
| Investigation | `elit dev Skills1/gstack-main/investigate/` | Gamma |
| Query | `Devine Brain/advanced skills/query/` | Delta |

---

## Responsibilities by Phase

| Phase | Team | Primary Responsibility |
|-------|------|----------------------|
| Phase 1 | Alpha | Infrastructure setup |
| Phase 2 | Beta | Business app deployment |
| Phase 3 | Gamma | Integration layer |
| Phase 4 | Delta | User interface |

---

## Communication Protocol

- **Daily Standups**: Each team reports progress
- **Handoffs**: Document all state changes
- **Reviews**: gstack-main reviews security
- **Testing**: Run before commit (verify command TBD)

---

*Created: 2026-05-03* | *Status: Planning Phase Only*