# CCM Memory Phase 341: Structured Tool Transcript Fidelity

Date: 2026-07-16

## Goal

Preserve structured `tool_use` and `tool_result` evidence when group Session Memory is extracted by an isolated third-party model. Tool names, IDs, parameters, result bodies, and pairing semantics must survive transcript construction and input-budget reduction.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`
- `D:\claude-code\src\services\compact\grouping.ts`

Claude Code counts tool-use blocks directly from structured assistant content and runs Session Memory extraction in an isolated forked Agent. Its compaction grouping uses API-round boundaries so an assistant response and its following tool results remain one semantic unit. Malformed boundaries are handled as explicit pairing problems rather than silently flattened text.

## Previous Gap

CCM's `messageContent()` handled array content with:

```text
block.text || block.content || ""
```

A normal `tool_use` block has `id`, `name`, and `input`, but no `text`. Its complete payload therefore became an empty string. Nested `tool_result` content also lost its type and pairing ID. The model could write a Session Memory summary without knowing which tool ran, which file was read, or which result belonged to which request.

The old budget fitter dropped one message at a time and clipped with `String(content)`. A structured block could become `[object Object]`, and a dropped assistant message could leave a newer orphan tool result.

## Implementation

Model extraction transcripts now use JSON-safe structured content:

- strings remain strings;
- array/object content remains structured JSON;
- tool IDs, names, inputs, error flags, nested result content, and unknown forward-compatible fields are retained;
- the signed `sourceTranscriptChecksum` covers the exact structured rows sent to the model.

Budget fitting now groups rows at assistant API-round boundaries. Old context is removed by whole round instead of individual message. If one remaining round is still too large, oversized message content is replaced by an explicit `ccm_clipped_structured_content` object containing a bounded serialized prefix and an authoritative-raw-transcript marker.

Request audits record body-free evidence:

- `sourceContentMode=structured_blocks_v1`
- structured message/block counts
- tool-use and tool-result counts
- orphan result and pending tool-use counts/IDs
- `complete`, `pending_results`, `orphan_results`, or `clipped` boundary status
- original, selected, and omitted API-round counts
- every clipped message ID

## Visibility And Isolation

- Memory Center rows display structured input mode, selected rounds, tool counts, and boundary status.
- Fleet totals count complete, pending, orphan, and clipped tool boundaries.
- The evidence is scoped to one `groupId--gcs_*` request/receipt/history chain.
- Sibling group sessions remain isolated.
- Global Agent still receives only global context and does not read group Session Memory transcripts.

## Verification

Dedicated test:

```text
PHASE341_RESULT={"checks":15,"passed":15}
```

The test captures the actual executor prompt and verifies that tool type, name, ID, file-path input, and nested result text are present. It also covers complete, pending, and orphan boundaries; oversized structured clipping; API-round budget retention; signed receipt binding; restart replay; sibling-session isolation; Memory Center backend/UI visibility; and Global Agent separation.

Adjacent regressions:

```text
Phase 340 canonical replay: 14/14
Phase 339 safe cursor advance: 12/12
Session Memory model extraction: 12/12
Session Memory budget fleet: 12/12
npm run check: passed
npm run docs:check: passed
npm run build: passed
```

## Result

Fresh project child-Agent sessions can now receive Session Memory derived from the real structured tool history instead of a text-only shadow of the conversation. Extraction remains bounded and replayable while preserving complete tool request/result semantics whenever those blocks exist in the owning group session.
