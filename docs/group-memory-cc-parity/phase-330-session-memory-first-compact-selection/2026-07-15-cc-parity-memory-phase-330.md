# CCM Memory CC Parity Phase 330

## 目标

对齐 Claude Code 的 session-memory-first compact selection：自动压缩和无自定义指令的手动压缩先复用已完成、可校验、游标可解析的精确群聊会话 Session Memory；只有不满足条件时才走传统确定性/模型摘要流程。

## Claude Code 对照

本阶段对照：

- `D:\claude-code\src\services\compact\sessionMemoryCompact.ts`
- `D:\claude-code\src\services\compact\autoCompact.ts`
- `D:\claude-code\src\commands\compact\compact.ts`

对齐行为：

1. 等待正在执行的 Session Memory extraction。
2. 拒绝不存在、空模板、scope/checksum 不匹配的 Session Memory。
3. 以 `lastSummarizedMessageId` 为游标，先保留游标后的完整消息段，再按 `10K tokens / 5 条文本消息 / 40K 上限`处理窗口。
4. 保护任务事务，不跨精确 `group + gcs_*` 使用记忆。
5. Session Memory 被选中时不调用 compaction API。
6. 有 custom compact instructions 或 partial compact 时直接回退传统流程。
7. 真实压缩后 payload 仍达到 auto-compact threshold 时回退传统摘要，不重复计算 Session Memory 正文。

## 实现

新增：

- `ccm-group-session-memory-compact-selection-v1`
- `calculateGroupSessionMemoryMessagesToKeepIndex()`
- `buildGroupSessionMemoryCompactSelectionReceipt()`
- `verifyGroupSessionMemoryCompactSelectionReceipt()`

选择 receipt 记录精确群聊会话、extraction 等待状态、snapshot/summary 路径、declared/actual markdown checksum、游标状态、保留消息和 token、压缩后预算、fallback reason、是否调用 compaction API、usage attribution 和 body-free checksum。

真正选中时：

- `summary.md` 作为压缩后的 `messageDigest`。
- 结构化 `conversationSummary` 继续保留，承担恢复校验和确定性保底。
- `modelAttempted=false`、`compactionUsage=null`。
- true post-compact payload 不再把同一份 Session Memory 同时算作摘要和 restore sidecar。

回退原因包括：

- 配置禁用。
- partial compact。
- custom instructions。
- extraction timeout / invalid lease。
- snapshot 缺失或 scope 不匹配。
- markdown 缺失、空模板或 checksum 不匹配。
- cursor 缺失或在当前 transcript 中找不到。
- projected/true post-compact payload 达到阈值。

## 持久化与恢复

selection receipt 写入：

- `compactBoundary.sessionMemoryCompactSelection`
- `compactBoundary.compactMetadata.sessionMemoryCompactSelection`
- `compactBoundary.post_compact_restore.sessionMemoryCompactSelection`
- `compaction.sessionMemoryCompactSelection`
- `messageCompression.sessionMemoryCompactSelection`

boundary journal identity 新增 `sessionMemoryCompactSelectionChecksum`。commit 和 resume 校验 receipt checksum、group、`gcs_*` 和 `group--gcs_*` scope；篡改后 fail closed。

项目子 Agent 上下文显示 Session Memory selection 状态、游标、保留窗口、API 调用和 fallback reason。Global Agent 的 global-only 边界不变，不读取群聊 selection。Memory Center 的压缩边界页新增“Session Memory 已复用/已回退”状态。

## 验证

新增：

- `scripts/group-session-memory-compact-selection-restart-selftest.mjs`
- `npm run test:group-session-memory-compact-selection-restart`

专项结果：`15/15`。

覆盖：

- 精确 Session Memory 成功选择。
- CC 游标后完整保留窗口。
- compaction model/API 零调用。
- Session Memory 不重复计入 payload。
- receipt 多位置持久化。
- boundary journal 重启恢复。
- receipt 篡改 fail closed。
- 同群相邻 `gcs_*` 不可复用。
- markdown checksum 篡改回退。
- custom instructions 回退。
- 原始 transcript 不修改。

回归：

- Phase 329 compaction model usage：`23/23`。
- boundary journal：`16/16`。
- `npm run check`：通过。
- `npm run build`：通过。

## 当前判断

Phase 330 完成后，当前已知的 session-memory-first 核心缺口已关闭。CCM 的群聊会话压缩现在不是对任意大记忆做无条件蒸馏，而是按模型阈值、精确会话游标、可验证 Session Memory 和真实压缩后 payload 进行选择。长期目标继续保持 active，仅用于后续跟随 Claude Code 新版本变化。
