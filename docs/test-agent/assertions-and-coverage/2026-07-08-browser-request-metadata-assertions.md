# Browser Request Metadata Assertions

## Goal

Let TestAgent verify what a browser request actually sent, not just whether the request happened. This helps validate cases such as:

- A form submit sends JSON with the expected entity data.
- A request carries the expected non-sensitive header.
- A sensitive field, debug token, or password is not sent.

## New Assertion Fields

These fields apply to `networkRequest` and `networkRequestNot` assertions:

- `headerName` / `header_name`
- `headerValueIncludes` / `header_value_includes`
- `headerIncludes` / `header_includes`
- `bodyIncludes` / `body_includes`

Examples:

```json
{
  "type": "networkRequest",
  "method": "POST",
  "urlIncludes": "/api/tasks",
  "headerName": "content-type",
  "headerValueIncludes": "application/json",
  "bodyIncludes": "Buy milk"
}
```

```json
{
  "type": "networkRequestNot",
  "method": "POST",
  "urlIncludes": "/api/tasks",
  "bodyIncludes": "password",
  "settleMs": 250
}
```

## Changes

- Playwright provider now records `request_details` telemetry lines alongside existing `request` lines.
- `request_details` includes lower-cased request headers and a compact request body preview.
- Sensitive headers such as `authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-auth-token`, and `proxy-authorization` are redacted in telemetry.
- Network summaries still count only real `request ...` lines so request totals do not double-count metadata lines.
- MCP browser adapters can match the same fields when an MCP network log includes compatible metadata text.
- Added a real browser self-test that verifies JSON body content, custom request headers, and absence of sensitive request metadata.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Result:

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentBrowserRequestMetadataAssertionSelfTest`: PASS
  - `runTestAgentMcpProviderSelfTest`: PASS
  - `runTestAgentNegativeBrowserNetworkAssertionSelfTest`: PASS
  - `runTestAgentStructuredBrowserNetworkAssertionSelfTest`: PASS
- Full TestAgent self-test matrix: 45/45 PASS

## Follow-up

- Add JSON-path request body assertions for structured payload checks.
- Add allowlisted capture for specific sensitive headers when a local test explicitly needs to verify auth header shape without writing secrets into artifacts.
