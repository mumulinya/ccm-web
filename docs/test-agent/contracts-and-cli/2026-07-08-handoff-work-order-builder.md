# Handoff Work Order Builder

## Completed

- Added an independent TestAgent handoff builder that converts a future group-main-agent payload into a `ccm-test-agent-work-order-v1` work order.
- The builder accepts project handoff data such as:
  - project name and work directory
  - run/startup/target URLs
  - changed files
  - completed tasks
  - acceptance criteria
  - verification commands
  - HTTP/API checks
  - browser checks
  - adversarial browser probe templates
  - project-agent summaries and risks
- It preserves explicitly requested checks and infers additional required checks from available evidence surfaces:
  - `commands`
  - `http`
  - `browser_e2e`
  - `screenshots`
  - `console_errors`
  - `browser_snapshots`
  - `browser_console_logs`
  - `browser_network_logs`
  - `browser_trace`
  - `browser_har`
  - `adversarial`
- It records handoff metadata without touching the collaboration module.

## Files

- `backend/test-agent/work-order-builder.ts`
- `backend/test-agent/self-test.ts`
- `backend/test-agent/index.ts`

## Validation

- Independent TestAgent compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Full TestAgent self-test matrix passed:
  - 28 pass
  - New `handoff-builder` self-test passed.
  - `standalone-cli-real-web` still passed.
  - `real-playwright-browser` still passed.

## Remaining

- Wire group-main-agent to this builder later, once collaboration code is ready.
- Add UI/report affordances for showing the generated work order before execution.
- Keep the builder independent until group-chat integration begins.
