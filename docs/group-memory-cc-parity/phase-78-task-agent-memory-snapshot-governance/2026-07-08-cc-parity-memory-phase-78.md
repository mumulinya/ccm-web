# Phase 78: Task Agent Memory Snapshot Governance

## 背景

长期目标是把 CCM 的群聊/全局/项目子 Agent 记忆系统持续推进到 Claude Code 风格：记忆不仅要能压缩和注入，还要能被审计、复查、恢复、清理，并且每个第三方项目子 Agent 会话都能拿到稳定上下文。

Phase 77 已经让项目子 Agent 会话绑定 `ccm-task-agent-memory-context-snapshot-v1`。Phase 78 将这些隐藏证据升级为 Memory Center 可治理资产。

## 本次完成

- 在 `backend/tasks/agent-sessions.ts` 增加 task Agent 记忆上下文快照 inventory：
  - 枚举 session 引用快照和磁盘孤儿快照。
  - 校验文件存在、JSON 可读、schema、checksum、session binding、worker context packet、memory context、gate ids。
  - 聚合 group/project/session 维度的 ok/warn/fail、stale、prunable 统计。
- 增加 retention dry-run/清理能力：
  - 默认 `dryRun: true`。
  - 只允许清理快照目录内文件。
  - 保留每个 session 最新快照，按 retention 策略清理过期或孤儿快照。
  - 真清理后同步移除 task-agent session store 中对应 ref。
- 在 `backend/modules/knowledge/memory-control-center.ts` 接入 Memory Center：
  - 新增质量检查 `task_agent_memory_context_snapshots`。
  - Overview 出现系统/群聊告警。
  - 群聊详情 `postCompactUsage.taskAgentMemoryContextSnapshots` 暴露快照治理状态。
  - `/api/memory-center/operation` 支持 `prune_task_agent_memory_context_snapshots`，默认预演。
- 在 `frontend/src/components/knowledge/MemoryCenter.vue` 增加 UI：
  - 顶部质量区显示 task Agent memory snapshot 健康、孤儿、packet/gate gap、stale/prunable。
  - 支持预演清理和确认清理。
  - 群聊详情展示该群聊的 task Agent memory snapshots、缺口和可清理状态。
- 增加自测覆盖：
  - `runMemoryCenterTaskAgentMemoryContextSnapshotSelfTest()`
  - `memoryCenterGovernsTaskAgentMemoryContextSnapshots`

## 重要修正

Phase 77 的快照 checksum 生成时，`memory_context` 与 `worker_context_packet.memory` 是同一对象引用，`safeStringify` 会把第二处序列化成 `[Circular]`。Phase 78 的校验逻辑兼容这一历史生成方式：直接校验失败时，会恢复该引用别名再重算 checksum，避免把真实有效快照误判为损坏。

## 验证

- `npm run build:backend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `runMemoryCenterTaskAgentMemoryContextSnapshotSelfTest`
- `runTaskAgentSessionSelfTest`
- `buildMemoryQualityReport({ checkIds: ['task_agent_memory_context_snapshots'], refresh: true })`
- `runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest`
- `runMemoryCenterQualityTargetedRefreshSelfTest`
- `npm run check`
- Global Agent selftest contamination scan: `active=0`, `residue=0`

## 仍未完成的长期方向

长期目标仍然 active。本阶段完成的是“子 Agent 记忆快照治理层”。后续还需要继续增强：

- 更接近 Claude Code 的自动 compact 策略评分和压缩边界选择。
- 多群聊/全局记忆冲突下的长期回放验证。
- 子 Agent 结果回写后对 typed `MEMORY.md` 的更细粒度自动晋升/降权。
- 长日志蒸馏后的跨会话恢复演练。
- Memory Center 中更强的批量修复和一键 re-dispatch repair 工作流。
