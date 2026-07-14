# TestAgent Verdict Connector V1

## Completed

- Main/group Agent now consumes TestAgent's compact `ccm-test-agent-verdict-v1` artifact when a native TestAgent CLI run produces `verdict.json`.
- The connector still keeps the process boundary:
  - Main Agent emits `ccm-test-agent-handoff-v1`.
  - TestAgent CLI receives it through `--from-handoff`.
  - TestAgent owns work-order conversion, validation, execution, reports, and verdict generation.
- Main Agent uses verdict fields for orchestration decisions:
  - `canAccept` -> user-facing review can proceed toward final acceptance.
  - `needsRework` -> receipt becomes failed and can route back to the implementation Agent.
  - `needsHuman` -> receipt becomes blocked and asks for human confirmation.
- User-visible text stays friendly:
  - shows review object, conclusion, decision, evidence, and risks in Chinese.
  - keeps report paths, manifest paths, verdict payloads, and raw protocol fields in technical details.

## Files

- `backend/modules/collaboration/collaboration.ts`
- `scripts/main-agent-decision-ui-selftest.mjs`

## Validation

- `node scripts\main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- compiled `runCoordinatorReworkProtocolSelfTest()`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- real TestAgent CLI handoff smoke:
  - `ccm-package/dist/test-agent/cli.js --from-handoff <handoff.json> --plan-only --json`
  - `ccm-package/dist/test-agent/cli.js --from-handoff <handoff.json> --json`
  - verified `ccm-test-agent-report-v1` and `ccm-test-agent-verdict-v1`

## Boundary

- This change does not modify TestAgent business logic.
- It only wires the main/group Agent connector and user-facing result handling to the TestAgent artifacts already produced by the separate TestAgent workstream.
