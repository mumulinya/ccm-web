# Music Production Workflow v1

Date: 2026-07-14

## Scope

This upgrade turns the music page from a synchronous demo flow into a durable user workflow. It covers trusted search results, model compatibility, background downloads, upload and streaming safety, a persistent local library, and controllable assistant chat.

## User Workflow

1. The user searches through the music assistant or a direct search API.
2. The backend ranks real Netease or Bilibili results and adds a 24-hour HMAC download token.
3. The UI only enables remote download actions for signed backend results. IDs written only by the model are display-only.
4. Adding a remote result creates a persistent background job. Adding all results queues work and never autoplays every completion.
5. The download center polls durable state and supports progress, cancellation, retry, failure details, and restart recovery.
6. Completed tracks enter the local library. Favorites, playlists, and the playback queue persist across browser and server restarts.
7. The assistant response can be stopped, and the last user request can be retried.

## Backend Ownership

- `backend/modules/music/llm-client.ts`: unified OpenAI-compatible and Anthropic-compatible quote/emotion calls.
- `backend/modules/music/search-results.ts`: relevance ranking, result cleanup, HMAC signing, and token verification.
- `backend/modules/music/download-jobs.ts`: persistent queue, concurrency, ffmpeg progress, timeout, cancel, retry, recovery, and audio output validation.
- `backend/modules/music/library-state.ts`: favorites, playlists, and playback queue persistence.
- `backend/modules/music/music.ts`: HTTP routing, SSE `music_results`, upload limits, and byte-range behavior.

## Persistent Data

- `~/.cc-connect/music-download-jobs.json`: at most 200 recent download jobs.
- `~/.cc-connect/music-library-state.json`: favorites, playlists, and playback queue.
- `~/.cc-connect/music-download-token-secret`: local signing secret, created with restricted permissions where supported.
- `~/.cc-connect/music/`: validated local audio files.

Jobs left in `resolving` or `running` are returned to `queued` during startup. Partial files use a `.part` suffix and are removed after cancellation or failure.

## API Contract

- `GET /api/music/search-netease?q=` and `GET /api/music/search?q=` return ranked signed results.
- SSE `/api/music/agent` emits `music_action`, trusted `music_results`, text, errors, and completion.
- `GET/POST /api/music/download-jobs` lists or creates jobs.
- `GET /api/music/download-jobs/:id` returns current state.
- `POST /api/music/download-jobs/:id/cancel` and `/retry` control work.
- `DELETE /api/music/download-jobs` clears ended jobs after their worker cleanup has finished.
- `GET /api/music/library-state` returns favorites, playlists, and queue.
- `POST /api/music/library-state/favorite`, `PUT /queue`, and playlist endpoints update state atomically.
- `POST /api/music/upload` accepts at most 100 MB and requires both an allowed extension and matching audio magic bytes.
- `GET /api/music/stream` supports valid single byte ranges and returns `416` for malformed or out-of-bounds ranges.

The old `/download`, `/convert`, and `/convert-netease` POST paths remain compatibility aliases, but they now require a signed result and create the same durable job.

## Failure Boundaries

- Netease public audio URLs cannot bypass VIP, copyright, or removed-track restrictions. These become visible failed jobs that can be retried after a fresh search.
- A forged, expired, or source-mismatched download token is rejected before any resolver or ffmpeg process starts.
- Upload validation intentionally rejects renamed non-audio files.
- Download concurrency defaults to 2 and can be set from 1 to 4 with `CCM_MUSIC_DOWNLOAD_CONCURRENCY`.
- Job timeout defaults to 15 minutes and can be changed with `CCM_MUSIC_DOWNLOAD_TIMEOUT_MS`.

## Verification

```powershell
npm run check
npm run build
npm run test:music-agent
npm run test:music-production
npm run test:music-render
```

Verified behavior:

- Empty pending chat content is never sent to the model.
- Exact Netease title/artist results outrank live or cover variants.
- A live `晴天 周杰伦` search returns `晴天 - 周杰伦` from `叶惠美` first with a valid download token.
- Tampered download tokens are rejected.
- A real signed result can create a job, cancel it, finish worker cleanup, and clear its history.
- Invalid uploads fail, valid WAV uploads pass, and test files are cleaned up.
- Valid ranges return `206`; invalid ranges return `416` with `Content-Range: bytes */size`.
- Favorites, playlists, and the playback queue persist through the HTTP API.
- Desktop and mobile layouts have no horizontal overflow or overlapping interactive controls.
- Assistant results are actionable only when a signed backend result is present, and retry resends the last user request.

Evidence:

- `evidence/production-workflow/01-music-desktop.png`
- `evidence/production-workflow/02-music-assistant-desktop.png`
- `evidence/production-workflow/03-music-mobile.png`
