# CCM Memory Phase 277: Distillation Preflight And Zero-Write Skip

## 目标

让每个 `groupId--gcs_*` 群聊会话在构建子 Agent 上下文时，先判断长期记忆蒸馏是否真的有增量工作。游标已经追平且没有维护或恢复任务时，不再获取蒸馏事务锁、不再运行 artifact 恢复扫描，也不再改写事务状态文件。

## Claude Code 对照结论

参考：

- `D:\claude-code\src\services\extractMemories\extractMemories.ts`
- `D:\claude-code\src\services\autoDream\autoDream.ts`
- `D:\claude-code\src\services\autoDream\consolidationLock.ts`

Claude Code 把两类工作分开：

- 增量 extraction 在会话过程中按游标处理新模型可见消息，并抑制与直接记忆写入重复的提取。
- auto-dream 是跨会话的周期性整理，默认使用 24 小时和 5 个会话门槛，并通过可回滚锁防止重复执行。

CCM 的 `distillGroupMessagesToTypedMemoryUntilCaughtUp()` 对应前者。不能把 auto-dream 的时间/会话门槛直接套在它上面，否则群聊新消息无法及时成为下一次第三方子 Agent 会话的上下文。本阶段只消除游标追平后的无效事务开销，不延迟真实增量记忆。

## 实现

### 锁前只读探针

`backend/modules/collaboration/group-memory-index.ts` 新增：

- `inspectGroupTypedMemoryDistillationWork()`
- `ccm-group-typed-memory-distillation-preflight-v1`

探针按当前会话作用域检查：

- committed cursor 后的新消息；
- cursor 丢失后的 transcript fallback；
- `forceDistillationRescan`；
- 不再满足写入准入的旧事实；
- 重复计数修复；
- 有变化的 post-compact usage archive；
- 残留事务锁；
- prepared/corrupt artifact journal；
- artifact stage；
- started/in-progress/failed 事务状态。

### 零写入跳过

当探针确认没有工作时，蒸馏返回：

- `reason=no_new_messages_after_committed_cursor`
- `transaction.status=preflight_skipped`
- `transaction.lockAcquired=false`
- `writeCount=0`

不会触碰 `.distillation-transaction-state.json` 的 mtime，也不会创建另一个群聊会话的事务文件。

### 恢复边界

已提交的 terminal artifact journal 是审计凭据，不是故障，不会重新开闸。以下状态仍会强制进入原事务与恢复路径：

- `prepared` journal；
- journal checksum/identity 损坏；
- artifact stage 仍存在；
- stale/active lock；
- started、in-progress 或 failed 事务状态。

因此零写入优化不会绕过 Phase 271-273 的 fencing、锁接管和 artifact rollforward/rollback。

### Memory Center

`backend/modules/knowledge/memory-control-center.ts` 在当前 `groupId + groupSessionId` 消息集上运行同一个只读探针，并返回 `typedMemory.distillationPreflight`。

`frontend/src/components/knowledge/MemoryCenter.vue` 新增“蒸馏增量探针”面板，显示：

- 待处理消息和当前批次；
- 事务锁 required/skipped；
- 维护原因；
- 恢复原因。

## 会话隔离

- 所有检查和文件仍绑定 `groupId--gcs_*`。
- 空的其他会话不会因当前会话蒸馏而创建事务状态。
- 全局 Agent 的全局上下文边界没有变化。
- 旧 `default` 会话不迁移、不恢复。

## 验证

新增命令：

```text
npm run test:group-typed-memory-distillation-preflight
```

专项测试 `10/10`：

- 首次增量通过事务提交；
- 追平探针在锁前跳过；
- 跳过不修改事务状态 mtime；
- 新消息重新开闸并可召回；
- 空的其他会话不创建事务状态；
- force rescan 仍获取事务；
- Memory Center 显示当前会话探针；
- terminal journal 不误判为恢复任务。

相关回归：

- Phase 269 增量游标：13/13；
- Phase 274 直接写入提取抑制：13/13；
- Phase 273 artifact 事务恢复：13/13；
- Phase 271 事务 fencing：13/13；
- Phase 272 共享账本并发：15/15；
- Phase 275 自动压缩会话作用域：12/12；
- Phase 276 完整索引有界投影：11/11；
- typed memory 写入准入：22 项；
- Memory Center 会话作用域：13/13；
- 知识页桌面/移动端渲染：全部通过；
- `npm run build`：通过。

## 运行态

- 服务：`http://localhost:3081`
- PID：`21392`
- HTTP：200
- stderr：0 bytes
- MCP：`fetch-web-mcp`、`filesystem-mcp`、`mcp-feishu` 均已连接
- 会话生命周期头：2 个有效，0 个失败

## 结果

CCM 仍会及时把当前群聊会话的新事实蒸馏为可供新子 Agent 会话使用的 typed memory，但在没有任何增量或维护工作的普通上下文构建中，不再制造无意义的锁竞争和磁盘事务写入。用户可以在 Memory Center 直接看到本次为何需要或不需要蒸馏。
