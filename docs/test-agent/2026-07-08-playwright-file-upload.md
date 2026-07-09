# Playwright File Upload

## Goal

Let TestAgent verify upload flows in a real browser session. This covers web features where the important behavior is not just rendering an upload input, but actually selecting a file and proving the app consumes it.

## New Action

- `uploadFile`

Aliases:

- `upload`
- `upload_file`
- `attach_file`
- `set_input_files`
- `file_upload`

Examples:

```json
{ "type": "uploadFile", "label": "Attachment", "filePath": "fixtures/report.txt" }
```

```json
{
  "action": "attach_file",
  "label": "Attachment",
  "file_name": "notes.txt",
  "file_content": "Ship TestAgent upload payload",
  "media_type": "text/plain"
}
```

## Changes

- Added `uploadFile` to browser action types.
- Added work-order normalization for file path, file name, content, and media type fields.
- Playwright provider now uses semantic locators and `setInputFiles`.
- Relative `filePath` values resolve from the project work directory.
- Inline `fileContent` uploads use an in-memory Playwright file payload, so TestAgent does not need to write temporary files into the project.
- MCP browser adapters return explicit unsupported messages for local file uploads because the generic MCP paths do not guarantee access to a local upload file input.
- Added `runTestAgentPlaywrightFileUploadSelfTest` with a real page that reads the uploaded file name/content and verifies the result through browser assertions.

## Verification

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentPlaywrightFileUploadSelfTest`: PASS
  - `runTestAgentPlaywrightRealBrowserSelfTest`: PASS
- Full TestAgent self-test matrix: 52/52 PASS

## Follow-up

- Add acceptance-derived upload-flow inference for criteria such as "upload notes.txt and shows processed".
- Add multi-file upload support if a future project needs it.
