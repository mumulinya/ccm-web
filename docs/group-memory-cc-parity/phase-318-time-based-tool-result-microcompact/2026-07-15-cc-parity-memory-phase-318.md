# CCM Memory Phase 318: Time-based tool-result microcompact

Date: 2026-07-15

Status: implemented, verified, and deployed

Long-term goal status: active for future parity audits only

## Why this phase was required

CCM already had time-based microcompact in its compaction plan, but that path folded old Agent messages only when a compact operation ran. It did not match Claude Code's cache-cold behavior of projecting old tool results out immediately before the next model request.

The parity references were:

- `D:\claude-code\src\services\compact\timeBasedMCConfig.ts`
- `D:\claude-code\src\services\compact\microCompact.ts`, especially the old tool-result clearing path around lines 400-529

Phase 318 closes that runtime gap without mutating the original group-chat transcript.

## Implementation

### Cache-cold projection

`backend/modules/collaboration/group-memory-compaction.ts` adds `buildGroupTimeBasedToolResultProjection()` and `verifyGroupTimeBasedToolResultProjectionReceipt()`.

The projection:

- runs only for `group_main_thread:*` and an exact `gcs_*` conversation;
- activates only after the configured idle gap;
- clears old results from compressible tools such as Read, Bash, Shell, Grep, Glob, WebSearch, WebFetch, Edit, and Write;
- keeps at least one result and defaults to the most recent five;
- substitutes `[Old tool result content cleared]` in the projected model input;
- leaves unsupported tools and recent results intact;
- never changes the original persisted group messages.

The receipt uses schema `ccm-group-time-based-tool-result-projection-v1`. It is body-free, checksummed, and bound to the exact group conversation.

Structured `content`, `tool_use`, and `tool_result` rendering was also corrected so model context no longer degrades to `[object Object]`.

### Main-Agent and child-Agent use

`backend/modules/collaboration/memory.ts` applies the same projection in both production context paths:

- `buildGroupContextPacket()` for the group Main Agent;
- `buildAgentMemoryContextBundle()` for each new project child-Agent session.

Receipts are persisted to the owning conversation's `memory.compaction` and `messageCompression` records. A sibling `gcs_*`, another group, the Global Agent, and unrelated `tas_*` sessions do not inherit the projection.

### User-controlled policy

`backend/modules/collaboration/group-orchestrator.ts` and the Memory Center add three global controls:

- `timeBasedMicrocompactEnabled`, default `false`;
- `timeBasedMicrocompactGapMinutes`, default `60`, range 1-10080;
- `timeBasedMicrocompactKeepRecent`, default `5`, range 1-100.

The default remains conservative. Users can enable and tune the policy themselves in the Memory Center instead of CCM silently deciding to shrink a large memory body.

### Operational visibility

`backend/modules/knowledge/memory-control-center.ts` exposes the effective policy and latest exact-session receipt. `frontend/src/components/knowledge/MemoryCenter.vue` renders:

- the enable switch, idle interval, and recent-result retention controls;
- status as disabled, waiting, applied, or invalid;
- cleared and kept counts, estimated tokens saved, receipt checksum status, and raw-transcript preservation.

Historical receipts remain visible for audit after the policy is disabled.

## Runtime invariants

1. The feature is disabled by default and never clears results before the configured idle gap.
2. It is a model-input projection, not destructive transcript compression.
3. At least one recent compressible tool result is preserved.
4. Main-Agent and child-Agent inputs use the same exact `gcs_*` projection.
5. Global Agent context remains global-only.
6. Sibling conversations and groups remain isolated.
7. Receipt bodies contain counts and fingerprints, not tool-result content.
8. Invalid checksums, legacy/default sessions, and non-main-thread sources fail closed.

## Verification

New two-process acceptance test:

`npm run test:group-time-based-tool-result-microcompact-restart`

It passed 21 checks covering old-result clearing, recent-result retention, unsupported-tool retention, body-free checksums, tamper rejection, idle-gap enforcement, source and legacy-session rejection, minimum retention clamping, real Main-Agent prompt use, real child-Agent bundle use, raw JSON immutability, exact-session receipt persistence, sibling-session isolation, Memory Center projection, and restart durability of both settings and receipts.

Regression evidence:

| Capability | Result |
| --- | --- |
| Existing microcompact | 6/6 |
| Existing time-based compact plan | 7/7 |
| Phase 316 final dispatch reactive compact | 14/14 plus restart 5/5 |
| Phase 317 circuit breaker | 18/18 |
| Phase 313 exact group task entrypoints | 10/10 plus restart 5/5 |
| Global Agent global-only context | 13/13 |
| Model-aware typed-memory budget | 42/42 |
| Real Provider version/task soak | 165/165 |
| Full build | passed |

## Production deployment

Phase 318 is deployed at `http://localhost:3081`.

- PID: `6292`
- home response: HTTP 200
- Memory Center overview response: HTTP 200
- policy at deployment: disabled, 60-minute gap, keep five recent tool results
- built Memory Center asset: `MemoryCenter-B7L70Jce.js`
- desktop browser inspection: controls rendered and no overlapping layout was observed
- stdout: `C:\Users\admin\.cc-connect\logs\ccm-server-phase318.log`
- stderr: `C:\Users\admin\.cc-connect\logs\ccm-server-phase318.err.log`

The page may log an external Statsig request failure in the in-app browser. The local CCM page and APIs remain healthy; that external telemetry request is not part of this feature.

## Completion statement

The known Claude Code parity baseline requested for CCM is now operational: model-aware capacity, exact group-conversation memory, group Main-Agent and child-Agent reinjection, non-destructive compaction, final prompt gating, reactive recovery, durable failure suppression, and cache-cold tool-result microcompact are implemented and deployed.

The long-term goal stays active only to audit future Claude Code source changes and newly observed Provider behavior. It should not be interpreted as a large unfinished current release.
