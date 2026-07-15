# Playwright Failure Screenshots

## Summary

Added automatic Playwright failure screenshots for browser checks that fail while normal screenshots are disabled. This gives TestAgent a concrete visual artifact for failed real-browser verification even when the work order did not request screenshots.

## Added

- New helper:
  - `backend/test-agent/browser/failure-screenshots.ts`
- New capability profile entry:
  - `browser_failure_screenshot_artifacts`
- New self-test:
  - `runTestAgentPlaywrightFailureScreenshotSelfTest`

## Behavior

When a Playwright browser check has a failed action/assertion and neither `check.screenshot` nor required checks ask for screenshots, TestAgent writes:

```text
screenshots/<project>-<check>-<index>-<failed-step>.failure.png
```

The path is included in `browserResults[].screenshots`, the artifact manifest, and the browser failure summary evidence.

This intentionally avoids adding an extra duplicate screenshot when normal screenshots are already requested.

## Verification

The self-test starts a local page, disables screenshots, runs a failing text assertion, and verifies:

- the browser result fails,
- exactly one `.failure.png` screenshot exists,
- the manifest lists it as a screenshot,
- artifact verification validates the PNG metadata,
- the failure summary references the screenshot path.
