# Phase 244: Worker Typed Memory Delivery Capsule

## 目标

保证群聊类型化记忆不只在召回层显示成功，而是稳定进入第三方项目子 Agent 的最终提示词：

- 每个项目子 Agent task session 使用所属 `groupId--gcs_*` 群聊当前会话的相关记忆。
- Global Agent 边界不变，只使用全局记忆和群聊路由元数据，不接收群聊会话正文。
- 类型化记忆正文不再依赖普通 `rendered_text` 在多次预算裁剪后恰好幸存。
- 胶囊绑定群聊、群聊会话、项目、任务、task Agent session、recall scope 和 compact epoch。
- 任意正文或元数据被篡改时 fail closed，不把不可信正文交给 Worker。
- legacy/default/废弃旧会话仍直接删除，不参与迁移或投递。

## Claude Code 源码依据

对照 `D:\claude-code\src\utils\attachments.ts`：

- `269` 附近对单个记忆文件限制 200 行。
- `277` 附近对单个记忆 attachment 限制 4096 bytes。
- `2248` 附近从当前消息流判断 surfaced memory；compact 后旧 attachment 离开当前上下文，去重自然重置。
- `2270` 附近将相关记忆作为独立 attachment 注入，而不是只拼入一段可被后续整体截断的通用上下文。

CCM 的实现保持相同原则：先按任务语义召回少量相关文档，再生成独立、有界、可校验的投递附件。这里不是把完整记忆库或数 MB 历史粗暴蒸馏为一段文本。

## 实现

### 1. 会话绑定的投递胶囊

新增 schema：

```text
ccm-child-typed-memory-delivery-capsule-v1
```

每个胶囊绑定：

- `group_id`
- `group_session_id`
- `target_project`
- `task_id`
- `task_agent_session_id`
- `recall_scope`
- `compact_epoch`

因此不同群聊、不同 `gcs_*` 会话、不同项目任务或新建的第三方 Agent 会话不会复用同一个未绑定正文包。

### 2. 有界相关内容，而非全库压缩

胶囊只读取本轮 `typed_memory_recall.recalled` 中排名靠前的相关文档：

- 最多 5 个文档。
- 胶囊正文默认最多约 4800 字符。
- 每个文档正文默认最多约 1200 字符。
- 每行保留 relPath、类型、名称、相关性分数、stale 状态和 truncated 状态。

容量限制作用在已经经过当前任务语义召回的文档摘录上，不会直接压缩 3MB 群聊历史。原始记忆文件仍完整保存在当前群聊会话自己的类型化记忆目录中，当前源码在冲突时始终优先。

### 3. 双层完整性校验

每个文档行包含：

- `document_checksum`：绑定召回时的稳定记忆文档版本。
- `content_checksum`：绑定实际送入 Worker 的有界正文。

整个胶囊另有 `capsule_checksum`，覆盖会话身份、任务身份、recall scope、compact epoch、必需 relPath 列表和每一行正文。Runtime Kernel 不信任上游声明，会重新计算逐行 checksum 和整体 checksum，并验证所有必需 relPath 均已投递。

### 4. 最终提示词优先投递

`renderWorkerContextPacket` 将独立的 `Typed memory delivery capsule` 放在：

- 普通群聊记忆文本之前。
- memory recall trust contract 之前。
- 后续大量 proof、replay 和 acceptance 信息之前。

这样即使普通 `rendered_text` 先从约 14K 被压到约 5K，任务相关类型化记忆正文仍通过独立胶囊进入最终第三方 Agent 提示词。

### 5. Fail closed 与可审计绑定

Runtime Kernel 遇到以下任一情况都会判定胶囊无效：

- relPath 缺失。
- document checksum 缺失。
- 正文缺失。
- content checksum 不匹配。
- capsule checksum 不匹配。
- 必需 relPath 未完整投递。

无效时最终提示词只显示 `INVALID delivery capsule` 和校验问题，不输出被篡改正文。以下结构同时绑定胶囊状态：

- memory recall trust contract。
- Worker acceptance contract。
- context usage 分类。
- memory reinjection proof。

## 验证

- Phase 244 delivery capsule：21/21。
- 最终 Worker prompt 包含类型化记忆 sentinel：通过。
- 普通记忆文本被额外裁剪时，独立胶囊仍保留正文：通过。
- 篡改单行正文后 content/capsule checksum 失败：通过。
- 篡改正文不会进入最终 Worker prompt：通过。
- Phase 243 task-session recall：15/15。
- Phase 242 stale candidate lifecycle：36/36。
- Phase 241 recall freshness/trust：14/14。
- typed-memory semantic reference：20/20。
- typed-memory consumption feedback：18/18。
- Runtime Kernel self-test：通过。
- Worker context usage self-test：通过。
- Worker handoff self-test：通过。
- `npm run check`：通过。
- 后端 TypeScript 构建：通过。
- `git diff --check`（Phase 244 文件）：通过。
- Phase 244 自测残留：0。

## 稳定边界

- 群聊会话记忆作用域必须是 `groupId--gcs_*`。
- 新项目子 Agent task session 必须重新获得相关记忆；同 session、同 compact epoch、同文档 checksum 内才去重。
- Global Agent 不得接收群聊会话正文。
- 旧 legacy/default 会话直接删除，不迁移到活动会话。
- 胶囊只是任务相关上下文附件，不替代完整类型化记忆文件、当前源码验证或长期记忆生命周期。

## 生产状态

- 服务：`http://localhost:3081`
- PID：`26628`。
- HTTP `/api/groups`：200。
- 新进程加载的 dist 包含 `ccm-child-typed-memory-delivery-capsule-v1`。
- `gmps7ha15::gcs_mriu5m33_ahy0yo`：sessions 1、archived 0、legacy 0、stale candidate checksum valid、pending 0。
- `gmqbz18hj::gcs_mriu5m6i_2vpxc9`：sessions 1、archived 0、legacy 0、stale candidate checksum valid、pending 0。
- `gmr02wpbv::gcs_mriu5m94_sfq6ix`：sessions 1、archived 0、legacy 0、stale candidate checksum valid、pending 0。
- 裸群级 stale-candidate scope：HTTP 400。
- Phase 244 server error log：0 字节。

## 长期目标状态

Phase 244 完成后，“CCM 记忆系统持续对齐 Claude Code”长期目标继续保持 active。
