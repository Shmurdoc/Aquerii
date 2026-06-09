# Chaos & Resilience Testing — Reference

Overview
- Design controlled fault-injection experiments to validate recovery and assumptions.

Checklist
- Define steady-state hypothesis and blast-radius limitations.
- Create safety gates and rollback steps for each experiment.
- Automate experiments in staging and run periodic non-production drills.

Experiment Examples
- Network partition, CPU/memory saturation, service termination, degraded downstream responses.

Recording & Remediation
- Collect traces, logs, and metrics during experiments; produce action items and mitigations.
- Feed learnings back into architecture and runbooks.

Tooling
- Example harnesses for chaos tools (Chaos Mesh, Gremlin, or simple injectable fault scripts).
