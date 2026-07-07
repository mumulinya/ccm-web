# MCP Screenshot Artifacts

## Completed

Added screenshot artifact normalization for MCP browser providers.

Previously, MCP screenshot tool output could be stored as raw stringified output such as `{"path":"..."}`. That was weak evidence because the report could claim a screenshot while pointing at metadata or a path that may not exist.

## Behavior

TestAgent now normalizes MCP screenshot captures into artifact paths:

- `data:image/...;base64,...` becomes a local image file under `artifactDir/screenshots`.
- object fields such as `image`, `base64`, `data`, or `screenshot` are inspected for base64 image payloads.
- object fields such as `path`, `filePath`, `screenshotPath`, or `imagePath` are treated as referenced paths.
- existing referenced paths are recorded directly.
- non-existing referenced paths or metadata-only outputs are written as `.capture.json` sidecar evidence.
- screenshot tool failures remain `screenshot failed: ...` so required screenshot coverage fails correctly.

## Files

- `backend/test-agent/browser/screenshot-artifacts.ts`
- `backend/test-agent/browser/mcp-provider.ts`
- `backend/test-agent/browser/mcp-adapters.ts`

## Verification

Added `runTestAgentMcpScreenshotArtifactSelfTest`.

The self-test simulates an MCP screenshot tool returning a base64 PNG, then verifies:

- a local `.png` artifact is written
- the browser result points at that artifact
- report evidence includes the artifact
- artifact manifest includes it as a `screenshot`
- required screenshot coverage is verified
