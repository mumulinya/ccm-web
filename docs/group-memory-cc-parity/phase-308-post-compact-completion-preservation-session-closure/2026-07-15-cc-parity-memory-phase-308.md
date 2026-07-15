# CCM Memory Phase 308: Post-Compact Completion Preservation Session Closure

日期：2026-07-15

## 目标

将压缩后“完成信息保留失败 -> replay repair -> corrected retry -> 闭环记忆 -> 新子 Agent 召回”整条链提升为严格的 `groupId + gcs_*` 会话所有权，并阻止历史裸群聊记忆被自动注入任意新会话。

## 问题

Phase 307 已将四类 replay-repair feedback 蒸馏改为会话级，但 completion-preservation repair 的下游闭环仍有裸 `groupId` 路径：

1. compact outcome 与 repair work item 可能按群聊共享。
2. 相同 assignment、packet、failed/corrected outcome ID 在兄弟会话中可能碰撞。
3. dispatch candidate、brief、closure 与 typed memory 报表可能丢失 `gcs_*`。
4. typed MEMORY.md 虽写入 exact-session scope，WorkerContext 强制召回辅助链仍可能读取裸 scope。
5. 旧的无会话记忆会尝试构造新子 Agent 会话，既违反隔离，也无法满足新的 post-turn session identity 约束。

## 实现

### Repair 闭环会话所有权

- completion-preservation rows、work items 和 binding identity 均纳入 `groupSessionId`。
- compact outcome 从 exact-session ledger 读取；root binding ledger 只选择同一 `gcs_*` 的绑定。
- work item sidecar 按 exact session 读写，相同失败/纠正 outcome ID 在兄弟会话中仍保持独立。
- candidate、dispatch brief、closure、typed-memory 与 WorkerContext 报表全程传播 `groupSessionId`、`scopeId`、`typedScopeId` 和 `exactSession`。
- Memory Center 汇总同时展示根群聊数、scope 数、exact-session 数和 legacy 数。

### 类型化记忆与召回

- closure archive row identity 纳入根群聊与 exact session。
- ledger、archive 和 Markdown 持久化 `sourceGroupId`、`groupSessionId`、`exactSession`。
- Markdown 明确标注 `Exact group-chat session: gcs_*`。
- `buildAgentMemoryContextBundle()` 的 Provider ranking 与 post-compact repair recall 辅助链改为读取当前 `typedMemoryScopeId`，不再出现“写入 exact scope、召回裸 scope”。
- 两次新的子 Agent 执行分别建立 task/native session binding，并只召回所属 `gcs_*` 的闭环证据。

### Legacy 安全边界

- 历史裸群聊 typed memory 保持可读、可审计、可迁移。
- Memory Center 对这类数据返回 `status=legacy` 和 `legacyAutoInjectionBlocked=true`。
- legacy scope 不参与 fresh WorkerContext 自动注入质量分母，也不会被映射到虚构或默认 `gcs_*`。
- Provider ranking receipt 与 corrected receipt completion WorkerContext 报告同步采用该规则。

### 删除隔离

- 删除一个 `gcs_*` 会清理该会话的 outcome、work item、typed ledger 与 Markdown artifacts。
- 同一根群聊下的兄弟会话保持完整。
- 裸群级目录不会收到 exact-session closure 的副本。

## 主要文件

- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/collaboration/group-orchestrator.ts`
- `backend/modules/collaboration/memory.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `scripts/post-compact-completion-preservation-exact-session-closure-selftest.mjs`
- `scripts/replay-repair-feedback-exact-session-distillation-selftest.mjs`
- `package.json`

## 验收

新增命令：

```powershell
npm run test:post-compact-completion-preservation-exact-session-closure
```

结果：14/14 通过。

覆盖：

- A/B 两个 `gcs_*` 使用完全相同 assignment、packet、retry 和 outcome ID。
- assignment binding、repair work item、candidate 与 dispatch brief 均保持双 scope。
- corrected outcome 只能关闭所属会话的 work item。
- closure row ID 在相同逻辑 ID 下仍按会话区分。
- typed ledger、Markdown 和 fresh WorkerContext recall 均为 1 个根群聊、2 个 exact scope、0 个 legacy scope。
- A/B 私有 sentinel 不交叉。
- 裸群级 typed-memory 无污染。
- 删除 A 后 B 的文档保持不变。
- ledger 不保存 raw transcript body。

## 回归结果

- Phase 308 exact-session closure：14/14。
- Phase 307 exact-session feedback（含 Provider ranking WorkerContext）：13/13。
- Provider reliability promotion contract：通过。
- Worker compact exact-session distillation：通过。
- Provider generation restart reconciliation：通过。
- Group auto-compaction session scope：通过。
- Global Agent global-only context：通过。
- Provider ranking、corrected receipt completion、completion preservation closure 四组旧 Memory Center 自测：全部通过。
- `npm run build`：通过。

## 长期目标状态

Phase 308 完成，但 Claude Code 级记忆系统长期目标继续保持 active。后续阶段继续审计剩余裸群级长期反馈族及其 runtime recall 辅助链，优先处理任何可能把历史共享记忆自动注入新 `gcs_*` 的路径；全局 Agent 仍只消费全局上下文。
