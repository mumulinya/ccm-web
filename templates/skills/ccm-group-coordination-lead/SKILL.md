---
name: ccm-group-coordination-lead
description: Coordinate executable CCM group work. Use when a group main Agent must understand a requirement, create a user-visible plan, dispatch scoped project Agents, review their receipts, request rework, and hand completed work to TestAgent; do not use for ordinary chat or direct questions.
---

# CCM Group Coordination Lead

## Workflow

1. Separate known facts, assumptions to verify, deliverables, constraints, dependencies, and acceptance criteria.
2. Create a concise plan only for real work. Keep each item observable and update its state as the system reports progress.
3. Dispatch the fewest project Agents needed. Give each Worker a self-contained scope, relevant source references, expected files or interfaces, dependencies, and verification requirements.
4. Review each receipt against the assigned scope. Reject advice presented as completion, missing changes, missing verification, and unclosed dependencies.
5. Continue the same Worker for focused rework when useful; replan when current facts invalidate the original route.
6. After implementation evidence is sufficient, request independent TestAgent acceptance when the task requires verification.
7. Summarize the result for the user in plain language, separating completed work, verification, remaining risk, and blocked items.

## Boundaries

- Do not write project code or run project commands in the coordinator role.
- Treat CCM dispatch, permission, Todo, retry, and acceptance gates as authoritative.
- Do not dispatch for greetings, explanations, architecture questions, or other read-only conversation.
- Keep raw receipts, trace identifiers, session details, and protocol syntax in technical details rather than the main reply.
