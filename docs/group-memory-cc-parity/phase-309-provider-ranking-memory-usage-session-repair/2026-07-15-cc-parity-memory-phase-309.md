# CCM Memory Phase 309: Provider Ranking Memory Usage Session Repair

日期：2026-07-15

## 目标

将 Provider ranking typed memory 的使用合同、子 Agent 回执、缺失回执修复、主 Agent 派发计划、feedback MEMORY.md 和后续 WorkerContext 再注入全部提升为严格的 `groupId + gcs_*` 会话所有权。

## 问题

Phase 307/308 已让 Provider ranking 基础记忆和召回使用 exact-session ledger，但下游使用纪律链仍存在共享状态：

1. Memory usage contract 质量报告从裸 `groupId` 构造新子 Agent 上下文。
2. 同一群聊的 receipt gaps 汇总到同一个 repair work-item ledger。
3. candidate identity 未包含 `gcs_*`。
4. dispatch plan 仍是根群聊单文件，A 会话更新可能 supersede B 会话 brief。
5. receipt-discipline feedback MEMORY.md 写入裸群聊 typed-memory 目录。
6. WorkerContext injection 从裸群聊读取 repair archive。

## 实现

### 使用合同与回执

- Provider ranking memory usage contract 按 typed-memory exact scope 构造。
- 每次质量探测绑定明确的 `groupSessionId`、task Agent session、native session 和 execution。
- 旧的无 `gcs_*` archive 返回 `legacyAutoInjectionBlocked=true`，不会自动注入新子 Agent。
- receipt report 从根 binding ledger 按 `groupSessionId` 分桶；A/B 的缺失回执只进入所属会话。

### Repair Work Item 与 Candidate

- repair work-item ID 纳入 `groupSessionId`。
- work item 持久化 `scopeId`、`typedMemoryScopeId`、`groupSessionId` / `group_session_id`。
- exact work-item ledger 使用 `group/gcs_*.json` sidecar。
- generic replay-repair candidate identity 纳入 `gcs_*`，并镜像会话字段。
- candidate / brief metadata gate 校验 session 一致性。

### Dispatch Plan 物理隔离

- orchestrator dispatch-plan ledger 新增 exact-session 文件布局：`group-memory-replay-repair-dispatch-plans/<group>/<gcs_*>.json`。
- legacy 调用继续读取原根群聊文件。
- exact sync、read、supersede 和 brief generation 只操作所属会话文件。
- 删除群聊会话时同步清理 exact dispatch-plan ledger。

### Feedback Typed Memory

- provider-ranking memory-usage receipt repair row identity 纳入 `groupSessionId`。
- normalizer、archive 和 ledger 持久化 `sourceGroupId`、`groupSessionId`、`exactSession`。
- feedback Markdown 明确标注 `Exact group-chat session: gcs_*`。
- Memory Center 分别在 `${groupId}--${groupSessionId}` 执行 distill、document scan 和 recall probe。
- 裸群聊目录不会收到 exact-session feedback 副本。

### WorkerContext 再注入

- injection report 直接消费 typed report 的 exact scopes。
- repair discipline archive 只从所属 `${groupId}--${gcs_*}` 读取。
- WorkerContext contract 同时要求 primary Provider ranking memory 和 receipt-discipline memory。
- 每个会话独立验证 `memoryUsed`、`memoryIgnored`、`usageState`、ranking-evidence-not-authorization 和 fresh provider-switch receipt 边界。

## 主要文件

- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/collaboration/group-orchestrator.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `scripts/provider-ranking-memory-usage-exact-session-repair-selftest.mjs`
- `package.json`

## 验收

新增命令：

```powershell
npm run test:provider-ranking-memory-usage-exact-session-repair
```

结果：14/14 通过。

覆盖：

- A/B 两个 `gcs_*` 使用相同 binding、assignment、dispatch 和 packet ID。
- 两个会话分别获得 active memory usage contract。
- 原始缺失回执检查按预期失败，但每个 gap 仅进入所属 exact scope。
- repair work item ID 不碰撞。
- candidate 与 brief 均保留正确会话。
- dispatch plan 使用两个不同的物理文件。
- feedback archive row ID 不碰撞，Markdown 不串联 sentinel。
- WorkerContext injection 对 1 个根群聊报告 2 个 exact scope、0 个 legacy scope。
- 裸群聊 typed-memory 无污染。
- 删除 A 后 B 的 work item、dispatch plan 和 typed memory 保持完整。
- ledger 不保存 raw transcript body。

## 回归结果

- Phase 309 exact-session repair：14/14。
- Phase 308 completion-preservation closure：14/14。
- Phase 307 replay-repair feedback：13/13。
- Worker compact exact-session distillation：通过。
- Provider reliability promotion：通过。
- Provider generation restart reconciliation：通过。
- Group auto-compaction session scope：通过。
- Global Agent global-only context：通过。
- Provider ranking usage/repair 8 组旧 Memory Center 自测：全部通过。
- Completion preservation 2 组旧 Memory Center 自测：全部通过。
- `npm run build`：通过。

## 长期目标状态

Phase 309 完成，但 Claude Code 级记忆系统长期目标继续保持 active。下一阶段继续处理 completion-preservation closure usage feedback、conflict arbitration / resolution 等仍使用裸群级 usage ledger 的下游链，并保持全局 Agent 只消费全局上下文。
