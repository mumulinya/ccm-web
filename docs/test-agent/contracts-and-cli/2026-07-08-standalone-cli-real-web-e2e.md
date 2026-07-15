# Standalone CLI Real Web E2E

## Completed

- Added a process-level standalone CLI self-test for a real generated web app fixture.
- The self-test writes a `work-order.json`, then executes the compiled CLI with:
  - `node <compiled>/test-agent/cli.js <work-order.json> --summary`
- The generated web app is started by TestAgent from the work order `runCommand`.
- The CLI run verifies:
  - a command check
  - HTTP page probing
  - a real Playwright browser flow
  - filling a task input
  - clicking an add button
  - reloading the page
  - verifying persisted `localStorage`
  - screenshots
  - page snapshots
  - console and network logs
  - Playwright trace and HAR artifacts
- The same self-test then executes the CLI artifact verifier against the generated `artifact-manifest.json`.

## Files

- `backend/test-agent/self-test.ts`
- `backend/test-agent/index.ts`

## Validation

- Independent TestAgent compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Full TestAgent self-test matrix passed:
  - 27 pass
  - New `standalone-cli-real-web` self-test passed.
  - `real-playwright-browser` passed.
- The standalone CLI self-test proves the independent TestAgent can receive a work order, start a web app, drive a browser, verify feature completion, write evidence, and verify its artifact bundle without group-chat integration.

## Remaining

- Add a stable checked-in work-order example for group-main-agent handoff once the collaboration contract is ready.
- Add UI-facing affordances for opening artifact manifest entries after group-chat integration.
- Keep collaboration code untouched until the group orchestrator wiring phase.
