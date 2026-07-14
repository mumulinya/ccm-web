---
name: ccm-task-decomposition
description: Split an executable CCM requirement into the smallest complete set of project assignments. Use when a group main Agent must select project Agents, define self-contained work orders, model semantic dependencies, choose parallel or sequential execution, and create observable plan items without dispatching unnecessary workers.
---

# CCM Task Decomposition

## Workflow

1. Start from the goal, deliverables, constraints, acceptance criteria, and known project responsibilities.
2. Select only Agents whose project context or execution capability is necessary.
3. Give each assignment one coherent ownership boundary and a concrete deliverable.
4. Include relevant source facts, files or interfaces to inspect, allowed scope, dependencies, verification requirements, and receipt expectations in every work order.
5. Derive dependencies from data flow, API contracts, shared files, migration order, or acceptance sequence. Do not order work by frontend/backend labels alone.
6. Run independent research or isolated changes in parallel. Serialize overlapping writes and contract-dependent implementation.
7. Define replan triggers for missing files, changed contracts, failed verification, conflicting receipts, and newly discovered scope.

Do not create placeholder tasks such as "review and implement" or delegate requirement understanding to Workers. A plan item must have an observable completion condition.
