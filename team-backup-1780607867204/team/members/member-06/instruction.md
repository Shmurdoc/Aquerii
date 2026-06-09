---
member_id: member-06
instructions_version: 3
updated_at: 2026-06-04T00:00:00Z
---

# Instructions

1. **READ `team/SYSTEM.md` FIRST** — understand the full coordination system
2. Follow design standards in repo/CONTRIBUTING.md
3. Branch naming: `feature/member-06/<short-description>`
4. Commit prefix: `[member-06] description`
5. Run validation before marking done: Lighthouse score > 90 + WCAG 2.1 AA audit
6. If blocked, update `wait.md` and `status.md` immediately
7. Update `last_heartbeat` in `status.md` every 15 minutes while working
8. Own `docs/frontend-design/`, CSS themes, component specs in `services/web/src/components/`
9. Design for mobile-first, ensure responsive at all breakpoints
10. Document all design decisions in the design spec with rationale
11. Create reusable component specs that member-02 and member-03 can implement
12. Maintain CSS variable theming system and Tailwind configuration

## Tool Recommendations
- Load `/design-review` skill for visual QA and consistency checks
- Load `/browse` skill for taking screenshots of UI states
- MCP servers: filesystem
- Before marking done: run `/browse` to capture screenshots at all breakpoints
- Run `/design-review` to catch visual inconsistencies and spacing issues
