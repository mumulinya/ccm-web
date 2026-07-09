# Browser Request JSON-Path Assertions

## Goal

Let TestAgent verify structured browser request payloads, not just raw body substrings. This makes handoff assertions from the group-main-agent more precise, for example:

```json
{
  "type": "networkRequest",
  "method": "POST",
  "urlIncludes": "/api/tasks",
  "bodyJsonPath": "task.title",
  "bodyJsonEquals": "Buy milk"
}
```

## New Fields

These fields apply to `networkRequest` and `networkRequestNot` assertions:

- `bodyJsonPath` / `body_json_path`
- `bodyJsonEquals` / `body_json_equals`
- `bodyJsonIncludes` / `body_json_includes`

Supported path shape:

- Dot paths: `task.title`
- Array indexes: `tags[1]`
- Path-only checks: `{ "bodyJsonPath": "password" }` means the path exists.

Examples:

```json
{ "type": "networkRequest", "urlIncludes": "/api/tasks", "bodyJsonPath": "task.priority", "bodyJsonEquals": 2 }
```

```json
{ "type": "networkRequest", "urlIncludes": "/api/tasks", "bodyJsonPath": "tags[1]", "bodyJsonIncludes": "urgent" }
```

```json
{ "type": "networkRequestNot", "urlIncludes": "/api/tasks", "bodyJsonPath": "password", "settleMs": 250 }
```

## Changes

- Extended the shared browser network matcher to parse request body JSON from `request_details` telemetry.
- Added equality, includes, and path-existence checks for JSON request bodies.
- Added work-order normalization and contract schema support for camelCase and snake_case fields.
- Updated the web app handoff example to show JSON-path request checks.
- Extended real Playwright browser coverage to validate nested object paths, array indexes, numeric equality, and absence of sensitive JSON paths.
- Extended MCP provider self-test coverage for compatible `request_details` network logs.

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

- Add response body JSON-path assertions if browser providers can capture fetch/XHR responses safely.
- Add artifact redaction controls if projects need to verify sensitive payload shape without storing sensitive values.
