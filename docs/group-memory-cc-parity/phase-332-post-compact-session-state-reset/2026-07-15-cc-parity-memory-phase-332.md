# CCM Memory CC Parity Phase 332

## 目标

关闭当前版本最后一个已知的 Claude Code compact 后状态生命周期差异：压缩成功后保留 raw transcript 的 durable boundary cursor，同时按精确 `group_id + gcs_*` 清除 provider-active Session Memory cursor、重置 cache-read baseline、标记 post-compaction、抑制 warning，并把自动压缩失败计数归零。

## Claude Code 对照

本阶段对照：

- `D:\claude-code\src\services\compact\autoCompact.ts`
- `D:\claude-code\src\commands\compact\compact.ts`
- `D:\claude-code\src\services\SessionMemory\sessionMemoryUtils.ts`

Claude Code 在成功压缩后会清除已不属于 active message array 的旧 `lastSummarizedMessageId`，运行 post-compact cleanup，通知 Session Memory/cache 监控重置 baseline，标记 post-compaction，抑制紧邻压缩后的 warning，并将传统 auto-compact 的连续失败计数归零。

CCM 不会删除原始群聊 JSON，因此不能直接清空 `compaction.lastCompactedMessageId`。该字段仍是 boundary journal、raw transcript 恢复投影和 compact head 的 durable cursor。本阶段将 durable cursor 与 provider-active cursor 拆成两条生命周期。

## 实现

新增：

- `ccm-group-post-compact-session-state-reset-v1`
- `buildGroupPostCompactSessionStateResetReceipt()`
- `verifyGroupPostCompactSessionStateResetReceipt()`

receipt 记录并校验：

- 精确 `group_id + group_session_id + scope_id`。
- boundary ID、compact epoch、summary checksum 和 compact transaction receipt checksum。
- `session_memory_reuse / traditional` 压缩路径。
- durable boundary cursor 保留。
- provider-active cursor 清空及前一 cursor ID。
- Session Memory extraction cursor 在新的 post-compact snapshot generation 上重基。
- cache-read baseline generation 单调加一。
- post-compaction generation 标记。
- warning suppression。
- auto-compact circuit-breaker failure count 归零。
- provider-native capacity reset generation/checksum/head generation。
- `body_free` 和 receipt checksum。

成功路径现在先完成 compact head、provider capacity reset 和 exact-session circuit-breaker success，再把完整 reset receipt 写入最终 memory/snapshot。receipt 同时进入：

- `memory.compaction`
- `memory.messageCompression`
- `compactBoundary`
- `compactBoundary.compactMetadata`
- `compactBoundary.post_compact_restore`
- Session Memory `snapshot.json`

Session Memory snapshot 新增：

- `durableBoundaryMessageId`
- `providerActiveLastSummarizedMessageId`
- `providerActiveCursorStatus`
- `extractionCursorGeneration`
- `postCompactSessionStateReset`
- reset 校验状态和问题列表

下一次 Session Memory 快路径会核对 memory 与 snapshot 的 reset receipt、generation 和 provider cursor 状态。旧 snapshot、跨会话 receipt 或被篡改 generation 会以 `post_compact_session_state_reset_mismatch` 回退，不能沿用旧 provider cursor。

## Journal 与上下文

Boundary journal identity 新增 `postCompactSessionStateResetChecksum`。commit、resume projection 和 restart validation 都会校验 receipt checksum、群聊、`gcs_*` 和 boundary 绑定；篡改后 fail closed，并使用完整 raw transcript 重建。

项目子 Agent 受控记忆包显示：

- reset 校验状态。
- compact path/generation。
- durable/provider cursor 状态。
- cache baseline、warning 和 failure count。

Memory Center 新增“压缩后会话状态”面板，展示 exact-session reset receipt 及 fail-closed 问题。Global Agent 的 global-only 上下文边界未改变。

## 验证

新增：

- `scripts/group-post-compact-session-state-reset-restart-selftest.mjs`
- `npm run test:group-post-compact-session-state-reset-restart`

专项结果：`14/14`。

覆盖：

- Session Memory reuse 与 traditional 两条压缩路径。
- 双 `gcs_*` reset generation 独立。
- durable boundary cursor 保留、provider cursor 清空。
- extraction cursor 新 generation 重基。
- cache baseline、warning、failure count 和 provider capacity reset。
- Session Memory snapshot 持久化。
- boundary journal 重启恢复。
- reset receipt 篡改 fail closed。
- Memory Center 展示。
- receipt body-free。

回归：

- Phase 330 Session Memory selection：`15/15`。
- Phase 331 API invariant closure：`14/14`。
- boundary journal：`16/16`。
- `npm run check`：通过。
- `npm run build`：通过。

## 当前判断

Phase 332 完成后，用户要求的当前 CCM 记忆主链按交付口径完成：多群聊/多会话隔离、群聊与 Global Agent 上下文边界、第三方子 Agent 新会话注入、容量控制、Session Memory 优先压缩、API 不变量、恢复、防篡改和 compact 后状态生命周期均已闭环。

长期目标继续保持 active，仅用于后续 Claude Code 源码变化、新 provider 行为和长期运行证据的持续增强；不表示当前版本仍缺少主体功能。
