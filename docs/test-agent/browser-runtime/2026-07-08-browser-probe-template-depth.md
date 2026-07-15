# Browser Probe Template Depth

## Completed

- Extended the browser probe template self-test to cover all currently supported template kinds:
  - `invalid_form_input`
  - `repeated_click`
  - `refresh_persistence`
- Added MCP browser reload handling so refresh-persistence probes can run through the independent TestAgent MCP provider path.
- Verified repeated-click probes generate multiple browser click tool calls instead of only a shallow static check.
- Verified refresh-persistence probes perform setup, reload the page, and assert saved-state text from the resulting page snapshot.

## Files

- `backend/test-agent/browser/mcp-adapters.ts`
- `backend/test-agent/self-test.ts`

## Validation

- Independent TestAgent compile:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Full TestAgent self-test matrix:
  - 25 pass
  - `browser-probe-template` now runs 3 browser checks and records 24 MCP browser tool calls
  - `real-playwright-browser` passed

## Remaining

- Add richer trace-style evidence artifacts when a provider exposes trace, HAR, or video outputs.
- Run TestAgent against a real generated web project work order once a stable sample project is available.
- Keep group-chat wiring out of this folder until the collaboration integration is ready.
