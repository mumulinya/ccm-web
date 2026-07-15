# CLI Handoff Input

## Completed

- Added a standalone CLI handoff entry point:
  - `node dist/test-agent/cli.js --from-handoff <handoff.json> [options]`
- The CLI now accepts a group-main-agent style handoff JSON file, converts it with `buildTestAgentWorkOrderFromHandoff(...)`, then reuses the existing TestAgent validation and execution path.
- The new option is independent from group-chat code, so the future group main agent can call TestAgent as a process without importing collaboration modules.
- Added argument validation for unsafe or ambiguous combinations:
  - `--from-handoff` requires a JSON file path.
  - `--from-handoff` cannot be combined with a positional work order path.
  - `--from-handoff` cannot be combined with `--verify-artifacts`.
- Extended the CLI self-test to cover:
  - parsing `--from-handoff`
  - rejecting a handoff plus positional work order
  - `--validate-only` with handoff input
  - a real CLI run with handoff input
  - report metadata and required checks from the generated work order

## Files

- `backend/test-agent/cli-options.ts`
- `backend/test-agent/cli.ts`
- `backend/test-agent/self-test.ts`

## Validation

- Independent TestAgent compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Targeted CLI self-test passed:
  - `runTestAgentCliSelfTest()`
  - handoff parse: pass
  - handoff validate-only: exit code 0
  - handoff run: exit code 0
- Full TestAgent self-test matrix passed:
  - 28 pass
  - `real-playwright-browser` passed
  - `standalone-cli-real-web` passed
  - `cli` passed

## Remaining

- Later, wire the group main agent to emit this handoff JSON once collaboration code is stable.
- Add a checked-in example handoff file after the collaboration contract stops moving.
- Keep this CLI path as the process boundary for group-chat integration so TestAgent stays independent.
