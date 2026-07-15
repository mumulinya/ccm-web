# Structured Browser Network Assertions

## Goal

Make TestAgent verify browser API evidence with structured fields instead of only raw string fragments. This is useful for group-main-agent handoff payloads such as:

```json
{ "type": "networkResponse", "status": 201, "resourceType": "fetch", "urlIncludes": "/api/tasks" }
```

## Changes

- Added `backend/test-agent/browser/network-assertions.ts` to parse browser telemetry lines and match structured request/response expectations.
- Added browser assertion types:
  - `networkRequest`
  - `networkResponse`
- Kept existing compatibility for:
  - `networkRequestIncludes`
  - `networkResponseIncludes`
- Normalized handoff/work-order fields including `method`, `status`, `status_code`, `resourceType`, `resource_type`, `urlIncludes`, and `url_includes`.
- Reused the parser in browser network summaries so assertion matching and evidence reporting use the same telemetry interpretation.
- Added contract/schema support and updated the web-app handoff example with structured API evidence assertions.
- Updated Playwright and MCP browser providers to share the same matcher.
- Computer Use MCP now reports structured network assertions as unsupported because it does not expose network telemetry.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

```powershell
node -e "require('module').Module._initPaths(); const tests=require(process.env.TEMP + '/ccm-test-agent-compiled-runtime/test-agent/self-test.js'); (async()=>{ for (const name of ['runTestAgentStructuredBrowserNetworkAssertionSelfTest','runTestAgentMcpProviderSelfTest']) { const r=await tests[name](); const pass=!!(r===true || r?.pass); console.log((pass?'PASS':'FAIL')+' '+name); if(!pass) process.exitCode=1; } })().catch(err=>{ console.error(err); process.exit(1); })"
```

Results:

- `runTestAgentStructuredBrowserNetworkAssertionSelfTest`: PASS
- `runTestAgentMcpProviderSelfTest`: PASS

## Follow-up

- Add request header/body assertions when Playwright telemetry captures enough request metadata.
- Add negative network assertions, such as proving that an unwanted endpoint was not called.
- Add richer MCP URL refresh support when adapters can expose current URL after in-page navigation.
