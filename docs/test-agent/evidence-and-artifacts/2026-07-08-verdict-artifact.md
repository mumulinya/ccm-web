# Verdict Artifact

## Completed

- Added a compact machine-readable TestAgent verdict:
  - schema: `ccm-test-agent-verdict-v1`
  - builder: `buildTestAgentVerdict(report)`
  - artifact: `verdict.json`
- `verdict.json` is written next to:
  - `report.json`
  - `report.md`
  - `artifact-manifest.json`
- The verdict is designed for the future group-main-agent integration to consume without parsing the full report.
- It includes:
  - status and recommendation
  - `canAccept`, `needsRework`, `needsHuman`
  - failed and unknown required checks
  - failed and unknown acceptance criteria
  - blocked reasons and risks
  - next actions
  - compact evidence summary
  - key evidence and artifact paths
- Added a verdict contract schema and validator:
  - `TestAgentVerdictContractSchema`
  - `validateTestAgentVerdictContract(...)`
  - `assertTestAgentVerdictContract(...)`
- The artifact manifest now records `verdict_json` and verifies its integrity.

## Files

- `backend/test-agent/verdict.ts`
- `backend/test-agent/types.ts`
- `backend/test-agent/artifacts.ts`
- `backend/test-agent/contract/schema.ts`
- `backend/test-agent/contract/validator.ts`
- `backend/test-agent/self-test.ts`
- `backend/test-agent/index.ts`

## Validation

- Targeted self-tests passed:
  - `runTestAgentArtifactSelfTest()`
  - `runTestAgentVerdictSelfTest()`
  - `runTestAgentArtifactManifestSelfTest()`
  - `runTestAgentContractSelfTest()`
- Full TestAgent self-test matrix passed:
  - 32 pass
  - New `verdict` self-test passed with a failed report and `needsRework: true`.
  - `artifact-manifest` verified `verdict_json` integrity.
  - `standalone-handoff-real-web` still passed.
- Independent TestAgent compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`

## Remaining

- Later, have group-main-agent consume `verdict.json` as the compact decision packet.
- Keep the full report for detailed evidence and the verdict for orchestration decisions.
- Add UI affordances after group-chat integration is ready.
