# Auto Browser Smoke Checks

## Completed

Added an independent auto-browser smoke check builder for projects that provide a `targetUrl` but do not provide explicit `browserChecks`.

This keeps the TestAgent useful for early group-agent integration: the group main agent can hand over a project URL and acceptance context first, then add richer browser scripts later.

## Behavior

When a project has no explicit browser checks or adversarial browser checks, TestAgent now generates:

- a browser `goto` to the project `targetUrl`
- a short wait for the page to settle
- a DOM/body content assertion
- console error verification
- network error verification
- screenshot capture
- page snapshot, console log, and network log artifacts

The generated check is marked with:

```text
probeType = auto_target_url_smoke
```

## Boundaries

Explicit checks always win. If the work order includes `browserChecks` or `adversarialBrowserChecks`, TestAgent runs those instead of generating an auto smoke check.

The auto smoke check proves the page opens and produces basic browser evidence. It does not replace task-specific functional flows such as login, save, checkout, drag/drop, or multi-user collaboration. Those should still be passed as explicit browser checks or adversarial browser probe templates.

## MCP Support

MCP browser adapters now support the auto smoke `jsTruthy` page-content assertion by falling back to page snapshot/text when the expression is a DOM-content style assertion.

This lets Playwright MCP, Claude in Chrome, and Chrome DevTools style providers pass the auto smoke check when they can read page text or snapshots.

## Verification

Added `runTestAgentAutoBrowserSmokeSelfTest`.

The self-test sends only a `targetUrl` with no explicit `browserChecks`, runs through the MCP provider, and verifies:

- one auto browser result is produced
- the result is marked `auto_target_url_smoke`
- page text evidence is captured
- screenshot, page snapshot, console log, and network log artifacts are present
- required check coverage is verified for browser, screenshots, console, snapshots, and telemetry logs
