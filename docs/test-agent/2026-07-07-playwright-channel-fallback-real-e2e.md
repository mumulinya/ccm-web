# Playwright Channel Fallback and Real E2E

## Completed

Strengthened the Playwright browser provider so it can run on machines where the Playwright-managed Chromium binary is missing.

The provider now tries launch candidates in order:

1. bundled Playwright Chromium
2. system Microsoft Edge channel
3. system Chrome channel

The same fallback is used by both provider preflight and real browser execution, so a successful preflight matches the execution path.

## Report Metadata

When Playwright launches successfully, TestAgent records:

```text
metadata.playwrightLaunch.channel
metadata.playwrightLaunch.launchAttempt
metadata.playwrightLaunch.fallbackErrors
```

This makes reports explain whether the run used bundled Chromium or a system browser channel.

## Real Browser Self-Test

Added `runTestAgentPlaywrightRealBrowserSelfTest`.

The self-test starts a local HTTP app and uses the real Playwright provider to:

- open the page
- fill a labeled input
- click a role/name-located button
- verify visible text
- verify `localStorage`
- capture screenshot, page snapshots, console logs, and network logs

This is a true browser execution path, not a mocked MCP tool-call path.

## Verification

Also expanded `runTestAgentPlaywrightAvailabilitySelfTest` to prove fallback behavior with a mocked Playwright loader:

- bundled launch succeeds
- all launch attempts fail
- bundled fails and `msedge` channel succeeds
