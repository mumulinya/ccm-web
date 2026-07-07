# Acceptance-Derived Browser Assertions

## Completed

Added conservative browser assertion derivation from acceptance criteria.

This helps when the group main agent can provide a target URL and human acceptance text, but has not yet generated detailed browser actions.

## Behavior

When TestAgent auto-generates a browser smoke check from `targetUrl`, it now augments that smoke check with assertions derived from explicit acceptance text:

- quoted text becomes a visible/page text assertion
- explicit URL paths such as `/dashboard` become `urlIncludes` assertions

Example:

```text
Target URL opens with "Ready for verification" at /dashboard
```

Produces:

- `text: Ready for verification`
- `urlIncludes: /dashboard`

## Boundaries

The derivation is intentionally conservative.

It does not infer multi-step flows, click targets, form inputs, business rules, or unquoted prose. Those still belong in explicit `browserChecks`, `httpChecks`, or browser probe templates.

Explicit browser checks still win. If a work order includes `browserChecks` or `adversarialBrowserChecks`, TestAgent runs those instead of auto-generating a smoke check.

## Verification

Added coverage in:

- `runTestAgentAcceptanceDerivedChecksSelfTest`
- `runTestAgentAutoBrowserSmokeSelfTest`

The tests verify that quoted text and explicit URL paths are derived, injected into the auto smoke check, and executed through the MCP browser provider path.
