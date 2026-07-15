# CCM Memory Phase 320: Compaction summary input projection

Date: 2026-07-15

Status: implemented, verified, and deployed

Long-term goal status: active only for future parity audits and hardening

## Why this phase was required

The Phase 320 Claude Code source audit found a remaining difference in the model-compaction request itself. Claude Code sanitizes the timeline before asking the model to write a compact summary: large image and document payloads are stripped, and attachments that will be restored after compaction are excluded from the summary input.

Claude Code references:

- `D:\claude-code\src\services\compact\compact.ts`;
- `stripImagesFromMessages()`;
- `stripReinjectedAttachments()`;
- the sanitized input passed to `streamCompactSummary()`.

CCM already bounded the output summary, but its summarizer timeline could still contain image data, document payloads, long base64/data URIs, nested media in tool results, and `skill_listing` or `skill_discovery` attachments that would be reinjected later. That wasted model context and could make compaction less reliable without adding durable memory value.

## Implementation

### Summary-only projection

`backend/modules/collaboration/group-memory-compaction.ts` adds:

- `buildGroupCompactionSummaryInputProjection()`;
- `verifyGroupCompactionSummaryInputProjectionReceipt()`;
- schema `ccm-group-compaction-summary-input-projection-v1`;
- stable markers `[image]`, `[document]`, and `[binary data removed]`.

The projection replaces image, document, nested tool-result media, and long binary payloads before the summarizer request. Visible text is preserved. `skill_listing` and `skill_discovery` attachments are omitted because their current versions are restored after compaction.

The sanitized messages are also used to construct the deterministic fallback summary. Only the summarizer request is changed: original group messages, typed memory, sibling conversations, other groups, and Global Agent context remain untouched.

### Auditable receipt

The projection writes a body-free, checksummed receipt into `modelRequestAudit.summaryInputProjection`. The receipt records source and projected message counts, replaced image/document counts, removed reinjected attachment counts, binary removals, estimated input tokens, and estimated tokens saved.

Invalid or cross-session receipts fail verification. The receipt contains no image, document, base64, or attachment body.

### Memory Center visibility

`backend/modules/knowledge/memory-control-center.ts` validates and projects the receipt. `frontend/src/components/knowledge/MemoryCenter.vue` renders `Compaction Summary Input Projection` with:

- exact `gcs_*` scope;
- source and projected message counts;
- images and documents replaced;
- reinjected attachments removed;
- estimated tokens saved;
- applied, waiting, or failed receipt status.

An existing conversation with no model compaction correctly displays `waiting` and `no model compact yet`.

## Runtime invariants

1. The projection is restricted to the compaction summarizer request.
2. Visible text remains available to the summary model.
3. Images and documents are represented by stable text markers.
4. Large base64 and data-URI bodies never enter the summary request.
5. Reinjected skill attachments are not summarized twice.
6. Original group JSON is byte-for-byte unchanged by the projection.
7. Receipts are body-free and checksummed.
8. Receipts survive restart in the owning `gcs_*` conversation.
9. Sibling conversations and groups remain isolated.
10. Global Agent remains global-only.

## Verification

New two-process acceptance test:

`npm run test:group-compaction-summary-input-projection-restart`

It passed 21/21 checks. The test starts a local fake Provider and inspects CCM's real outbound HTTP request body. It verifies that media base64 and stale skill listings are absent, `[image]` and `[document]` markers are present, visible text is retained, production compaction succeeds, the original JSON is unchanged, receipts survive restart, sibling `gcs_*` sessions remain isolated, and the Memory Center exposes the result.

Regression evidence:

| Capability | Result |
| --- | --- |
| Phase 320 summary input projection | 21/21 |
| Compact restart soak | 11/11 |
| Compact hook dual-session isolation | 27/27 |
| Phase 319 thinking-clear latch | 23/23 |
| Full application build | passed |
| Focused `git diff --check` | passed; line-ending warnings only |

## Production deployment

Phase 320 is deployed at `http://localhost:3081`.

- PID: `17248`
- home response: HTTP 200
- Memory Center overview response: HTTP 200
- `fetch-web-mcp`: connected
- `mcp-feishu`: connected
- `filesystem-mcp`: separately degraded by an existing `npx MCP request timeout: initialize`
- built assets: `MemoryCenter-C1omKIYk.js` and `MemoryCenter-Ck-Vhjtr.css`
- browser verification: an exact group session renders the projection panel; a historical session with no model compact renders the expected waiting state
- stdout: `C:\Users\admin\.cc-connect\logs\ccm-server-phase320.log`
- stderr: `C:\Users\admin\.cc-connect\logs\ccm-server-phase320.err.log`

The `filesystem-mcp` startup timeout is independent of the memory-compaction request path and does not affect the verified projection, receipt, or Memory Center paths.

## Completion statement

Phase 320 is complete. CCM now applies the same important compaction-input discipline as the audited Claude Code path: summaries are generated from useful textual context instead of paying model-context cost for binary media and attachments that will be restored afterward.

The core memory system is no longer missing this capability. The long-term goal remains active for future Claude Code changes and optional hardening, not because Phase 320 or the current usable system is unfinished.
