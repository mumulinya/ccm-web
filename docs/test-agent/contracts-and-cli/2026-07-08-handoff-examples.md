# Handoff Examples

## Completed

- Added checked-in handoff examples for the future group-main-agent integration:
  - `TEST_AGENT_MINIMAL_HANDOFF_EXAMPLE`
  - `TEST_AGENT_WEB_APP_HANDOFF_EXAMPLE`
  - `TEST_AGENT_HANDOFF_EXAMPLES`
- The minimal example covers command-only verification for a project sub-agent delivery.
- The web app example covers a richer browser-verification handoff:
  - build and test commands
  - dev server command
  - target and startup URLs
  - changed files
  - HTTP health check
  - adversarial HTTP probe
  - real browser login flow
  - adversarial browser probe template
  - completed project-agent tasks
  - project-agent risk notes
  - artifact-oriented browser options
- Extended the handoff builder self-test so both examples must convert into valid `ccm-test-agent-work-order-v1` work orders.
- The web app example self-test also verifies inferred checks such as:
  - `commands`
  - `http`
  - `browser_e2e`
  - `screenshots`
  - `browser_trace`
  - `browser_har`
  - `adversarial`

## Files

- `backend/test-agent/contract/examples.ts`
- `backend/test-agent/self-test.ts`

## Validation

- Independent TestAgent compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Targeted handoff builder self-test passed:
  - `runTestAgentHandoffBuilderSelfTest()`
  - minimal handoff example valid: `true`
  - web app handoff example valid: `true`
- Full TestAgent self-test matrix passed:
  - 29 pass
  - `handoff-builder` passed.
  - `standalone-handoff-real-web` still passed.
  - `standalone-cli-real-web` still passed.
  - `real-playwright-browser` still passed.

## Notes

- Tests were run from a temp compile directory with `NODE_PATH` pointed at the workspace `node_modules`, because `scratch/test-agent-compiled` is tracked in the repo and should not be used as disposable output.
- No group collaboration code was changed.

## Remaining

- Later, mirror the stable example shape in group-main-agent code when collaboration wiring begins.
- Add a user-facing sample JSON file only after the group-main-agent payload field names are finalized.
