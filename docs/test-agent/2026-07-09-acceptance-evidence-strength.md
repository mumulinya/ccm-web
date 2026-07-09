# TestAgent Acceptance Evidence Strength

## Goal

Make acceptance coverage more useful for the future group-chat handoff. A criterion marked `verified` can now explain whether it was directly proven by matching evidence, inferred from a token-level match, or only inferred by the single-criterion report-status fallback.

## Changes

- Added `matchStrength`, `matchScore`, and `evidenceSource` to acceptance coverage items.
- Added acceptance summary counts for `matchStrength` and `evidenceSource`.
- Propagated the fields into verdict JSON, CLI summaries, markdown reports, and contract schemas.
- Added artifact-verifier consistency checks so verdict summary strength/source counts must match report acceptance coverage.
- Exported the new acceptance summary formatting helpers from `backend/test-agent/index.ts`.

## Behavior

`matchStrength` values:

- `direct`: the criterion text directly appears in matching evidence.
- `token`: the criterion matched evidence by token overlap.
- `fallback`: a single acceptance criterion inherited the overall report pass/fail status because there was supporting passed/failed evidence but no criterion text match.
- `none`: no supporting acceptance evidence was found.

`evidenceSource` values:

- `matched_evidence`: coverage came from evidence that matched the criterion.
- `single_criterion_report_status`: coverage came from the single-criterion fallback.
- `none`: no evidence source was found.

This lets the future group/main agent treat direct browser assertions as stronger than fallback inference when deciding whether to accept work or route it back for rework.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Focused compiled self-tests passed:
  - `runTestAgentAcceptanceSummarySelfTest`
  - `runTestAgentCliSelfTest`
  - `runTestAgentContractSelfTest`
  - `runTestAgentArtifactSelfTest`
  - `runTestAgentVerdictSelfTest`
  - `runTestAgentArtifactVerifierSelfTest`
  - `runTestAgentCoverageSelfTest`
  - `runTestAgentAcceptancePathSmokeSelfTest`

## Follow-Up

- When the group-chat bridge is connected later, prefer `direct` and high-score `token` evidence for auto-accept decisions.
- Treat `fallback` as useful but weaker evidence that may still need human or project-agent confirmation for high-risk tasks.
