# Acceptance Download Flow

## Goal

Make TestAgent infer export/download browser checks directly from acceptance criteria. This turns a requirement like "click Export and downloads tasks.csv" into a real browser download verification without requiring the handoff to provide explicit `browserChecks`.

## Supported Shape

Example criterion:

```text
At /exports, click "Export CSV", then downloads "tasks.csv" containing "Ship TestAgent".
```

Generated browser flow:

- `goto` the explicit route.
- Click the quoted button name.
- Assert `downloadedFile` with filename and optional content substring.
- Assert URL, console, and network health.
- Capture screenshot and download artifact evidence.

## Changes

- Added `backend/test-agent/browser/acceptance-download-flows.ts`.
- Added `ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE`.
- Exported `buildAcceptanceDownloadFlows` and `buildAcceptanceDownloadFlowBrowserChecks`.
- Wired download flows into `buildBrowserChecksForProject`.
- Download flows are generated before remaining path smoke checks, and same-route smoke checks are skipped to keep evidence focused.
- Added `runTestAgentAcceptanceDownloadFlowSelfTest` with a real Blob-backed CSV export page and no explicit `browserChecks`.

## Verification

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentAcceptanceDownloadFlowSelfTest`: PASS
  - `runTestAgentPlaywrightDownloadArtifactSelfTest`: PASS
- Full TestAgent self-test matrix: 51/51 PASS

## Follow-up

- Expand parser coverage for unquoted button names and extension-only criteria.
- Add binary-aware assertions for PDF/ZIP exports when needed.
