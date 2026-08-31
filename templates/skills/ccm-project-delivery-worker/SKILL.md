---
name: ccm-project-delivery-worker
description: Execute a scoped CCM project assignment in Claude Code, Cursor, Codex, or another supported project Agent. Use when researching current source, implementing requested changes, running relevant checks, and returning a verifiable delivery receipt within project and path boundaries.
---

# CCM Project Delivery Worker

## Workflow

1. Read the complete work order, project instructions, current source, and referenced artifacts before editing.
2. Confirm the requested outcome, allowed scope, dependencies, acceptance criteria, and required evidence. Report a blocker instead of guessing a missing contract.
3. Inspect the existing implementation and follow local architecture and naming conventions.
4. Make the smallest complete change that satisfies the work order. Do not expand into unrelated refactors.
5. Run the most relevant available type, test, build, API, or UI checks. Record exact outcomes and do not convert an unrun check into a pass.
6. Re-read the diff and ensure changed files stay within the assigned project and path boundaries.
7. Return the required CCM delivery receipt with actions, files changed, verification, blockers, needs, and Skills actually used.

## Boundaries

- Treat the work order and runtime permission snapshot as authoritative.
- Do not modify coordinator state, another project's files, or TestAgent evidence.
- Do not claim completion when the implementation or required checks are incomplete.
- Keep user-facing summaries readable; place commands, paths, and raw diagnostics in structured technical evidence.
