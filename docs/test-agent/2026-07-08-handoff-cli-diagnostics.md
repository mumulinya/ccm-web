# Handoff CLI Diagnostics

## Completed

- Hardened the standalone handoff CLI boundary for future group-main-agent calls.
- `--from-handoff` now rejects JSON roots that are not objects with a clear exit-2 diagnostic instead of producing an empty error or an uncaught stack.
- The same object-root guard now covers:
  - work order JSON input
  - handoff JSON input
  - artifact manifest JSON input
- Handoff builder warnings are now surfaced in CLI validation output as machine-readable warnings:
  - `code: "handoff_builder_warning"`
  - `severity: "warning"`
- Handoff builder warnings are also preserved in the generated work order metadata:
  - `metadata.handoffWarnings`
- Extended the CLI self-test to cover:
  - invalid handoff root value (`null`)
  - warning handoff with missing `workDir`
  - warning handoff with no acceptance criteria or completed tasks
  - JSON validation output containing builder warnings
  - normalized metadata preserving `handoffWarnings`

## Files

- `backend/test-agent/cli.ts`
- `backend/test-agent/work-order-builder.ts`
- `backend/test-agent/self-test.ts`

## Validation

- Targeted CLI self-test passed:
  - `runTestAgentCliSelfTest()`
  - invalid handoff exit code: `2`
  - warning handoff validate-only exit code: `0`
  - warning output includes `handoff_builder_warning`
  - normalized metadata includes `handoffWarnings`
- Full TestAgent self-test matrix passed:
  - 29 pass
  - `standalone-handoff-real-web` still passed.
  - `standalone-cli-real-web` still passed.
  - `real-playwright-browser` still passed.
- Independent TestAgent compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`

## Remaining

- Let the future group-main-agent integration treat exit code `2` as contract/input failure, not feature failure.
- Let warning diagnostics feed back into task handoff repair before TestAgent runs expensive browser checks.
- Add a checked-in handoff example once the group-main-agent handoff payload shape is stable.
