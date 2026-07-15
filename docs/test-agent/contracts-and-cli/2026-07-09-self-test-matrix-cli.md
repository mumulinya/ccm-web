# Self-Test Matrix CLI

## Summary

Added a standalone CLI entry for the TestAgent self-test matrix runner. This lets future group-chat integration or manual maintenance run TestAgent's own regression suite without writing ad hoc Node snippets.

## Added

- New CLI mode:
  - `--self-test-matrix`
- Selection options:
  - `--self-test <name>` can be repeated or comma-separated.
  - `--self-test-pattern <text>` filters discovered self-test exports by name.
  - `--self-test-module <file>` points at a compiled self-test module.
- Runtime options:
  - `--self-test-timeout-ms <ms>`
  - `--self-test-stop-on-failure`
- Output modes:
  - `--summary`
  - `--json`
- Capability profile:
  - `self_test_matrix_cli_runner`

## Behavior

The mode calls `runTestAgentSelfTestMatrix` and exits with:

- `0` when every selected self-test passes.
- `1` when any selected self-test fails or times out.
- `2` for invalid CLI usage.

`--self-test-matrix` is intentionally separate from normal work-order execution. It cannot be combined with a work-order path, `--from-handoff`, `--verify-artifacts`, `--validate-only`, or `--plan-only`.

## Examples

```powershell
node dist/test-agent/cli.js --self-test-matrix --summary
node dist/test-agent/cli.js --self-test-matrix --self-test runTestAgentCliSelfTest --summary
node dist/test-agent/cli.js --self-test-matrix --self-test-pattern Browser --self-test-timeout-ms 180000 --self-test-stop-on-failure --json
```

## Verification

- Extended `runTestAgentCliSelfTest` to verify:
  - parser support for matrix mode and all matrix flags,
  - invalid combinations are rejected,
  - summary output includes the matrix formatter,
  - JSON output returns structured matrix reports,
  - pass/fail matrix reports map to exit code `0` or `1`.
- Ran TypeScript compile check for `backend/test-agent/index.ts` and `backend/test-agent/cli.ts`.
