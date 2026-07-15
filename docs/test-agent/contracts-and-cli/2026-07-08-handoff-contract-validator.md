# Handoff Contract Validator

## Completed

- Added a first-class TestAgent handoff contract schema:
  - `TestAgentHandoffContractSchema`
  - `TestAgentHandoffProjectContractSchema`
  - `TestAgentHandoffContract`
- Added handoff contract validation APIs:
  - `validateTestAgentHandoffContract(...)`
  - `assertTestAgentHandoffContract(...)`
  - `handoffBuilderWarningIssues(...)`
- The handoff validator now separates:
  - handoff shape errors
  - nested HTTP/browser/action/assertion contract errors
  - builder warnings
  - generated work-order validation
- The CLI `--from-handoff` path now uses the shared handoff validator instead of duplicating builder warning logic.
- Added `runTestAgentHandoffContractSelfTest()` covering:
  - minimal checked-in handoff example
  - web app checked-in handoff example
  - single `project` object shape
  - builder warning propagation for missing `workDir`
  - missing project targets
  - invalid `projects` type
  - nested HTTP check missing URL

## Files

- `backend/test-agent/contract/schema.ts`
- `backend/test-agent/contract/validator.ts`
- `backend/test-agent/cli.ts`
- `backend/test-agent/self-test.ts`
- `backend/test-agent/index.ts`

## Validation

- Independent TestAgent compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Targeted self-tests passed:
  - `runTestAgentHandoffContractSelfTest()`
  - `runTestAgentCliSelfTest()`
- Full TestAgent self-test matrix passed:
  - 30 pass
  - New `handoff-contract` self-test passed.
  - `handoff-builder` still passed.
  - `standalone-handoff-real-web` still passed.
  - `standalone-cli-real-web` still passed.

## Remaining

- Later, have group-main-agent integration run `validateTestAgentHandoffContract(...)` before launching expensive browser checks.
- Treat handoff contract errors as input repair work, not implementation failure.
- Keep the CLI `--from-handoff` path as the process boundary for future collaboration wiring.
