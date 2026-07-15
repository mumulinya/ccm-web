# Playwright Multi-File Upload

## Goal

Extend TestAgent upload verification from single-file inputs to `multiple` file inputs. This lets a project handoff verify attachment batches, gallery uploads, and multi-document import flows in a real browser session.

## New Shapes

Single-file upload still works:

```json
{ "type": "uploadFile", "label": "Attachment", "fileName": "notes.txt", "fileContent": "hello" }
```

Multi-file upload:

```json
{
  "action": "upload_file",
  "label": "Attachments",
  "files": [
    { "file_name": "notes.txt", "file_content": "first file", "media_type": "text/plain" },
    { "file_name": "meta.json", "file_content": "{\"ok\":true}", "media_type": "application/json" }
  ]
}
```

Path-based multi-file upload:

```json
{ "type": "uploadFile", "label": "Attachments", "file_paths": ["fixtures/a.txt", "fixtures/b.txt"] }
```

## Changes

- Added `files`, `filePaths`, and `file_paths` to `BrowserActionSpec`.
- Work-order normalization now preserves per-file path/name/content/media type fields.
- Playwright `uploadFile` now passes an array to `setInputFiles` when multiple files are provided.
- Single-file upload behavior remains unchanged.
- Browser action detail now lists all uploaded file names.
- Added `runTestAgentPlaywrightMultiFileUploadSelfTest` with a real `<input type="file" multiple>` page that reads two uploaded files and verifies both names and contents.

## Verification

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentPlaywrightMultiFileUploadSelfTest`: PASS
  - `runTestAgentPlaywrightFileUploadSelfTest`: PASS
- Full TestAgent self-test matrix: 54/54 PASS

## Follow-up

- Add acceptance-derived multi-file upload inference if future handoffs need it.
- Add binary buffer upload support beyond UTF-8 text payloads.
