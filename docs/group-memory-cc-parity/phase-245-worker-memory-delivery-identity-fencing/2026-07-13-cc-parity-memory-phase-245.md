# Phase 245: Worker Memory Delivery Identity Fencing

## 目标

在 Phase 244 的内容完整性胶囊之上补齐身份完整性，确保：

- 任务队列直接派发和 legacy 自动派发都先创建 task Agent session，再为该真实 session 召回群聊记忆。
- 一份 checksum 完全有效、但属于其他群聊、群聊会话、项目、任务或 task Agent session 的胶囊不能进入当前 Worker 提示词。
- recall scope 或 compact epoch 不匹配时同样 fail closed。
- 预先生成的旧 `worker_context_packet` 不能覆盖当前群聊会话刚生成的记忆包。
- Global Agent 仍只使用全局记忆和路由元数据，不接收群聊会话正文。
- legacy/default/废弃旧群聊会话继续直接删除，不迁移。

## 发现的缺口

Phase 244 已验证：

- 每行 content checksum。
- 整体 capsule checksum。
- required relPath 完整投递。

但完整性校验只证明“胶囊从生成后没有被改写”，不能证明“胶囊属于当前 Worker”。有效胶囊若被原样重放到另一身份，checksum 仍然成立。

审计还发现两条派发路径的顺序不一致：

- 群聊内 `@项目 Agent` 路径已先 `openTaskAgentSession`，再构建群聊记忆。
- 任务队列直接派发过去先构建记忆，之后才打开 task Agent session。
- `/api/tasks/auto-assign` 过去没有把 task Agent session 绑定进群聊记忆和 runner 调用。

这会让部分真实派发退化为 taskId scope，不能满足“每个项目子 Agent 会话都获得所属群聊当前会话记忆”的长期边界。

## 实现

### 1. Session-first 派发

任务队列直接派发现在按以下顺序执行：

1. `openTaskAgentSession`。
2. 将 `taskAgentSessionId`、native session、turn、taskId 和 `groupSessionId` 传入 `buildAgentMemoryContextBundle`。
3. 构建 WorkerContextPacket。
4. 使用同一个 task Agent session 调用第三方 Agent。

legacy 自动派发采用相同顺序，并补齐：

- task Agent session 创建与 runner 参数。
- native session 捕获。
- session turn 记录。
- 模型容量降级后的 packet revalidation。
- 未显式传 `group_id` 时回退到任务自身 `task.group_id`，不会因此漏掉群聊记忆。

### 2. Expected binding

新增 schema：

```text
ccm-worker-typed-memory-delivery-expected-binding-v1
```

Runtime Kernel 从当前 assignment、Worker packet 和当前 memory bundle 派生期望身份：

- `group_id`
- `group_session_id`
- `target_project`
- `task_id`
- `task_agent_session_id`
- `recall_scope`
- `compact_epoch`

expected binding 自身有稳定 SHA-256 checksum，并写入 WorkerContextPacket。

### 3. Integrity 与 identity 分离

胶囊校验现在分别输出：

- `checksum_valid`：正文、逐行 checksum、整体 checksum 和 relPath 完整性。
- `binding_valid`：胶囊身份是否与当前 expected binding 完全一致。
- `delivery_complete`：上游声明完整，且 integrity/binding 均通过。
- `trusted_for_delivery`：只有三者同时成立时才允许正文进入最终提示词。

这避免把“checksum 有效”错误解释成“可以给当前 Worker 使用”。

### 4. 七类重放 fail closed

以下任一不匹配都会产生明确 `binding_*_mismatch`，最终提示词只显示 `INVALID delivery capsule`，不输出胶囊正文：

- 跨群聊。
- 跨 `gcs_*` 群聊会话。
- 跨目标项目。
- 跨任务。
- 跨 task Agent session。
- 跨 recall scope。
- 跨 compact epoch。

identity 状态同步进入：

- memory recall trust contract。
- Worker acceptance contract。
- context usage。
- memory reinjection proof。
- 最终 WorkerContextPacket 渲染。

### 5. Prebuilt packet 重绑定

