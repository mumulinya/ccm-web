# Standalone CLI Runner

## Completed

Added a standalone TestAgent CLI runner so the group main agent can later hand off a complete work order without importing the group collaboration module.

The CLI now supports:

- `--validate-only` to check the work-order contract without executing commands, HTTP probes, or browser checks.
- `--summary` for concise human-readable output.
- `--json` for full structured output, which remains the default.
- `--artifact-dir <dir>` to force report, screenshot, transcript, and manifest output into a caller-controlled directory.
- `--browser-provider <auto|playwright|mcp|none>` to select or disable browser execution per handoff.
- `--no-auto-discover` to prevent package script discovery when the handoff must only run explicit checks.

## Usage

```powershell
node dist/test-agent/cli.js work-order.json --summary --browser-provider playwright --artifact-dir .test-agent-artifacts
```

Validation-only mode:

```powershell
node dist/test-agent/cli.js work-order.json --validate-only --summary
```

## Exit Codes

- `0`: report passed, or validation-only work order is valid.
- `1`: executed report failed.
- `2`: blocked, partial, invalid work order, invalid CLI arguments, unreadable JSON, or runtime setup problem.

## Integration Notes

The future group main agent only needs to prepare a `ccm-test-agent-work-order-v1` JSON file containing:

- original user goal and acceptance criteria
- project work directory
- run/dev-server command or target URL
- explicit verification commands, HTTP checks, browser checks, or adversarial probes
- required checks such as `commands`, `browser_e2e`, `screenshots`, and `console_errors`
- artifact directory for the final report package

The TestAgent still stays verification-only. It validates the contract before execution and refuses to treat a malformed handoff as a passing test.

## Verification

Added `runTestAgentCliSelfTest`, which exercises CLI argument parsing, validation-only output, real work-order file execution, summary formatting, artifact override handling, and browser-provider override handling.
