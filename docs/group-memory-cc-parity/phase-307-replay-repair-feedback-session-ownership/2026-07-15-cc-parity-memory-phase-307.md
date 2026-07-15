# CCM Memory Phase 307: Replay-Repair Feedback Session Ownership

日期：2026-07-15

## 目标

将子 Agent replay-repair 回执形成的类型化记忆从裸 `groupId` 提升为严格的 `groupId + gcs_*` 会话所有权，确保同一群聊的多个主 Agent 会话不会通过运行时蒸馏或 Memory Center 质量检查重新混合上下文。

## 问题

群聊主 Agent 已支持多个会话，但 replay-repair timeline fanout 产生的四类长期反馈记忆仍可能写入裸群级 scope：

1. Provider re-proof receipt consumption。
2. Provider ranking provenance compact-repair receipt consumption。
3. Post-compact reinjection repair receipt consumption。
4. Post-compact receipt-memory-usage repair completion。

即使运行时改成会话级写入，Memory Center 的报表构建器仍会读取群级 timeline/work-item ledger，并再次向裸 `groupId` 蒸馏，形成隐蔽的跨会话回流。

## 实现

### 运行时会话绑定

- `recordReplayRepairDispatchBriefTimelineBinding()` 规范化并持久化 `groupSessionId` / `group_session_id`。
- timeline binding identity 纳入 `groupSessionId`，同一逻辑任务在兄弟会话中不再碰撞。
- mention 路径从显式上下文或任务记录恢复 `gcs_*`，无效会话标识不冒充 exact-session。
- 四类 feedback distillation 使用 `${groupId}--${groupSessionId}`；仅历史无会话记录继续使用裸群级兼容 scope。

### 类型化记忆所有权

- 四类 archive row identity 均纳入根群聊和 exact session。
- ledger 与 archive 持久化 `sourceGroupId`、`groupSessionId` 和 `exactSession`。
- 生成的 Markdown 明确标注 exact group-chat session；历史兼容记录标注 legacy unscoped。
- 相同 timeline、brief、work-item、receipt ID 在兄弟会话中仍形成不同 row ID。

### Memory Center 防回流

- 四个质量报表先按 `gcs_*` 分桶，再分别执行 distill、ledger read、document scan 和 recall probe。
- exact-session 数据不再读取或写入裸群级 typed-memory 目录。
- 报表同时展示 `groupCount`、`scopeCount`、`exactSessionCount` 和 `legacyScopeCount`，避免把会话数误读成群聊数。
- 报表行包含 `groupSessionId`、`typedScopeId` 和 `exactSession`，可直接审计归属。

### 删除与兼容

- 删除一个群聊会话会清理该会话的四类 typed-memory artifacts。
- 兄弟会话的账本、文档和召回结果保持不变。
- 旧的无 `gcs_*` 数据仍可蒸馏和召回，但不会与新 exact-session 数据自动合并。

## 主要文件

- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/collaboration/group-orchestrator.ts`
- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `scripts/replay-repair-feedback-exact-session-distillation-selftest.mjs`
- `package.json`

## 验收

新增命令：

```powershell
npm run test:replay-repair-feedback-exact-session-distillation
```

结果：12/12 通过。

覆盖：

- 四类 archive 均写入 exact-session ledger。
- 相同逻辑 ID 在 A/B 会话中生成不同 row ID。
- 裸群级 ledger 与文档无污染。
- A/B Markdown、召回和私有 sentinel 不交叉。
- 真实 timeline fanout 写入正确会话。
- Memory Center 对一个根群聊报告两个 exact-session scope。
- 删除 A 后 B 保持完整。
- legacy unscoped 兼容路径仍工作。

## 回归结果

- Phase 307 exact-session feedback：12/12。
- Provider reliability promotion contract：14/14。
- Worker compact exact-session distillation：16/16。
- Worker compact session strategy isolation：14/14。
- Post-compact cleanup source scope：13/13。
- Provider generation restart reconciliation：14/14。
- Group memory resume integration：12/12。
- Compaction hook session isolation：27/27。
- Global Agent global-only context：13/13。
- 六组旧 typed-memory / Memory Center 自测全部通过。
- `npm run build` 通过。

## 长期目标状态

Phase 307 完成，但 Claude Code 级记忆系统长期目标保持 active。下一阶段继续审计仍以裸群级 ledger 作为长期反馈来源的子 Agent consumption / repair closure 路径，优先处理会被未来新会话自动召回的记忆族，并保持全局 Agent 只消费全局上下文。