`buildSelfContainedWorkerHandoff` 收到旧 `worker_context_packet` 且本轮有当前 memory 时，不再直接复用旧 packet 的核心身份和记忆。

系统重新构建当前 packet，并以当前 assignment 覆盖：

- group/project/task。
- group session/task Agent session。
- memory、delivery capsule、trust contract 和 acceptance。

旧 packet 的非核心依赖、contract、repair brief 和 provider 证明仍可保留。重建结果记录：

```text
ccm-worker-context-current-memory-rebound-v1
```

因此全局任务或旧派发携带的 packet 不能绕过当前群聊会话的记忆身份校验。

## Claude Code 对齐

继续遵循 `D:\claude-code\src\utils\attachments.ts` 的核心方式：相关记忆作为当前会话中的独立、有界 attachment 注入，compact 后按当前消息流重新 surfaced，而不是把整个历史永久塞进上下文。

CCM 额外需要多群聊主 Agent、Global Agent 和第三方项目 Agent 的跨进程协作，因此在 Claude Code attachment 完整性之外增加 assignment identity fencing。这是 CCM 多 Agent 架构必须补齐的隔离层。

## 验证

- Phase 245 identity fencing：69/69。
- checksum 有效的跨群聊重放：拒绝。
- checksum 有效的跨群聊会话重放：拒绝。
- checksum 有效的跨项目重放：拒绝。
- checksum 有效的跨任务重放：拒绝。
- checksum 有效的跨 task Agent session 重放：拒绝。
- checksum 有效的跨 recall scope 重放：拒绝。
- checksum 有效的跨 compact epoch 重放：拒绝。
- 被拒绝胶囊正文不进入最终提示词：通过。
- wrapper `ccm-worker-memory-context-v1` 正常身份投递：通过。
- prebuilt stale packet 使用当前 memory 重建：通过。
- 直接派发 session-first：通过。
- 自动派发 session-first：通过。
- Phase 244 delivery capsule：21/21。
- Phase 243 task-session recall：15/15。
- Phase 242 stale candidate lifecycle：36/36。
- Phase 241 recall freshness/trust：14/14。
- typed-memory semantic reference：20/20。
- typed-memory consumption feedback：18/18。
- Runtime Kernel self-test：通过。
- Worker context usage self-test：通过。
- Worker handoff self-test：通过。
- 后端 TypeScript 构建：通过。
- `npm run check`：通过。
- Phase 245 相关文件 `git diff --check`：通过。
- Phase 245 自测残留：0。

## 稳定边界

- 每次项目子 Agent 任务派发必须先获得真实 task Agent session，再召回记忆。
- 群聊记忆作用域必须是 `groupId--gcs_*`。
- 胶囊必须同时通过 integrity、expected identity 和 complete gate。
- 当前 assignment memory 必须覆盖 prebuilt packet 的旧核心身份；旧 packet 只可贡献非核心证据。
- 新 task Agent session 必须重新召回；同 session、同 compact epoch、同文档 checksum 内才去重。
- Global Agent 不得接收群聊会话正文。
- 旧 legacy/default 会话直接删除，不迁移。

## 生产状态

- 服务：`http://localhost:3081`
- PID：`1132`。
- HTTP `/api/groups`：200。
- 新进程加载 `ccm-worker-typed-memory-delivery-expected-binding-v1`。
- 新进程加载 `ccm-worker-context-current-memory-rebound-v1`。
- `gmps7ha15::gcs_mriu5m33_ahy0yo`：sessions 1、archived 0、legacy 0、stale candidate checksum valid、pending 0。
- `gmqbz18hj::gcs_mriu5m6i_2vpxc9`：sessions 1、archived 0、legacy 0、stale candidate checksum valid、pending 0。
- `gmr02wpbv::gcs_mriu5m94_sfq6ix`：sessions 1、archived 0、legacy 0、stale candidate checksum valid、pending 0。
- 裸群级 stale-candidate scope：HTTP 400。
- Phase 245 server error log：0 字节。

## 长期目标状态

Phase 245 完成后，“CCM 记忆系统持续对齐 Claude Code”长期目标继续保持 active。
