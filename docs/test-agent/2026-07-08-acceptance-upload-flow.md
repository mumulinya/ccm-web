# Acceptance Upload Flow

## Goal

Make TestAgent infer upload browser checks directly from acceptance criteria. This builds on the manual `uploadFile` action so a project handoff can describe the upload feature in plain acceptance text and still get a real browser verification.

## Supported Shape

Example criterion:

```text
At /upload, upload "notes.txt" containing "Ship TestAgent upload payload" to "Attachment", click "Upload", then shows "Uploaded notes.txt: Ship TestAgent upload payload".
```

Generated browser flow:

- `goto` the explicit route.
- Upload an in-memory file to the quoted input label.
- Click the quoted submit button.
- Assert final page text, URL, console, and network health.
- Capture screenshot and page snapshots.

## Changes

- Added `backend/test-agent/browser/acceptance-upload-flows.ts`.
- Added `ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE`.
- Exported `buildAcceptanceUploadFlows` and `buildAcceptanceUploadFlowBrowserChecks`.
- Wired upload flows into `buildBrowserChecksForProject`.
- Upload flows are included before remaining path smoke checks, and same-route smoke checks are skipped to keep evidence focused.
- Added `runTestAgentAcceptanceUploadFlowSelfTest` with a real local upload page and no explicit `browserChecks`.

## Verification

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentAcceptanceUploadFlowSelfTest`: PASS
  - `runTestAgentPlaywrightFileUploadSelfTest`: PASS
- Full TestAgent self-test matrix: 53/53 PASS

## Follow-up

- Expand parser coverage for unquoted field labels and submit buttons.
- Add multi-file upload generation if a future project needs it.
