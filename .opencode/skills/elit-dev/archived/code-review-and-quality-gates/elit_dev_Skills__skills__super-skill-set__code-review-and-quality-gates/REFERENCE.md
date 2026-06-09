# Code Review & Quality Gates — Reference

Overview
- PR workflows, review checklists, automated linters, type checks, and security gates.

Checklist
- Define required reviewers per area and sensitive-file approvers.
- Enforce automated checks: format, lint, type, unit quick-run, and quick security scan.
- Provide PR templates that require description, testing notes, and security impact.

Automation
- Pre-commit hooks to run linters and formatters locally.
- CI gates for mandatory checks; block merge until all required checks pass.

Quality Metrics
- Time to review, approval rework rate, and gate pass rates.

Templates
- PR template, security-impact checklist, and reviewer assignment rules.
