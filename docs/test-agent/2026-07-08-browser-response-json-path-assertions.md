# Browser Response JSON-Path Assertions

## Goal

Let TestAgent verify what the browser received from an API response during a real UI flow. Together with request metadata assertions, this closes the loop for UI-driven API verification:

- The UI sent the expected request.
- The API returned the expected structured response.
- The page reflected the response in visible state.

## Response Metadata

Playwright browser verification now records `response_details` telemetry lines alongside existing `response` status lines.

Example:

```text
response 201 fetch http://127.0.0.1:5173/api/tasks
response_details 201 fetch http://127.0.0.1:5173/api/tasks headers={"content-type":"application/json"} body={"ok":true,"saved":{"title":"Buy milk","id":7}}
```

Network summaries still count only the original `response ...` line, so response totals are not doubled by metadata.

## Assertions

The existing `networkResponse` and `networkResponseNot` assertions now support the same structured body fields as request assertions:

- `bodyIncludes` / `body_includes`
- `bodyJsonPath` / `body_json_path`
- `bodyJsonEquals` / `body_json_equals`
- `bodyJsonIncludes` / `body_json_includes`
- `headerName` / `header_name`
- `headerValueIncludes` / `header_value_includes`

Examples:

```json
{ "type": "networkResponse", "status": 201, "resourceType": "fetch", "urlIncludes": "/api/tasks", "bodyJsonPath": "saved.title", "bodyJsonEquals": "Buy milk" }
```

```json
{ "type": "networkResponse", "status": 201, "resourceType": "fetch", "urlIncludes": "/api/tasks", "bodyJsonPath": "saved.id", "bodyJsonEquals": 7 }
```

```json
{ "type": "networkResponseNot", "status": 201, "resourceType": "fetch", "urlIncludes": "/api/tasks", "bodyJsonPath": "error", "settleMs": 250 }
```

## Changes

- Added `response_details` parsing in the shared browser network matcher.
- Added Playwright response metadata capture for fetch/XHR/JSON/text responses.
- Reused existing header/body/JSON-path assertion fields for response assertions.
- Kept network summary counts stable by only counting raw `response ...` lines.
- Extended real browser coverage to verify response JSON boolean, string, number, nested object, and negative path checks.
- Extended MCP provider self-test coverage for compatible `response_details` logs.

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
- Full TestAgent self-test matrix: 45/45 PASS

## Follow-up

- Add configurable response body capture limits per work order.
- Add redaction rules for response bodies when projects need to avoid storing sensitive values in artifacts.
