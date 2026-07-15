# CCM Memory CC Parity Phase 328

## 目标

对齐 Claude Code compact boundary 的 `compactMetadata` 和连续压缩 turn tracking，让 CCM 在进程重启、多次自动压缩以及同链 reactive recompact 后仍能回答：

- 这次压缩是手动还是自动触发。
- 压缩前 token 和摘要消息数量是多少。
- 当前 compact epoch / turn 是什么。
- 上一个 compact boundary / epoch / turn 是什么。
- 距上次 compact 新增了多少消息和真实用户 turn。
- 当前压缩是否是没有新用户 turn 的同链重压缩。

## Claude Code 对照

本阶段对照：

- `D:\claude-code\src\utils\messages.ts`
- `createCompactBoundaryMessage()`
- `D:\claude-code\src\services\compact\autoCompact.ts`
- `RecompactionInfo.turnsSincePreviousCompact`
- `RecompactionInfo.previousCompactTurnId`
- `D:\claude-code\src\query.ts`
- compact 后重置 `turnCounter / turnId`

Claude Code boundary 的核心字段为：

- `trigger`
- `preTokens`
- `messagesSummarized`
- `preservedSegment.headUuid / anchorUuid / tailUuid`

CCM 之前在 boundary 顶层已经拥有等价统计和 preserved segment，但 `compactMetadata` 中只保存了 `preCompactDiscoveredTools`，也没有形成可持久恢复的 compact turn lineage。

## 实现

### CC 兼容 compactMetadata

新 boundary 的 `compactMetadata` 现在写入：

- `trigger=manual|auto`
- `preTokens`
- `messagesSummarized`
- `preCompactDiscoveredTools`
- `preservedSegment.headUuid`
- `preservedSegment.anchorUuid`
- `preservedSegment.tailUuid`
- `compactLineage`

原有 CCM 顶层字段保持兼容，不删除已有读取路径。

### Compact lineage

新增：

- `ccm-group-compact-lineage-v1`
- `buildGroupCompactLineage()`
- `verifyGroupCompactLineage()`

lineage 绑定：

- `group_id`
- 精确 `group_session_id=gcs_*`
- `boundary_id`
- `compact_epoch`
- 稳定 `compact_turn_id`
- `trigger`
- 精确群聊主 Agent `query_source`
- `previous_boundary_id`
- `previous_compact_epoch`
- `previous_compact_turn_id`
- `turns_since_previous_compact`
- `new_message_count_since_previous_compact`
- `is_recompaction_in_chain`
- compact 前后 token、阈值和 next-turn retrigger 状态
- `lineage_checksum`

每次 compact 保存的 `totalMessagesSeen` 作为下一代 lineage 的 durable checkpoint。下一次压缩只在该 checkpoint 可验证时统计新增 suffix；仅统计真实 user message，纯 `tool_result` user block 不算新 turn。

旧 boundary 没有 checkpoint 时使用：

- `checkpoint_basis=legacy_unknown`
- `turns_since_previous_compact=-1`
- `is_recompaction_in_chain=false`

不会把未知值误报为零 turn recompact。

### 持久化和恢复

lineage 写入：

- `compactBoundary.compactLineage`
- `compactBoundary.compactMetadata.compactLineage`
- `compactBoundary.post_compact_restore.compactLineage`
- `compaction.compactLineage`
- `messageCompression.compactLineage`

boundary journal identity 现在包含重新计算的 `compactLineageChecksum`。commit 和 resume projection 校验：

- lineage 自身 checksum。
- group / `gcs_*` / boundary 绑定。
- journal 内 lineage checksum。
- boundary identity checksum。

修改 turn count、previous epoch 或其他 lineage 内容时，resume 必须 fail closed 并使用完整 raw transcript 重建，不能静默继承被篡改的代际状态。

### 子 Agent 使用

每个新项目子 Agent 会话的受控记忆包显示已验证的：

- trigger
- current epoch / turn
- previous compact turn
- turns since previous compact
- recompact 状态

lineage 无效时明确显示 `fail_closed`，不得使用它判断 recompact 代际或 provider 容量信用。Global Agent 路径未接入群聊 lineage。

## 专项验证

新增：

- `scripts/group-compact-lineage-restart-selftest.mjs`
- `npm run test:group-compact-lineage-restart`

结果：`19/19`。

覆盖：

- 第一代 compact 的 unknown previous turn 语义。
- CC 兼容 `compactMetadata` 字段。
- preserved `headUuid / anchorUuid / tailUuid`。
- 第二代 previous boundary / epoch / turn 连续性。
- durable message checkpoint 的新增消息和 user turn 计数。
- 新 user turn 后不是 same-chain recompact。
- 只有 assistant 输出时识别 same-chain recompact。
- legacy checkpoint 保持 unknown。
- reactive compact 使用 `trigger=auto`。
- 同群其他 `gcs_*` 拒绝复用。
- boundary journal 接受有效 lineage。
- lineage 篡改导致 resume fail closed。
- 子 Agent 只显示已验证 lineage。
- 新进程重启后 lineage 连续性保持。

回归：

- Phase 327 message order：`28/28`。
- Phase 326 loaded tool state：`36/36`。
- boundary journal：`16/16`。
- compaction hook 双会话隔离：`27/27`。
- compact restart soak：`11/11`。
- Global Agent global-only context：`13/13`。
- `npm run check`：通过。
- 完整 `npm run build`：通过。

## 当前判断

本阶段补的是连续自动压缩和进程恢复时的代际证据，不改变已有摘要正文、原始群聊消息或任务文件。长期目标继续保持 active，后续继续对照 Claude Code compact telemetry、session-memory compact 和 provider 实际反馈链路。
