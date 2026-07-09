# Upload And Download Required Coverage

## Summary

Added dedicated required-check coverage for browser upload and download verification. TestAgent now treats file transfer flows as concrete browser behavior instead of letting generic browser evidence or missing artifacts blur the result.

## Changed

- Added `browserUploadSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserDownloadSignal(...)` in `backend/test-agent/required-checks.ts`.
- Mapped upload checks such as:
  - `browser_upload`
  - `file_upload`
  - `upload`
  - `upload_assertions`
- Mapped download checks such as:
  - `browser_download`
  - `file_download`
  - `download`
  - `download_assertions`

## Evidence Rules

- `browser_upload` requires a passing `uploadFile` browser action.
- Failed `uploadFile` actions mark upload requirements as `not_verified`.
- `browser_download` accepts either:
  - a passing `downloadedFile` browser assertion,
  - or a saved download artifact.
- Failed `downloadedFile` assertions mark download requirements as `not_verified`, even when no download artifact was produced.
- A generic passing browser check does not prove upload or download behavior.

## Why

Upload and export/download flows are easy to over-claim if TestAgent only checks that a page renders. The group main agent needs to know whether the user-facing transfer actually happened in the browser:

- upload input received a file,
- application consumed it,
- download event produced the expected file,
- failed transfer assertions are visible as failed required checks.

## Verification

Extended `runTestAgentRequiredCheckCoverageSelfTest` with fixtures that verify:

- generic browser evidence leaves upload/download unknown,
- passing `uploadFile` verifies `browser_upload`,
- failed `uploadFile` marks `browser_upload` as `not_verified`,
- passing `downloadedFile` plus a download artifact verifies `browser_download`,
- failed `downloadedFile` marks `browser_download` as `not_verified`.
