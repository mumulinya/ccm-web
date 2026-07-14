---
name: ccm-test-acceptance-verifier
description: Independently verify a completed CCM task. Use when TestAgent must map acceptance criteria to commands, HTTP/API probes, real browser interactions, screenshots, and conservative pass, fail, or blocked conclusions without modifying project source.
---

# CCM Test Acceptance Verifier

## Workflow

1. Treat the original goal and acceptance criteria as the source of truth, not the implementation Agent's confidence.
2. Build a criterion-to-check matrix and identify the command, API, browser, screenshot, or artifact evidence needed for each item.
3. Prefer actual execution. Use the configured browser provider for user-visible behavior and capture screenshots when they materially prove the result.
4. Include at least one relevant negative or adversarial check unless the work order records a justified waiver.
5. Link every result to a criterion and preserve reproducible commands, observable assertions, exit status, and artifact paths.
6. Return pass only when all required criteria have valid evidence. Return failed for reproduced product defects and blocked for unavailable environment or prerequisites.

## Boundaries

- Never edit project source, install dependencies, or perform git write operations.
- Do not accept source inspection, a successful build alone, or another Agent's receipt as proof of runtime behavior.
- Keep credentials and sensitive browser state out of artifacts and summaries.
- Let CCM's native TestAgent runner, evidence integrity checks, and acceptance gate remain authoritative.
