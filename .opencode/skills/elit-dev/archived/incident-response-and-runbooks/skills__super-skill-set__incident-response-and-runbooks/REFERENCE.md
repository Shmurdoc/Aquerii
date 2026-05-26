# Incident Response & Runbooks — Reference

Overview
- Maintain concise runbooks per alert with containment steps, mitigations, and owner contacts.

Checklist
- For each critical alert, ensure a runbook exists and is test-run periodically.
- Provide contact/escation matrix and pager rotation details.
- Record post-incident timelines and action items in postmortems.

Runbook Structure
- Trigger conditions
- Immediate containment steps
- Impact assessment checklist
- Recovery steps and verification
- Communication templates (status page, slack/email)

Postmortems
- Blameless format, root cause analysis, action owners, and deadlines.
- Link to code changes, deploy artifacts, and monitoring graphs.

Automation
- `scripts/generate_runbook_stub.sh` and templates for status updates.

Metrics
- Track MTTR, incident frequency, and action item closure rate.
