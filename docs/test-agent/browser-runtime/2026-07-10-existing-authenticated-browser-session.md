# TestAgent Existing Authenticated Browser Session

Date: 2026-07-10

## Goal

Allow the standalone TestAgent to verify OAuth/SSO and other browser behavior that depends on the user's already authenticated Chrome profile. This milestone remains inside `backend/test-agent/**` and `docs/test-agent/**`; it does not modify group collaboration code.

## Claude Code References

The implementation follows these Claude Code patterns:

- `D:\claude-code\src\utils\claudeInChrome\prompt.ts`
  - Use an isolated browser for ordinary development verification.
  - Use Claude in Chrome when verification needs the user's real authenticated Chrome session.
  - Call `tabs_context_mcp` at the start of the session.
  - Create a new tab instead of reusing a tab ID from the existing context.
- `D:\claude-code\src\commands\init-verifiers.ts`
  - Distinguish form credentials, API tokens, and OAuth/SSO.
  - Require a post-login product indicator as executable proof.
- `D:\claude-code\src\tools\AgentTool\built-in\verificationAgent.ts`
  - Execute the real browser behavior.
  - Do not accept code inspection or an implementation summary as completion evidence.

## Work Order Contract

```json
{
  "name": "Authenticated collaboration workspace",
  "url": "https://app.example.test/workspace",
  "authentication": {
    "mode": "existing_session",
    "provider": "claude-in-chrome",
    "evidencePolicy": "minimal"
  },
  "actions": [
    { "type": "goto", "url": "https://app.example.test/workspace" }
  ],
  "assertions": [
    { "type": "text", "text": "Workspace ready" },
    { "type": "consoleNoErrors" },
    { "type": "networkNoErrors" }
  ]
}
```

Supported providers:

- `auto`
- `claude-in-chrome`
- `chrome-devtools`

Supported evidence policies:

- `minimal` is the default and privacy-first mode.
- `full` explicitly retains normal browser evidence and MCP call details.

Aliases include `oauth`, `sso`, `authenticated_chrome`, `chrome_extension`, `devtools`, and `privacy_first`.

Existing-session authentication cannot be combined with:

- credential environment bindings
- `storageStatePath` or `authStatePath`
- isolated multi-session scenarios
- repeated stability runs
- inline credentials, cookies, tokens, or browser state

## Provider Routing

Browser provider selection is now per check group:

- Public and managed-authentication checks continue through the configured Playwright/MCP preference and fallback chain.
- Existing-session checks are routed to authenticated Chrome MCP tools.
- A single work order can therefore run a public check with native Playwright and an OAuth/SSO check with Claude in Chrome.
- Playwright returns an explicit blocked result when called directly for an existing-session check because its browser profile is isolated.
- Provider summaries expose both `selectedProvider` for compatibility and `selectedProviders` for mixed-provider execution.

## Session Preparation

Claude in Chrome:

1. Call `tabs_context_mcp`.
2. Require `tabs_create_mcp`.
3. Create a new tab for the check target.
4. Propagate the new tab ID only inside live tool calls.
5. Execute actions and assertions in memory.

Chrome DevTools:

1. Call `list_pages`.
2. Require `new_page`.
3. Create one new page for the check target.
4. Execute later actions against the newly selected page.

A passed existing-session result must prove both `tabContextChecked=true` and `createdNewTab=true`.

## Minimal Evidence Safety

Assertions still execute against page text, console messages, and network requests in memory. Minimal mode does not persist:

- final tab URL or title
- page text preview or page snapshots
- console/network request bodies
- screenshots or failure screenshots
- accessibility snapshots
- console, dialog, popup, or network logs
- trace, HAR, video, or browser evidence containers
- MCP input values, output text, or raw provider errors
- tab IDs

The MCP transcript keeps only:

- tool name
- input key names
- a safe action token when available
- status and timing
- a fixed suppression marker

Authentication evidence contains:

- concrete provider
- evidence policy
- whether tab context was checked
- initial tab count
- whether a new tab was created
- page/console/network observation counts
- screenshot and transcript suppression flags

Contract validation and artifact verification reject tampered minimal reports or transcripts that reintroduce raw page, telemetry, tab, or tool-call details.

## External OAuth Targets

A pure existing-session project with no local dev-server command and no explicit HTTP checks no longer performs anonymous readiness or automatic page HTTP probes. An OAuth-protected URL may be unreachable or unauthorized outside the authenticated browser and that is not evidence of product failure.

Mixed projects, local projects with a dev-server command, and projects with explicit HTTP/API checks retain the normal readiness and HTTP verification behavior.

## Main Files

- `backend/test-agent/browser/existing-session.ts`
- `backend/test-agent/browser/existing-session-self-test.ts`
- `backend/test-agent/browser/mcp-adapters.ts`
- `backend/test-agent/browser/mcp-provider.ts`
- `backend/test-agent/browser/playwright-provider.ts`
- `backend/test-agent/browser/registry.ts`
- `backend/test-agent/browser/tool-executor.ts`
- `backend/test-agent/browser/authentication-summary.ts`
- `backend/test-agent/contract/schema.ts`
- `backend/test-agent/artifact-verifier.ts`
- `backend/test-agent/dev-server.ts`
- `backend/test-agent/http-verifier.ts`
- `backend/test-agent/execution-plan.ts`

## Verification

Scoped TypeScript:

```powershell
.\node_modules\.bin\tsc.cmd --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Regression matrix result:

```text
TestAgent self-test matrix: passed
Total: 14, passed: 14, failed: 0
```

The matrix covered:

- managed environment credential login
- Playwright storage-state multi-session authentication
- existing-session normalization and conflicts
- Claude in Chrome minimal and full evidence
- missing `tabs_context_mcp` blocking
- Chrome DevTools `list_pages -> new_page`
- mixed native Playwright and authenticated MCP routing
- MCP provider compatibility
- provider preflight and execution planning
- required `browser_auth` coverage
- report contract validation
- artifact integrity and tamper rejection

## Integration Boundary

The future group collaboration integration only needs to construct this browser check in the TestAgent work order and supply:

- project directory
- running URL
- acceptance criterion and post-login indicator
- preferred existing-session provider
- evidence policy
- browser MCP executor

No group collaboration code was added or changed by this milestone.
