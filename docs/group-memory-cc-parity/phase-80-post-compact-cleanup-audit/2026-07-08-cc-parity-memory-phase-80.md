# Phase 80 - Post Compact Cleanup Audit

## 目标

对照 `D:\claude-code\src\services\compact\postCompactCleanup.ts`，补齐 CCM 群聊记忆压缩后的 cleanup 治理能力。Claude Code 在 compact 后会重置 microcompact/context-collapse/cache/approval/tracing/session cache，同时明确不清除 invoked skills。CCM 原先已有恢复审计，但缺少独立的“压缩后清理边界”产物，无法证明子 Agent 下一次新会话拿到的是 fresh memory packet，也无法治理 skill/tool continuity 是否被误清理。

## 已完成

- 新增 `ccm-post-compact-cleanup-audit-v1`。
- cleanup audit 记录：
  - `reset_microcompact_tracking`
  - `rebuild_child_context_packets`
  - `preserve_skill_continuity`
  - `preserve_raw_recovery_sources`
  - `do_not_delete_ledgers`
- cleanup audit 明确：
  - 派生 microcompact/context packet 状态必须重建。
  - invoked skills 和 tool continuity 不清除。
  - candidate usage / replay / hook / dispatch ledger 保留。
  - raw group transcript 继续作为恢复源。
  - 第三方子 Agent 会话 cleanup 不能污染群聊记忆或 Global Agent 记忆。
- `compactGroupConversationMemory()` 正常主压缩路径写入 cleanup audit。
- partial sidecar only 路径写入 cleanup audit。
- `refreshGroupConversationMemorySnapshot()` 同步压缩路径写入 recovery audit + cleanup audit。
- 子 Agent 记忆包 `renderGroupMemoryContextBundle()` 渲染 cleanup audit，要求子 Agent 基于 source manifest/raw transcript/typed MEMORY.md 重建上下文。
- Memory Center 新增：
  - `post_compact_cleanup_audit` 质量项。
  - 群聊详情 `postCompactUsage.postCompactCleanupAudit`。
  - 总览系统告警。
  - 前端“压缩后清理审计”面板。
- 旧压缩边界支持 `legacy inferred` cleanup audit，避免 phase 80 之前的历史压缩数据被误判为失败；后续真实压缩会持久化原生 audit。

## 验证

- `npm run build:backend`
- `npm run check`
- `npm run build`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `runGroupPostCompactCleanupAuditSelfTest`
- `runMemoryCenterPostCompactCleanupAuditSelfTest`
- `buildMemoryQualityReport({ checkIds: ['post_compact_cleanup_audit'], refresh: true })`

## 结果

Phase 80 已完成。CCM 现在不仅记录“压缩后如何恢复”，还记录“压缩后哪些派生状态必须清理、哪些上下文资产必须保留”。这把 Claude Code 的 `runPostCompactCleanup()` 思路映射到了群聊主 Agent / Global Agent / 项目子 Agent 多会话架构。

## 下一步候选

- 对照 `apiMicrocompact.ts`，为 CCM 子 Agent context packet 增加 API context-management edit plan：clear thinking / clear tool result / keep recent tool uses 的可审计配置。
- 增加旧 cleanup/strategy inferred audit 的一键 backfill 操作，将推断产物写回旧群聊记忆文件。
- 强化 cleanup audit 与 task Agent memory context snapshot receipt 的关联，要求子 Agent 回执声明使用的是 cleanup 后的新 context packet。
