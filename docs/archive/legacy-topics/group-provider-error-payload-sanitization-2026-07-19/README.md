# Group Provider Error Payload Sanitization

## Problem

A group main Agent failure message contained more data than the user could see:

- A complete HTML error page returned by the upstream Provider after `HTTP 502`.
- Internal `mainAgentDecision` metadata for an ordinary conversation turn.

The browser interpreted the Provider HTML instead of displaying it as text. Most of the payload therefore appeared blank while its whitespace and structure still enlarged the Agent bubble.

## Changes

- Group-visible text removes upstream HTML error documents while preserving the concise status and useful recovery advice.
- Remaining message text is HTML-escaped before mention highlighting, so Provider output cannot become rendered page markup.
- Quiet ordinary-conversation decision metadata no longer makes a message use the structured-card layout.
- The group orchestrator now persists a concise Provider error summary instead of a raw HTML response body.
- Existing transcripts are not rewritten. Historical raw payloads remain available for audit, but the UI ignores their technical body.

## Exact Case

- Stored assistant content: 398 characters.
- User-visible content after sanitization: 73 characters.
- Preserved meaning: the main Agent call failed with `HTTP 502`, no member was dispatched, and the API configuration/network/model/key should be checked.

## Verification

- Sanitizer test confirmed the HTML body is removed and recovery advice remains.
- Escaping test confirmed raw HTML cannot be interpreted by `v-html`.
- Production backend error-summary test reduced a raw HTML 502 response to the concise status line.
- `npm run check`: passed.
- `npm run build:frontend`: passed with 2,076 modules transformed.
- `npm run build:backend`: passed.
- The service is listening on `http://127.0.0.1:3080` and `/api/groups` responds successfully.
- No paid Provider or model calls were made.
