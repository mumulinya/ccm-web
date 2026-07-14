# Source Intake Guide

## Source Handling

- Chat text: preserve the latest explicit instruction over older conflicting statements.
- Image: record visible text, controls, state, layout evidence, and uncertainty caused by cropping or resolution.
- PRD or business document: extract actors, rules, state transitions, edge cases, and acceptance clauses.
- API document: extract method, path, authentication, request fields, response fields, errors, idempotency, and examples.
- Office document: retain heading or table context around extracted clauses.
- Remote link: use only content actually retrieved by an authorized connector; otherwise mark it unavailable.

## Intake Output

Return these fields when applicable:

1. `sources`
2. `goal`
3. `known_facts`
4. `scope`
5. `deliverables`
6. `constraints`
7. `acceptance_criteria`
8. `assumptions_to_verify`
9. `missing_decisions`

Keep source citations close to the facts they support.
