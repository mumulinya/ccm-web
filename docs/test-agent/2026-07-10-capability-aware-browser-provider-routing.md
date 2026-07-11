# Capability-Aware Browser Provider Routing

Date: 2026-07-10

## Goal

Make CCM TestAgent choose a browser provider for each individual browser check before execution.
A mixed work order can now use MCP for checks that MCP can prove and Playwright for checks that
require deterministic browser-context or DOM control.

Reference:

- `D:\claude-code\src\tools\AgentTool\built-in\verificationAgent.ts`

The reference verifier requires checking the tools that are actually available, using browser
automation instead of declaring that a real browser is unavailable, and falling back when a
provider cannot perform the required verification.

This milestone changes only:

- `backend/test-agent/**`
- `docs/test-agent/**`

No collaboration or group-chat source file was modified.

## Previous Gap

The provider chain executed all standard checks with the preferred provider as one batch.
It tried the next provider only when every result in the batch was `blocked`.

For a preferred MCP work order containing two checks, this could produce:

- a basic navigation check that passed with MCP;
- a select, upload, multi-session, authentication, or browser-context check that MCP could not
  execute deterministically;
- no Playwright fallback, because the batch contained one passing result.

The result was an avoidable failed or blocked delivery even though Playwright was available.

## Routing Rules

Added `browserProviderRouteForCheck` and `browserCheckRequiresPlaywright`.

For every browser check, the planner now selects one initial route:

| Condition | Planned provider | Reason |
| --- | --- | --- |
| Browser provider disabled | `none` | `provider_disabled` |
| Existing authenticated Chrome session | `mcp` | `existing_authenticated_session` |
| Preferred MCP, but check requires deterministic Playwright capability | `playwright` | `capability_requires_playwright` |
| Preferred MCP and check is compatible | `mcp` | `preferred_provider` |
| Preferred Playwright | `playwright` | `preferred_provider` |
| Automatic provider selection | `playwright` | `auto_default` |

Existing authenticated sessions remain MCP-owned because Playwright cannot attach to the user's
already authenticated Chrome profile.

## Playwright Requirements

A standard browser check is routed to Playwright before execution when it uses:

- isolated multi-session scenarios;
- stability reruns with fresh contexts;
- credential environment bindings or storage-state authentication;
- viewport, device, locale, timezone, permissions, geolocation, or other context options;
- explicit browser video capture;
- actions that require deterministic local browser control, such as upload, drag, advanced mouse,
  focus, clipboard, online/offline, history navigation, or select-option operations;
- assertions that require deterministic DOM/browser state, including selected values, input state,
  attributes, computed style, element counts, dialogs, popups, tables, clipboard, accessibility,
  ARIA state, viewport/overflow, storage, cookies, or downloaded files.

`collectBrowserArtifacts` does not by itself force Playwright. It is enabled by default, and MCP can
still preserve screenshots, page snapshots, console/network telemetry, and tool transcripts.
Execution-plan warnings continue to explain that Playwright is required for trace/HAR artifacts.
Explicit video capture does require Playwright.

## Side-Effect Safety

Capability routing happens before a check starts. An advanced check is not first partially executed
by MCP and then replayed from the beginning in Playwright.

This matters for checks containing clicks, submissions, creation requests, or other mutating
operations. Blind post-failure replay could duplicate a real product action.

Unknown runtime failures remain visible as blocked/provider-gap evidence. TestAgent only uses the
existing provider-chain fallback when a routed provider produced no usable result for that route;
it does not replay a mixed partially executed batch after a successful side effect.

## Execution Plan

Every planned browser check now includes:

- `plannedProvider`;
- `providerRoutingReason`.

The plan summary includes:

- `browserPlannedPlaywrightChecks`;
- `browserPlannedMcpChecks`;
- `browserCapabilityRoutedChecks`;
- `browserExistingSessionRoutedChecks`.

CLI plan output prints the aggregate counts and up to eight concrete routes:

```text
Browser provider routing plan: playwright:1 mcp:1 capabilityFallback:1 existingSession:0
- Browser route: project / Advanced selector -> playwright (capability_requires_playwright)
```

Existing provider warnings remain available for the exact action, assertion, context, or artifact
that caused the capability decision.

## Runtime Evidence

No new report contract field was required. Existing evidence surfaces already prove the executed
route:

- each `browserResult` records its actual provider;
- `browserProviderSummary` records selected and attempted providers plus fallback usage;
- browser tool transcripts show that MCP received only its routed checks;
- Playwright steps, screenshots, telemetry, and artifacts prove the advanced check ran in a real
  browser;
- the artifact verifier independently rebuilds provider summary counts from browser results.

The TestAgent profile now declares:

- `browser_capability_aware_provider_routing`;
- `browser_check_level_provider_fallback`.

## Self-Test

Added:

- `backend/test-agent/browser/provider-routing.ts`;
- `backend/test-agent/browser/provider-routing-self-test.ts`;
- `runTestAgentCapabilityAwareProviderRoutingSelfTest`.

The self-test starts a real local page and combines two checks in one preferred-MCP work order:

1. A basic status-page check is executed by a simulated MCP browser provider.
2. A `selectOption` plus `selectedValue` check is routed to real Playwright.

It proves:

- both checks pass;
- MCP receives only the basic route and never receives the advanced URL;
- Playwright changes the real select element and verifies its resulting DOM state;
- execution-plan routes and reasons are correct;
- provider summary selects both `mcp` and `playwright` and reports fallback usage;
- acceptance criteria are fully verified;
- provider gaps are empty after successful capability routing;
- CLI and Markdown expose the dual-provider execution;
- report contract and artifact verification pass.

## Verification

Passed:

- TestAgent-only TypeScript dependency-closure check;
- capability-aware provider routing self-test;
- MCP provider self-test with default artifact collection;
- Computer Use MCP self-test;
- browser provider preflight self-test;
- browser provider gap summary self-test;
- execution-plan and CLI self-tests;
- preferred-MCP browser stability self-test with three real Playwright runs;
- mixed Playwright plus existing authenticated MCP session routing self-test;
- real Playwright browser self-test;
- artifact verifier self-test;
- `git diff --check -- backend/test-agent docs/test-agent`.

The long-term independent TestAgent goal remains active for later verification milestones and final
group-agent integration.
