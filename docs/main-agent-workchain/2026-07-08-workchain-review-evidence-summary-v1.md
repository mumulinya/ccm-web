# Workchain Review Evidence Summary V1

## Completed

- Main Agent workchain completion summaries now include user-readable acceptance and independent-review evidence.
- The summary can consume evidence from:
  - `delivery_report.independent_review`
  - `independent_review_gate.evidence`
  - receipt `independentReview` / `independent_review`
  - TestAgent verdicts attached to receipts
- Final user-facing replies now include a `复核与验收` section when acceptance or independent-review evidence exists.
- Technical blocker text is sanitized before it can appear in user-visible risk lines, so raw values such as `trace_id` stay in technical details.

## Why

Claude Code's task flow makes users feel progress through visible plan, execution, validation, and summary checkpoints. This upgrade makes CCM's final summary show why the main Agent can accept a delivery, instead of only saying that child Agent receipts were collected.

## Files

- `backend/agents/workchain.ts`
- `scripts/main-agent-decision-ui-selftest.mjs`

## Validation

- `node scripts\main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- compiled `runMainAgentWorkchainSelfTest()`

## Notes

- No TestAgent business logic was changed.
- Raw review payloads, IDs, traces, sessions, and artifact paths remain technical-detail material.
