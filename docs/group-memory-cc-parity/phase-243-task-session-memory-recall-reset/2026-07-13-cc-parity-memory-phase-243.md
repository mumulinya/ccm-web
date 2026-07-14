# Phase 243: Task Session Memory Recall Reset

## 目标

修复类型化记忆召回账本以项目名作为长期去重作用域的问题，确保：

- 每个新建的项目子 Agent task session 都能收到所属 `groupId--gcs_*` 群聊会话的相关记忆。
- 同一 task Agent session、同一 compact epoch、同一文档 checksum 内才允许去重。
- 同路径记忆内容更新后必须重新下发。
- 群聊发生新的 compact boundary 后，同一子 Agent session 也必须重新获得相关记忆。
- Global Agent 边界不变；本阶段只改变子 Agent 的群聊类型化记忆去重范围。

## Claude Code 源码依据

对照 `D:\claude-code`：

- `src/utils/attachments.ts:2248-2250` 明确说明 surfaced memory 从当前消息流扫描；compact 后旧 attachment 消失，去重和累计字节限制会自然重置。
- `src/utils/attachments.ts:2270` 起按相关性读取记忆文件并注入，而不是把某个项目曾经看过的路径永久排除。
- `src/services/extractMemories/prompts.ts:78` 将 `MEMORY.md` 固定为始终加载的简洁索引，并限制为前 200 行。

CCM 已有 200 行/25KB `MEMORY.md` 索引、语义召回和最多 5 条相关文档注入，但旧 recall ledger 使用 `targetProject` 作为 scope。结果是同一项目第一次任务看过某个 relPath 后，后续新任务会话可能被误判为 already surfaced。

## 实现

### 1. Task session 作用域

`buildChildTypedMemoryRecallLedgerScope` 生成：

```text
child-agent:<project>:<taskAgentSessionId|taskId|preview>:<compactEpoch>
```

优先级：

- 有 `taskAgentSessionId`：按真实 task Agent session 去重。
- 没有 session 但有 `taskId`：按任务去重。
- 仅预览调用：使用 project preview scope，不污染真实任务 session。

群聊会话隔离仍由外层 typed-memory 目录 `groupId--gcs_*` 保证，因此相同 task/session 字符串也不能跨群聊会话共享去重状态。

### 2. Compact epoch 重置

compact epoch 依次取：

- compact boundary id。
- compaction summary checksum。
- message compression summary checksum。
- 尚未压缩时使用 `precompact`。

非 `precompact` 值只保存 SHA-256 派生的短标识。新的 compact boundary 会得到新的 ledger scope，相关记忆可以重新注入，行为与 Claude Code compact 后 attachment 去重自然重置一致。

### 3. 文档 checksum 绑定

`.recall-ledger.json` 的每个 surfaced relPath 新增 `documentChecksum`。

读取 already-surfaced 时，平台重新扫描当前 `groupId--gcs_*` 记忆目录，只有 ledger checksum 与当前 MEMORY 文档 checksum 完全一致才去重。旧账本条目没有 checksum 时按未下发处理；同路径正文、frontmatter 或稳定元数据变化后会自动重新召回。

### 4. 有界历史

session scope 增多后，账本按 `updatedAt` 只保留最近 160 个 scope；每个 scope 仍只保留最近 200 个文档条目。recall ledger 只是上下文优化记录，不是 tombstone 或授权记录，因此清退旧 scope 的安全结果是未来多下发一次记忆，不会丢失长期记忆或用户确认状态。

### 5. Worker 可审计信息

`group_state.typedMemory.ledger` 和渲染后的 WorkerContextPacket 现在包含：

- scope。
- scopeKind。
- taskAgentSessionId / taskId。
- compactEpoch。
- sessionBound。
- 明确的去重边界说明。

## 验证

- Phase 243 task-session recall：15/15。
- Session A 首次召回：通过。
- Session A 同 epoch、同 checksum 重复构建去重：通过。
- Session B 新 task Agent session 重新召回：通过。
- 同路径文档从 v1 更新到 v2 后 Session A 重新召回：通过。
- compact epoch 变化生成新 scope：通过。
- scope 数量稳定限制为 160：通过。
- Phase 242 stale candidate lifecycle：36/36。
- Phase 241 recall freshness/trust：14/14。
- typed-memory consumption feedback：18/18。
- semantic natural-language recall：20/20。
- 基础 typed MEMORY.md index/recall 自测：9/9。
- `npm run check`：通过。
- 后端 TypeScript 构建：通过。
- Phase 243 自测残留：0。

## 生产状态

- 服务：`http://localhost:3081`
- PID：`30664`。
- HTTP `/api/groups`：200。
- 新进程加载的 dist 包含 `same_task_agent_session_and_compact_epoch_and_document_checksum` 去重边界。
- `gmps7ha15::gcs_mriu5m33_ahy0yo`：sessions 1、archived 0、legacy 0、stale candidate checksum valid、pending 0。
- `gmqbz18hj::gcs_mriu5m6i_2vpxc9`：sessions 1、archived 0、legacy 0、stale candidate checksum valid、pending 0。
- `gmr02wpbv::gcs_mriu5m94_sfq6ix`：sessions 1、archived 0、legacy 0、stale candidate checksum valid、pending 0。
- 裸群级 stale-candidate scope：HTTP 400。
- Phase 243 server error log：0 字节。

## 长期目标状态

Phase 243 完成后，“CCM 记忆系统持续对齐 Claude Code”长期目标继续保持 active。
