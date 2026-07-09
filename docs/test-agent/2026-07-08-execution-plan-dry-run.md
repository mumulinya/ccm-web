# Execution Plan Dry Run

## Completed

- Added a dry-run execution planner for TestAgent:
  - `buildTestAgentExecutionPlan(...)`
  - `TestAgentExecutionPlan`
  - schema: `ccm-test-agent-execution-plan-v1`
- Added CLI support:
  - `node dist/test-agent/cli.js <work-order.json> --plan-only`
  - `node dist/test-agent/cli.js --from-handoff <handoff.json> --plan-only`
  - supports `--summary` and default JSON output
- The plan shows what TestAgent will do without starting dev servers, running commands, probing HTTP, or opening browsers.
- The plan includes:
  - normalized work order identity
  - required checks and acceptance criteria
  - artifact directory
  - browser provider
  - explicit and auto-discovered commands
  - dev server command/startup URL
  - HTTP and adversarial HTTP checks
  - browser checks, auto browser smoke checks, and adversarial browser checks
  - expected artifact types such as screenshots, snapshots, console/network logs, trace, and HAR
  - validation/planning issues
- `--plan-only` is rejected when combined with `--verify-artifacts` or `--validate-only`.

## Files

- `backend/test-agent/execution-plan.ts`
- `backend/test-agent/cli-options.ts`
- `backend/test-agent/cli.ts`
- `backend/test-agent/index.ts`
- `backend/test-agent/self-test.ts`

## Validation

- Independent TestAgent compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Targeted self-test passed:
  - `runTestAgentExecutionPlanSelfTest()`
  - direct plan summary: 3 commands, 1 dev server, 1 HTTP check, 1 auto browser smoke check
  - CLI `--from-handoff --plan-only --summary` exit code: `0`
  - CLI `--plan-only` did not call `runAgent`
- Full TestAgent self-test matrix passed:
  - 31 pass
  - New `execution-plan` self-test passed.
  - `handoff-contract` still passed.
  - `standalone-handoff-real-web` still passed.
  - `standalone-cli-real-web` still passed.

## Remaining

- Later, have group-main-agent integration request a plan before launching expensive real browser verification.
- Use the plan to show operators what TestAgent is about to verify and which artifacts will be produced.
- Keep the plan output stable enough for the future group-chat UI to summarize.
