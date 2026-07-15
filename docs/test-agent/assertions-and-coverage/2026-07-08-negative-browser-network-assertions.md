# Negative Browser Network Assertions

## Goal

Let TestAgent prove that unwanted browser network calls did not happen during a real UI flow. This helps validate requirements such as "saving a task must call `/api/tasks` and must not call `/api/debug` or tracking endpoints."

## New Assertions

- `networkRequestNot`
- `networkResponseNot`
- `networkRequestNotIncludes`
- `networkResponseNotIncludes`

Structured examples:

```json
{ "type": "networkRequestNot", "method": "POST", "urlIncludes": "/api/debug", "settleMs": 250 }
```

```json
{ "type": "networkResponseNot", "status": 500, "resourceType": "fetch", "urlIncludes": "/api/debug" }
```

Legacy string-fragment example:

```json
{ "type": "networkRequestNotIncludes", "text": "POST http://127.0.0.1:5173/api/debug" }
```

## Changes

- Extended the shared browser network assertion parser/matcher to support negative request and response checks.
- Added `settleMs` / `settle_ms` for absence checks. Passing negative assertions default to a short 500ms quiet window unless overridden.
- Added work-order aliases such as `network_request_absent`, `request_not_includes`, and `response_absent`.
- Updated Playwright browser provider to fail negative assertions immediately if matching telemetry appears, otherwise pass after the settle window.
- Updated MCP browser adapters to evaluate negative assertions from provider network logs.
- Computer Use MCP continues to report network assertions as unsupported because it cannot expose network telemetry.
- Added a real Playwright self-test that clicks a page, verifies `/api/tasks` was called, and proves `/api/debug` was not called.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Result:

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentNegativeBrowserNetworkAssertionSelfTest`: PASS
  - `runTestAgentStructuredBrowserNetworkAssertionSelfTest`: PASS
  - `runTestAgentMcpProviderSelfTest`: PASS
- Full TestAgent self-test matrix: 44/44 PASS

## Follow-up

- Add request header/body assertions so negative checks can prove a sensitive payload was not sent.
- Consider route-scoped network assertions when a check spans multiple pages in one browser session.
