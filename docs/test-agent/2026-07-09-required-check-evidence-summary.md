# TestAgent Required Check Evidence Summary

## Goal

Make TestAgent required-check results easier for the group/main agent to consume after project agents finish work. The summary now exposes status counts, failed/unknown checks with the first useful evidence or missing reason, and a small set of verified evidence samples.

## Changes

- Added `backend/test-agent/required-check-summary.ts` to keep required-check reporting separate from required-check coverage detection.
- Added `requiredCheckSummary` to the verdict JSON contract.
- Updated CLI summary output from per-check status text to:
  - total counts by status
  - attention lines for `not_verified` and `unknown` checks
  - a few verified evidence samples
- Added a `## Required Check Summary` section to markdown reports while preserving full `## Required Check Coverage` details.
- Exported the summary builder/formatters from `backend/test-agent/index.ts`.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Temp runtime compile to `%TEMP%\ccm-test-agent-compiled-runtime`
- Self-tests:
  - `runTestAgentArtifactSelfTest`
  - `runTestAgentVerdictSelfTest`
  - `runTestAgentContractSelfTest`
  - `runTestAgentCliSelfTest`
  - `runTestAgentRequiredCheckCoverageSelfTest`
  - `runTestAgentArtifactVerifierSelfTest`

## Follow-Up

- The group/main agent can later read `verdict.requiredCheckSummary` directly instead of parsing CLI or markdown text.
- When collaboration integration resumes, pass the TestAgent verdict artifact path and run URL/context through the existing handoff path.
