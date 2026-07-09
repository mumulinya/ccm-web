# MCP Failure Screenshots

## Summary

Added automatic failure screenshots for the MCP browser provider. TestAgent now asks the active MCP browser adapter for a screenshot when a browser action/assertion fails and normal screenshots were disabled for the check.

## Added

- New helper:
  - `backend/test-agent/browser/mcp-failure-screenshots.ts`
- MCP provider integration:
  - `backend/test-agent/browser/mcp-provider.ts`
- New capability profile entry:
  - `mcp_failure_screenshot_artifacts`
- New self-test:
  - `runTestAgentMcpFailureScreenshotSelfTest`

## Behavior

When an MCP browser check fails and `screenshot: false`, TestAgent calls the matched adapter's `captureScreenshot` method and normalizes the returned capture through the existing screenshot artifact pipeline.

The resulting screenshot is recorded in:

- `browserResults[].screenshots`
- `artifact-manifest.json`
- failure summary evidence

This mirrors the Playwright provider's failure screenshot behavior while still respecting normal screenshot capture: if a check already requested screenshots, TestAgent does not add a duplicate failure-only capture.

## Verification

The self-test uses a fake Playwright MCP adapter path with:

- passing navigation,
- failing text assertion,
- `screenshot: false`,
- a data URL PNG returned from `browser_take_screenshot`.

It verifies that the report fails, a local PNG screenshot is written, the manifest lists it, artifact verification validates PNG metadata, and the failure summary references the screenshot path.
