# Playwright Download Artifacts

## Goal

Let TestAgent verify export/download features in a real browser session. This covers flows where code renders a button, but the actual user-facing requirement is that clicking it downloads the right file with the right content.

## New Assertion

- `downloadedFile`

Examples:

```json
{ "type": "downloadedFile", "fileName": "tasks.csv", "contentIncludes": "Ship TestAgent" }
```

```json
{ "assertion": "download", "filename_includes": ".csv", "min_bytes": 20 }
```

## Changes

- Added work-order aliases:
  - `downloaded_file`
  - `download`
  - `browser_download`
  - `file_download`
- Added filename, content, and minimum-size fields for browser download assertions.
- Playwright browser contexts now enable `acceptDownloads`.
- Playwright provider listens for `download` events, saves downloaded files under `browser-artifacts/downloads`, and records them as `download` browser artifacts.
- `downloadedFile` waits for the saved file and can verify:
  - exact filename
  - filename substring
  - downloaded text content substring
  - minimum byte size
- Required-check coverage now recognizes `browser_download` and `download`.
- MCP browser adapters explicitly report downloaded-file verification as unsupported because they do not expose local downloaded file paths.
- Added `runTestAgentPlaywrightDownloadArtifactSelfTest` with a real Blob-backed CSV export flow.

## Verification

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentPlaywrightDownloadArtifactSelfTest`: PASS
  - `runTestAgentBrowserEvidenceArtifactSelfTest`: PASS
- Full TestAgent self-test matrix: 50/50 PASS

## Follow-up

- Add binary-aware assertions for PDF/ZIP exports if future project tests need more than filename and size.
- Add acceptance-derived export-flow inference for criteria such as "click Export and downloads CSV".
