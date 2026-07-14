# Phase 212: Model-aware capacity and group chat session boundaries

## Goal

Stop treating an entire group as one unbounded model session. A group is now a collaboration container; each group chat session owns its transcript, compaction state, session snapshots, typed memory namespace, and child-agent context.

The global Agent is a dispatcher. Its model context contains global memory and a group routing directory, but no group chat transcript or group memory context.

## Claude Code capacity parity

- Default context window: `200,000` tokens when no provider capability or user override is available.
- Compact summary reserve: `min(model max output, 20,000)`.
- Auto-compact buffer: `13,000`.
- Default 200K trigger: `200K - 20K - 13K = 167K`.
- Preserved recent segment remains `10K tokens / 5 text messages / 40K hard maximum`.
- Every compaction model request records `ccm-group-compaction-model-request-budget-v1` and is rejected before transport if its estimated input exceeds the resolved model budget.
- Raw transcripts remain outside model requests and are never removed by compaction.

## User capacity controls

Memory Center now exposes:

- Default: model/provider capability with the Claude Code formula.
- 516K preset: context `516,000`, auto compact `460,000`.
- 1M preset: context `1,000,000`, auto compact `900,000`.
- Custom: validated context window and auto-compact threshold.

The settings persist in `group-orchestrator-config.json` as `modelContextWindow` and `modelAutoCompactTokenLimit`. The backend accepts camelCase and snake_case fields. The compact threshold must remain at least 3,000 tokens below the context window.

## Group session architecture

- Session manifest: `group-messages/sessions/<groupId>/manifest.json`.
- Session transcript: `group-messages/sessions/<groupId>/<sessionId>.json`.
- Session memory: `group-memory-sessions/<groupId>/<sessionId>.json`.
- Session snapshot/tool continuity keys include both group and session identity.
- Session-scoped typed memory uses `<groupId>--<sessionId>` as its namespace.
- Messages persist `group_session_id`.
- Tasks created from group chat persist `group_session_id`.
- Late task receipts derive their session from the task, not from whichever chat the user is currently viewing.
- Auto-compaction locks and timers use `groupId::sessionId`.

The frontend has a session selector and a `+` new-session command. Switching sessions reloads only that session's messages and memory.

## Global Agent boundary

`buildAgenticContext()` no longer creates or injects `group_memory_context`. The `query_group_memory` model tool was removed. The context includes an auditable boundary:

```json
{
  "schema": "ccm-global-agent-memory-boundary-v1",
  "policy": "global_memory_only_group_session_content_excluded",
  "group_session_context_included": false,
  "routing_directory_included": true
}
```

Group names, members, and task status remain available for routing and dispatch.

## Old session cleanup

The user explicitly authorized deletion instead of migration. Cleanup was limited to these verified `.cc-connect` roots:

- `group-messages` root legacy files
- `group-memory` root legacy files
- `group-session-memory` old snapshot files
- `group-tool-continuity` old continuity files

Deleted: 5,467 files, 148,244,287 bytes. Project code and typed-memory documentation directories were not deleted. Each of the three configured groups then received a fresh active session.

## Verification

- TypeScript full check: passed.
- Backend build: passed.
- Frontend production build: passed.
- Diff whitespace check: passed.
- Group session self-test: 6/6 passed.
- Model capacity and large-input self-test: 7/7 passed.
- Global Agent boundary proof: passed.
- Browser/API integration:
  - Memory Center rendered all four presets.
  - 516K save persisted `516000/460000` through the real API.
  - Default was restored to `0/0` after the save test.
  - Group Chat rendered exactly one fresh active session with zero messages.
  - Browser console errors: none.

## Large-memory finding

The deleted legacy transcripts were approximately 31.8MB, 12.0MB, and 8.4MB. The largest represented roughly 5.27 million estimated tokens. The old model path did not send all bytes verbatim, but it used static recent-message clipping and lacked a provider/model request-budget proof. Phase 212 replaces that ambiguity with an explicit request budget and prevents the entire group history from becoming one model session again.

## Next parity work

The long-term goal remains active. The next phase should add per-session archive/rename/delete controls, session-level retention metrics, and provider capability discovery for runtimes that expose model metadata dynamically.
