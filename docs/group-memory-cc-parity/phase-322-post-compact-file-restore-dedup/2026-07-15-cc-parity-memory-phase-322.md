# CCM Memory Phase 322: Post-compact file restore dedup

Date: 2026-07-15

Status: implemented, verified, and deployed

Long-term goal status: active only for future parity audits and hardening

## Why this phase was required

The Phase 322 Claude Code audit found a compact-recovery detail in `collectReadToolFilePaths()`. When the preserved post-compact tail already contains a complete `Read` result for a file, Claude Code does not restore the same older file attachment again. A preserved result that only says `File unchanged since last read.` is different: it does not contain the file body, so the older file remains eligible for restoration.

Without this distinction, CCM could spend the bounded child-Agent context budget on duplicate file content or incorrectly omit content after preserving an unchanged-result stub.

Claude Code references:

- `D:\claude-code\src\services\compact\compact.ts`;
- `collectReadToolFilePaths()`;
- preserved-message file restoration in the full-compact and partial-compact paths.

## Implementation

### Exact-session preserved-tail dedup

`backend/modules/collaboration/group-memory-compaction.ts` adds:

- `buildGroupPostCompactFileRestoreDedupProjection()`;
- `verifyGroupPostCompactFileRestoreDedupReceipt()`;
- schema `ccm-group-post-compact-file-restore-dedup-v1`;
- `GROUP_POST_COMPACT_FILE_RESTORE_DEDUP_VERSION`;
- the unchanged-result prefix contract.

The projection scans structured `Read` and `FileRead` tool uses in preserved messages. A path backed by a complete result removes the matching older restore candidate. A path whose result is only the unchanged stub is counted but not removed. The result is bound to the exact `group_id + gcs_*` compact boundary and keeps the existing five-file restoration budget.

Full compact, partial sidecar compact, and synchronous snapshot compact all pass their preserved-message windows through the same projection.

### Context use

The deduplicated restore candidates persist in compact metadata and are used by both the group Main Agent and newly created third-party child-Agent sessions. `backend/modules/collaboration/memory.ts` renders the remaining file candidates near the front of the child-Agent context packet so the 14K rendering cap cannot discard them behind lower-priority diagnostics.

The projection never modifies the source group transcript or task store. Global Agent context remains global-only.

### Auditable receipt

The body-free receipt records:

- exact group and `gcs_*` identity;
- source and restored candidate counts;
- preserved-message and complete-read counts;
- deduplicated path count;
- unchanged-stub exception count;
- path hashes, projection checksum, and receipt checksum.

It contains no message body, tool result body, or file body. Verification rejects schema drift, invalid count relationships, checksum tampering, cross-group reuse, cross-session reuse, and projection mismatch.

### Memory Center visibility

`backend/modules/knowledge/memory-control-center.ts` validates and exposes the exact-session receipt. `frontend/src/components/knowledge/MemoryCenter.vue` adds `Post-compact File Restore Dedup` under the compact-boundary view with candidate, visible-read, deduplicated, stub-exempt, restored-budget, and receipt status cards.

Historical sessions with no Phase 322 compact correctly display `waiting` and `no compact yet`.

## Runtime invariants

1. Dedup requires an exact non-legacy `gcs_*` scope.
2. Only complete preserved `Read` results suppress older file restoration.
3. `File unchanged since last read.` remains eligible for real-content restoration.
4. Sibling sessions and other groups cannot affect the candidate set.
5. Full, partial, and synchronous compact paths use the same semantics.
6. Restored file candidates remain bounded and are promoted ahead of lower-priority child-Agent context.
7. Group transcripts and `tasks.json` remain unchanged.
8. Receipts contain hashes and counts, never file or message bodies.
9. Main-Agent and fresh child-Agent prompts use the deduplicated result.
10. Global Agent remains global-only.

## Verification

New two-process acceptance test:

`npm run test:group-post-compact-file-restore-dedup-restart`

It passed 25/25 checks covering complete-read dedup, unchanged-stub exemption, unique older-file restoration, reduced injected file context, body-free receipt verification, tamper and cross-session rejection, production compact persistence, child-Agent gate and rendered-context use, raw transcript immutability, sibling-session isolation, Memory Center visibility, and restart durability.

Regression evidence:

| Capability | Result |
| --- | --- |
| Phase 322 post-compact file restore dedup | 25/25 |
| Phase 321 post-compact child-task status | 28/28 |
| Phase 320 summary input projection | 21/21 |
| Compact restart soak | 11/11 |
| Compact hook dual-session isolation | 27/27 |
| Full frontend, MCP Feishu, and backend build | passed |
| Focused `git diff --check` | passed; line-ending warnings only |

## Production deployment

Phase 322 is deployed at `http://localhost:3081`.

- PID: `17356`
- home response: HTTP 200
- Memory Center overview response: HTTP 200
- `fetch-web-mcp`: connected
- `filesystem-mcp`: connected
- `mcp-feishu`: connected
- stderr: 0 bytes
- built assets: `MemoryCenter-BELlINh-.js` and `MemoryCenter-DfAG5wZo.css`
- browser verification: an exact group session renders `Post-compact File Restore Dedup` in the compact-boundary view; a historical session with no Phase 322 compact renders the expected waiting state
- stdout: `C:\Users\admin\.cc-connect\logs\ccm-server-phase322.log`
- stderr: `C:\Users\admin\.cc-connect\logs\ccm-server-phase322.err.log`

## Completion statement

Phase 322 is complete. CCM now restores post-compact file context with Claude Code's preserved-tail distinction: complete recent reads are not duplicated, while unchanged-result stubs do not suppress the real file content needed by the next model call. The behavior is exact-session, bounded, restart-durable, auditable, and used by actual Main-Agent and child-Agent context construction.

The current system remains production-usable. The long-term goal stays active for future Claude Code source changes and optional hardening, not because this phase is unfinished.
