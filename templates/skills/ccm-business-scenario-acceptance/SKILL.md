---
name: ccm-business-scenario-acceptance
description: Design and execute business-level acceptance scenarios for a CCM delivery. Use when a feature has user roles, permissions, state transitions, cross-layer data flow, normal, alternative, error, retry, or idempotency paths and the project Agent or TestAgent must verify behavior beyond build success.
---

# CCM Business Scenario Acceptance

Verify complete user-visible business behavior with reproducible evidence, not merely source inspection or a successful build.

## Workflow

1. Derive a scenario matrix from the original goal, confirmed business rules, interface contracts, and acceptance criteria.
2. Cover the happy path, alternate roles, permission denial, invalid input, boundaries, duplicate submission, retries, state transitions, persistence after reload, failure, and recovery where relevant.
3. For each scenario record preconditions, actor, action, expected observable result, cleanup, and required evidence.
4. Exercise public UI, API, or supported integration surfaces where possible. Use direct storage inspection only as supporting evidence.
5. Isolate test data and avoid destructive production actions. Keep sibling projects, groups, and sessions untouched.
6. The project Agent performs implementation self-verification; TestAgent independently reruns the critical business scenarios.
7. Pass only when every required criterion has evidence. Distinguish failed behavior from blocked environment or missing authority.

## Required Output

Provide:

- a scenario matrix mapped to acceptance criteria;
- exact commands, requests, browser steps, or fixtures used;
- expected and actual results;
- evidence locations and cleanup status;
- a conservative `pass`, `fail`, or `blocked` verdict with residual risk.

## Boundaries

- Build success, type checks, or source inspection alone are not business acceptance evidence.
- Do not invent a pass when credentials, data, environment, or required services are unavailable.
- Do not weaken assertions to make an implementation pass.
- Existing CCM permission gates and project safety rules remain authoritative.
