# TestAgent Browser Authentication Bootstrap

Date: 2026-07-10

## Goal

Add a secure authentication bootstrap to the standalone TestAgent so it can verify real signed-in web behavior with Playwright. This milestone stays inside `backend/test-agent/**` and does not modify group collaboration code.

## Claude Code References

The design follows the verification and browser guidance in:

- `D:\claude-code\src\commands\init-verifiers.ts`
  - Ask whether browser verification requires login.
  - Identify the login URL, login method, test credential environment variables, and post-login proof.
- `D:\claude-code\src\utils\claudeInChrome\prompt.ts`
  - Prefer a real automated browser for development verification.
  - Use an authenticated browser session when OAuth or existing login state is required.
- `D:\claude-code\src\tools\AgentTool\built-in\verificationAgent.ts`
  - Execute the delivered behavior.
  - Do not treat code inspection or an implementation claim as proof.

## Work Order Contract

Credential values are referenced by environment variable name:

```json
{
  "actions": [
    { "type": "fill", "label": "Email", "valueEnv": "TEST_EMAIL" },
    { "type": "fill", "label": "Password", "valueEnv": "TEST_PASSWORD" }
  ]
}
```

Supported aliases:

- `valueEnv`
- `value_env`
- `textEnv`
- `text_env`
- `contentEnv`
- `content_env`

An action cannot define both a literal value and an environment binding. Environment bindings are limited to actions that accept user-controlled values.

File-backed authenticated state is supported at check or session level:

```json
{
  "storageStatePath": ".test/auth-state.json"
}
```

```json
{
  "sessions": [
    { "name": "alice", "storageStatePath": ".test/alice.json" },
    { "name": "bob", "storageStatePath": ".test/bob.json" }
  ]
}
```

Supported path aliases:

- `storageStatePath`
- `storage_state_path`
- `authStatePath`
- `auth_state_path`

Inline cookies, tokens, origins, or storage values are rejected. Storage-state files must be readable JSON objects, are limited to 5 MB, and may contain only array-shaped `cookies` and `origins` fields.

## Runtime Behavior

- Credential values are resolved from project environment values first, then `process.env`.
- Work orders and execution plans retain only environment variable names.
- Playwright receives credentials only when the matching action executes.
- Check-level storage state applies to a normal check and is the fallback for multi-session checks.
- Session-level storage state overrides the check-level path for that session.
- Every multi-session actor receives an isolated Playwright browser context.
- MCP browser providers return a blocked capability result for authenticated checks.
- The existing provider registry then falls back to Playwright.
- A missing credential environment variable blocks the browser check with a named-variable diagnostic.

## Evidence Safety

Environment credential values and storage-state cookie/localStorage values are held as in-memory redaction bindings. TestAgent redacts them from:

- action and assertion details/errors
- console and page errors
- dialogs and popups
- request URLs, headers, and bodies
- response URLs, headers, and bodies
- final URL, title, and page text preview
- HTML and text page snapshots
- accessibility snapshot text
- telemetry log artifacts

Authentication evidence contains only:

- credential environment variable names
- storage-state file basename
- byte size
- cookie count
- origin count
- SHA-256 digest
- whether sensitive browser artifacts were suppressed

When authentication is configured, TestAgent suppresses Playwright trace, HAR, and video collection even if the work order requested them. Screenshots remain available as visible functional evidence.

## Required Check

The following aliases map to authenticated browser coverage:

- `browser_auth`
- `browser_authentication`
- `authenticated_browser`
- `login_session`

Status mapping:

- authenticated browser result `passed` -> `verified`
- authenticated browser result `failed` -> `not_verified`
- authenticated browser result `blocked` or `skipped` -> `unknown`

This prevents a missing test credential or unreadable state file from being mislabeled as a product failure.

## Reporting And Verification

Authentication summaries are included in:

- execution-plan JSON and CLI output
- TestAgent report metadata
- CLI report summary
- Markdown report summary and browser details
- session-level browser details
- required-check evidence

The report contract validates authentication evidence and rejects raw authentication fields. The artifact verifier independently checks:

- environment variable name syntax and uniqueness
- storage-state basename, size, counts, and SHA-256
- absence of raw `path`, `cookies`, `origins`, `value`, `token`, `password`, and `username`
- agreement between context storage evidence and authentication evidence
- absence of trace/HAR/video when suppression is declared
- recomputed authentication summary consistency
- result/session evidence even when no verdict artifact is present

## Self-Tests

Three dedicated exports were added:

- `runTestAgentBrowserAuthenticationContractSelfTest`
  - Covers aliases, execution-plan counts, MCP warnings, literal/env conflicts, invalid env names, unsupported actions, and inline state rejection.
- `runTestAgentPlaywrightAuthenticationSelfTest`
  - Starts a real login server.
  - Uses `TEST_EMAIL` and `TEST_PASSWORD` through environment bindings.
  - Intentionally echoes credentials through console, request body, response body, page text, and accessibility evidence.
  - Proves every text artifact is redacted.
  - Proves MCP-to-Playwright fallback.
  - Proves trace/HAR/video suppression.
  - Covers a missing environment variable.
  - Tampers with report authentication evidence and proves both contract validation and artifact verification reject it.
- `runTestAgentPlaywrightMultiSessionAuthenticationSelfTest`
  - Creates independent Alice and Bob storage-state files.
  - Opens two authenticated dashboards in isolated contexts.
  - Intentionally echoes each session cookie through console and network responses.
  - Proves storage-state values are redacted and only safe metadata is reported.

## Verification Results

The scoped TypeScript build passed:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

The targeted regression matrix passed 13 of 13 tests:

- `runTestAgentBrowserAuthenticationContractSelfTest`
- `runTestAgentPlaywrightAuthenticationSelfTest`
- `runTestAgentPlaywrightMultiSessionAuthenticationSelfTest`
- `runTestAgentExecutionPlanSelfTest`
- `runTestAgentContractSelfTest`
- `runTestAgentArtifactVerifierSelfTest`
- `runTestAgentRequiredCheckCoverageSelfTest`
- `runTestAgentMultiSessionBrowserSelfTest`
- `runTestAgentBrowserStabilitySelfTest`
- `runTestAgentPlaywrightContextOptionsSelfTest`
- `runTestAgentMcpProviderSelfTest`
- `runTestAgentArtifactSelfTest`
- `runTestAgentCliSelfTest`

The two real authentication tests used the installed Microsoft Edge channel after the bundled Playwright Chromium executable was unavailable.

## Scope Boundary

This milestone changes only the standalone TestAgent implementation and `docs/test-agent/**`. Existing uncommitted files under `backend/modules/collaboration/**` belong to other work and were not edited.

## Follow-Up

The long-term TestAgent goal remains active. A later collaboration integration only needs to pass the project directory, run command, target/startup URL, acceptance criteria, required checks, credential environment variable names, and optional storage-state paths through the TestAgent work order.
