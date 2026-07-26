---
name: ccm-business-rule-modeling
description: Model executable business behavior from a CCM feature request. Use when a task changes domain actors, permissions, states, transitions, invariants, decisions, exception paths, or lifecycle rules and the group main Agent or project Agent must make those rules explicit before decomposition or implementation.
---

# CCM Business Rule Modeling

Turn product language into a compact, source-backed business rule contract that implementation and acceptance can both follow.

## Workflow

1. Identify actors, goals, owned entities, and the exact operation being changed.
2. Inspect the requirement sources and current implementation. Separate confirmed behavior from requested behavior.
3. Define states and transitions with trigger, preconditions, authorization, side effects, terminal state, retry behavior, and cancellation behavior.
4. State invariants such as uniqueness, idempotency, ordering, amount limits, time boundaries, and visibility rules.
5. Cover the happy path, alternate paths, denial paths, failures, retries, and recovery.
6. Link every material rule to an observable acceptance result and the responsible project or module.
7. Mark assumptions and unresolved policy questions explicitly. Block the affected branch instead of inventing a rule.

## Required Output

Provide a concise rule contract containing:

- actors and permissions;
- domain objects and owned state;
- transition table with triggers, guards, effects, and outcomes;
- invariants and exception handling;
- source references and unresolved decisions;
- acceptance scenarios derived from the rules.

## Boundaries

- Do not use this Skill for a pure visual change with no business behavior change.
- Treat current source, verified requirements, and user corrections as authoritative; do not manufacture product policy.
- This Skill models application authorization but does not grant CCM execution permission.
- Keep implementation details out unless they are necessary to preserve a business invariant.
