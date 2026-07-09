# TestAgent Acceptance Failure Evidence Diagnostics

## Goal

Make failed acceptance criteria easier for the future group/main agent to route. Acceptance coverage now records evidence strength and source, but failure summaries also need to explain what that means during rework.

## Changes

- Updated `backend/test-agent/failure-summary.ts` acceptance diagnostics to use:
  - `matchStrength`
  - `matchScore`
  - `evidenceSource`
- Acceptance failure reasons now include a compact evidence descriptor such as `evidence strength=token; source=matched_evidence; score=0.4`.
- Acceptance `nextAction` is now more specific:
  - `none` or `fallback`: add a direct browser, HTTP/API, or command assertion.
  - `direct` or `token` with `not_verified`: fix the matched failed evidence, then rerun TestAgent.
- Extended `runTestAgentFailureSummarySelfTest` so markdown and verdict output must carry the acceptance evidence diagnostics.

## Behavior

Diagnostics now distinguish:

- `direct`: the criterion matched directly, so a failed check should usually be fixed before adding broad coverage.
- `token`: there is related evidence, but the link is weaker; prefer explicit check names or assertion details.
- `fallback`: the result came from the single-criterion report-status fallback and should not be treated as strong acceptance proof.
- `none`: no acceptance evidence source exists, so the task needs a concrete check mapped to the criterion.

This gives a downstream coordinator enough context to avoid treating all acceptance failures as the same kind of rework.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- `runTestAgentFailureSummarySelfTest`

## Follow-Up

- Later group-chat integration can prioritize acceptance failures with `none` or `fallback` as missing-test work, while routing `direct` or `token` failures back to the implementation agent with the matched failed evidence.
