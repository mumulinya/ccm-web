# Browser Evidence Artifacts

## Completed

- Added a `browserArtifacts` result channel for richer browser evidence beyond screenshots and page snapshots.
- Added browser artifact manifest support for:
  - `browser_trace`
  - `browser_har`
  - `browser_video`
  - `browser_artifact`
- Added manifest summary counters for traces, HARs, videos, and generic browser artifacts.
- Added required-check coverage rules for:
  - `browser_trace`
  - `browser_har`
  - `browser_video`
  - `browser_artifacts`
- Added a dedicated artifact normalizer for provider-returned browser evidence:
  - Copies existing provider files into the TestAgent artifact directory.
  - Writes trace/HAR/video data URLs or base64 payloads to local files.
  - Avoids treating ordinary page text or screenshots as generic browser artifacts.
- Playwright provider now records trace and HAR artifacts by default.
- Playwright video capture is supported through `options.collectBrowserVideo: true`.
- MCP provider now preserves trace/HAR/video artifacts when browser tools return those paths or payloads.

## Files

- `backend/test-agent/browser/evidence-artifacts.ts`
- `backend/test-agent/browser/mcp-provider.ts`
- `backend/test-agent/browser/playwright-provider.ts`
- `backend/test-agent/artifacts.ts`
- `backend/test-agent/result-builder.ts`
- `backend/test-agent/required-checks.ts`
- `backend/test-agent/types.ts`
- `backend/test-agent/work-order.ts`
- `backend/test-agent/contract/schema.ts`
- `backend/test-agent/self-test.ts`

## Validation

- Independent TestAgent compile passed:
  - `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Full TestAgent self-test matrix passed:
  - 26 pass
  - New `browser-evidence-artifacts` self-test passed.
  - `real-playwright-browser` passed with Playwright trace/HAR collection enabled.
- Artifact verifier passed against a manifest containing browser trace, HAR, and video entries.

## Remaining

- Run a real generated web project through the standalone TestAgent CLI and preserve its artifact bundle as a fixture.
- Add UI-facing guidance for rendering trace/HAR/video artifact links after group-chat integration is ready.
- Keep collaboration wiring separate until the group main agent contract is stable.
