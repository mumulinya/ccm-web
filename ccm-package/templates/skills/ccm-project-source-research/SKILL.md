---
name: ccm-project-source-research
description: Establish the current implementation before editing a CCM project. Use for every project Worker assignment that requires source changes or technical conclusions, including locating project instructions, tracing relevant code paths, checking repository state, identifying established patterns, and separating confirmed source facts from work-order assumptions.
---

# CCM Project Source Research

## Workflow

1. Read repository instructions and project-specific conventions before changing files.
2. Inspect repository status without reverting existing user or parallel-Agent changes.
3. Locate the entry points, data flow, tests, configuration, and neighboring implementation relevant to the work order.
4. Confirm whether named files, routes, fields, components, commands, and assumptions exist in current source.
5. Identify the smallest ownership boundary for the change and any collision risk with current edits.
6. Record confirmed facts and gaps before implementation. Report a blocker when the requested contract cannot be safely inferred.

Prefer repository search and structured parsers over broad directory dumps or ad hoc text manipulation. Research must lead to implementation or a concrete blocker, not an open-ended code tour.
