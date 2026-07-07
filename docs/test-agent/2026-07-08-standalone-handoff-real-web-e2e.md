# Standalone Handoff Real Web E2E

## Completed

- Added a process-level self-test for the future group-main-agent handoff path:
  - `node <compiled>/test-agent/cli.js --from-handoff <handoff.json> --summary`
- The self-test generates a temporary web fixture, writes a group-main-agent style handoff JSON file, and verifies that TestAgent can:
  - convert the handoff into a work order
  - run a verification command
  - start the fixture web server
  - probe the page over HTTP
  - drive a real Playwright browser flow
  - fill a task input
  - click the add button
  - reload the page
  - verify persisted `localStorage`
  - collect screenshots, page snapshots, console logs, network logs, trace, and HAR evidence
  - verify the generated `artifact-manifest.json`
- The test also checks that handoff metadata survives into the report:
  - `taskId`
  - `groupId`
  - `handoffSource`
  - `completedByProjectAgents`
- Tightened the fixture browser locator by using exact label matching for `Task`, because non-exact label matching can also match `aria-label="Saved task list"` in Playwright strict mode.

## Files

- `backend/test-agent/self-test.ts`
- `backend/test-agent/index.ts`

## Validation

- Targeted self-test passed:
  - `runTestAgentStandaloneHandoffRealWebSelfTest()`
  - report status: `passed`
  - required checks verified: `commands`, `http`, `browser_e2e`, `screenshots`, `console_errors`, `browser_snapshots`, `browser_console_logs`, `browser_network_logs`, `browser_trace`, `browser_har`
  - artifact verification exit code: `0`
- Full TestAgent self-test matrix passed:
  - 29 pass
  - New `standalone-handoff-real-web` self-test passed.
  - `standalone-cli-real-web` still passed.
  - `real-playwright-browser` still passed.
- Independent TestAgent compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`

## Remaining

- Add a checked-in handoff example once the group-main-agent handoff contract is stable.
- Later wire group-chat orchestration to call this CLI path.
- Keep the real browser handoff self-test as the regression gate for that future integration.
