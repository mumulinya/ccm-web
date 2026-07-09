# Phase 72 - Global Memory Selftest Isolation

## Goal

继续把 CCM 记忆系统推向 Claude Code 级别的长期可靠性：全局记忆、群聊记忆、Memory Center 自测不能污染真实 `global-agent-memory/memory.json` 或 active `.bak`，并且生产质量检查必须能发现 selftest sentinel 残留。

## Completed

- `backend/agents/global/memory.ts`
  - 新增 `acquireGlobalAgentMemorySelfTestLock`，用 `.selftest.lock` 串行化会写 Global Agent memory 的状态型自测。
  - 新增 `scanGlobalAgentMemorySelfTestContamination`，扫描 active `memory.json`、active `.bak` 和历史 residue 文件中的 `*_SENTINEL` / `source:selftest`。
  - 新增 `runGlobalAgentMemorySelfTestIsolationSelfTest`，验证 active 污染可检测、锁文件存在、恢复后 active memory 干净。
  - 修复 `runGlobalAgentMemorySelfTest` / `runGlobalAgentMemoryStressSelfTest` 的恢复方式：不再用会轮换 `.bak` 的 `saveMemory(previousMemory)` 恢复，而是直接写回 main/bak 原始文本快照。
- `backend/modules/collaboration/memory.ts`
  - 为全局记忆桥接、仲裁、语义仲裁、跨群聊 suppression、suppression freshness 自测接入同一把 Global Agent memory selftest lock。
- `backend/modules/knowledge/memory-control-center.ts`
  - 为 Memory Center 的全局记忆桥接/仲裁/跨群聊自测接入同一把锁。
  - 新增 `global_memory_selftest_contamination` 质量检查。
  - Memory Center overview 会把 active 污染标为 critical，把 residue 污染标为 warning。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加静态覆盖，锁住 global memory selftest lock、contamination scan、Memory Center 质量检查注册链路。

## Behavior

- Active contamination:
  - `memory.json` 或 `memory.json.bak` 含 selftest sentinel/source 时，质量检查 `status=fail`，score `0`。
- Residue contamination:
  - 旧的污染备份、sanitize snapshot、tmp 文件含 selftest sentinel 时，质量检查 `status=warn`，score `85`。
  - 这不会阻塞 active memory 使用，但会提醒清理历史残留。
- Stateful selftests:
  - 并行运行 collaboration/memory 和 Memory Center 的全局记忆自测时，会通过同一把锁串行写真实 Global Agent memory，并恢复 main/bak 快照。

## Environment Repair

本阶段发现 `runGlobalAgentMemoryStressSelfTest` 通过 `saveMemory(previousMemory)` 恢复时会把测试态写进 active `.bak`。已修复，并把当前 `.bak` 从干净主文件重新同步。

- Resync 前 `.bak` 备份：
  `C:\Users\admin\.cc-connect\global-agent-memory\memory.bak-before-phase72-resync-1783448130431.json`
- 当前 active scan：
  - active contamination: `0`
  - residue contamination: `3`
  - status: `warn`

## Verification

- `npm run build:backend`
- `npm run check`
- `node scripts\main-agent-decision-ui-selftest.mjs`
- `runGlobalAgentMemorySelfTest`
- `runGlobalAgentMemoryStressSelfTest`
- `runGlobalAgentMemorySelfTestIsolationSelfTest`
- `runGroupGlobalAgentMemoryBridgeContextSelfTest`
- `runGroupGlobalAgentMemoryArbitrationContextSelfTest`
- `runGroupGlobalAgentMemorySemanticArbitrationSelfTest`
- `runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest`
- `runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryCrossGroupSuppressionSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryCrossGroupFreshnessSelfTest`
- `buildMemoryQualityReport({ checkIds: ["global_memory_selftest_contamination"] })`

## Next Direction

Phase 73 should close the remaining residue loop by adding a safe cleanup/archival action for selftest-contaminated residue files, then continue toward real third-party child Agent E2E validation where fresh cc/cursor/codex sessions receive compressed group memory and return structured memory usage receipts.
