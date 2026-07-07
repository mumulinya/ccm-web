# Phase 25 - Child Agent Memory Dispatch Freshness Gate

## Goal

Make every child Agent dispatch carry auditable proof that the injected group memory context is current, so third-party Agent sessions such as Claude Code, Cursor, or Codex can treat CCM group memory as the authoritative context for that task instead of relying on their own possibly empty or stale session history.

## Claude Code Reference

- Reference checked:
  - `D:\claude-code\src\utils\claudemd.ts`
  - `D:\claude-code\src\commands\clear\caches.ts`
  - `D:\claude-code\src\services\compact\postCompactCleanup.ts`
  - `D:\claude-code\src\utils\hooks.ts`
- Claude Code behavior mirrored:
  - Memory cache invalidation and instruction reload are explicit events.
  - Cache clearing for correctness is separated from instruction reload hook reasons.
  - Post-compact cleanup clears user context and memory file cache so the next turn reloads instructions.
  - Loaded instructions have hook/audit evidence, and consumers can explain why memory was refreshed.

## Implementation

- Added `GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION`.
- Added `ccm-child-agent-memory-dispatch-freshness-gate-v1`.
- Every `buildAgentMemoryContextBundle()` now includes `dispatch_freshness_gate`:
  - `dispatch_gate_id`
  - group id and target project
  - child scope
  - status:
    - `fresh_reloaded`
    - `fresh_reused_stable_sources`
    - `source_incomplete`
    - `memory_ignored`
  - source manifest checksum/status/counts
  - reload audit reason/cache action/source-change trigger
  - receipt contract requiring `memoryUsed` / `memoryIgnored` declaration
- Ignored-memory bundles now also carry a gate with `status: "memory_ignored"` so the child Agent can prove the user-requested ignore policy was honored.
- Child Agent rendered memory context now shows:
  - `子 Agent 记忆派发新鲜度`
  - gate id
  - source checksum
  - reload reason
  - explicit `memoryUsed/memoryIgnored` receipt requirement
- Worker handoff now extracts and preserves the gate as `references.memory_freshness_gate`.
- `renderSelfContainedWorkerHandoff()` now prints `记忆派发门禁` before the platform memory block.
- Worker handoff completeness now records `has_memory_freshness_gate`.
- Child Agent development contracts now include a gate-specific requirement when a memory bundle is present:
  - `dispatch_gate_id=...`
  - status/action/reload reason
  - receipt must reference the gate in `memoryUsed` or `memoryIgnored`
- Group live dispatch routes now build a full `buildAgentMemoryContextBundle()` instead of relying only on the string wrapper:
  - group broadcast path
  - direct group mention path
  - `/api/groups/broadcast` path
- Those routes pass the same memory bundle into `buildChildAgentDevelopmentContract()`, so the visible prompt text, worker context packet, and receipt contract all point at the same memory freshness evidence.

## Selftests

- Added `runGroupMemoryDispatchFreshnessGateSelfTest()`.
- Updated `runWorkerHandoffSelfTest()`.
- The new selftest verifies:
  - normal child memory bundles include a gate;
  - gate id binds to group, target project, and child scope;
  - gate source checksum matches the source manifest;
  - gate reload reason/cache action matches the reload audit;
  - rendered child context mentions the gate and receipt requirement;
  - ignored-memory bundles carry `status: "memory_ignored"` and render `memoryIgnored` requirements.
- The Worker handoff selftest verifies:
  - `references.memory_freshness_gate` is preserved;
  - rendered handoff includes `记忆派发门禁`;
  - reload reason evidence survives inside the handoff.

## Operational Memory

- Phase 24 detects that memory sources changed and promotes reload to `memory_source_changed`.
- Phase 25 turns that reload evidence into a dispatch-time contract that travels with each child Agent task.
- This matters because CCM child Agents are often fresh third-party sessions. The child Agent can now see exactly which memory bundle it received, whether it was reloaded or reused from stable sources, and what it must report in `memoryUsed` or `memoryIgnored`.
- Multiple group chats remain isolated because the gate is built from the per-group, per-child reload scope.
- The gate is intentionally included even when the user says to ignore memory, so ignore behavior is auditable instead of silent.

## Still Open

- File-system watcher driven invalidation is still future work.
- The UI does not yet expose a gate timeline or source diff panel.
- Runtime lifecycle cards record the worker packet but do not yet summarize the gate as a first-class column.
- A stricter receipt validator can later enforce that `memoryUsed` or `memoryIgnored` actually mentions the gate id.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - `runGroupMemoryDispatchFreshnessGateSelfTest()`
  - `runWorkerHandoffSelfTest()`
  - full dist memory regression including `dispatchFreshnessGate` and `workerHandoff`

Dist regression result after backend build:

```json
{
  "typed": true,
  "loadPlan": true,
  "pathCondition": true,
  "projectImport": true,
  "projectImportContext": true,
  "globalClaudeImport": true,
  "globalClaudeImportContext": true,
  "externalApproval": true,
  "settingSource": true,
  "instructionsHook": true,
  "sourceChangeReload": true,
  "dispatchFreshnessGate": true,
  "workerHandoff": true,
  "reloadAudit": true,
  "distill": true,
  "distillQuality": true,
  "sourceManifest": true,
  "context": true,
  "globalContext": true,
  "warning": true,
  "preserved": true,
  "audit": true,
  "timeBased": true,
  "partial": true,
  "sidecar": true,
  "ptl": true,
  "recovery": true,
  "micro": true,
  "hook": true,
  "quality": true,
  "integration": true,
  "auto": true
}
```
