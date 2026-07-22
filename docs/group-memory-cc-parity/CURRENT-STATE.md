# CCM 记忆系统当前状态

Date: 2026-07-18

## 完成状态

全局 Agent、群聊主 Agent、项目会话和 `tas_*` worker 已统一到 Claude Code 风格的会话压缩不变量。当前目标已完成，后续进入维护模式，不再并行保留本地摘要、字符裁剪或固定消息条数等过渡方案。

## 核心不变量

- 正式摘要只能来自模型或通过身份、游标和 checksum 校验的模型 Session Memory。
- 本地规则只估算 token 和校验保真，不能提交为 canonical summary。
- 每次压缩都把上一轮摘要带入下一轮，形成 S1 -> S2 -> S3 lineage。
- 原始 transcript 永不因压缩删除；compact head 只改变下一轮模型可见上下文。
- 正式压缩前使用精确会话全部原文；正式压缩后使用模型摘要、`10K-40K token` 动态近期原文、恢复上下文和 hooks 结果。
- 压缩候选仍超过阈值时 fail closed，不推进边界，不调用 Provider。
- 同一精确会话连续三次失败后熔断，兄弟会话不受影响。

## 当前数据流

```text
Global Agent session
  -> 全局长期记忆
  -> 当前 global session 的摘要 + 动态近期原文
  -> 给群聊主 Agent 分派工作

Group gcs_* session
  -> 当前会话 transcript
  -> Session Memory 或模型摘要
  -> 摘要 + 动态近期原文 + 恢复上下文
  -> 群聊主 Agent
  -> tas_* 正式连续性快照
  -> 最终 Provider 容量 gate

Project session
  -> 稳定 CCM 项目会话
  -> 第三方 Agent 原生 generation
  -> 服务端记录 Provider usage
  -> 成功 compact 后才轮换 generation
  -> 未压缩：全部原文注入新 generation
  -> 已压缩：摘要 + 动态近期原文注入新 generation
```

Global Agent 只使用全局长期记忆和当前全局会话连续性，严格排除群聊 transcript、群聊记忆和项目记忆。

音乐 Agent 不提供用户会话列表。它使用固定 `music-agent` 单例 transcript：未压缩时读取全部音乐对话，压缩后读取正式模型摘要和动态近期完整原文；明确的跨轮次音乐偏好由模型提取到独立长期音乐记忆。全局 Agent 点歌只复用统一播放器，不把全局会话注入音乐 Agent。

浏览器入口现在由本地账户会话保护：首次启动自动创建 `mumulin` 管理员，首次安装引导会显示注册入口，完成首次登录/注册后注册默认关闭，管理员可在系统设置的“账户与安全”中开启或关闭注册。账户密码使用 scrypt 哈希保存，登录态使用 HttpOnly Cookie；这属于应用访问控制，不会把账户信息混入任何 Agent 记忆上下文。

## 共享压缩核心

共享实现位于 [session-compaction-core.ts](../../backend/system/session-compaction-core.ts)，统一提供：

- `SessionCompactionStateV2` 惰性规范化；
- usage 身份绑定和锚点后新增消息估算；
- `input + cache_creation + cache_read + output` 口径；
- 模型容量减 `20K` 摘要输出预留和 `13K` 自动压缩缓冲；
- 至少 `10K token`、至少 5 条文本消息、约 `40K token` 上限的完整轮次窗口；
- Session Memory 的 `10K` 初始化、增长 `5K` 或约 3 次工具调用更新、压缩前最多等待 15 秒；
- 三次失败熔断、压缩后门禁和 `pre_compact -> session_start -> post_compact` 生命周期。

Provider usage 必须匹配 `scope/session/provider/model/generation/boundaryGeneration/anchorMessageId`。模型、会话、generation 或 compact 边界改变后，旧基线失效；无可信 usage 时估算完整模型 payload，而不是只计算消息正文。

完整 payload 还绑定 `payloadChecksum` 和 `fixedContextChecksum`。system、工具定义、恢复上下文或 hook 结果变化后，旧 usage 不再参与触发；压缩后 gate 覆盖 pending request、恢复附件与 `session_start` 输出。

## 四条链路

### 全局会话

- `memory.sessions[].compaction` 保存精确会话 V2 状态。
- 第二次及以后压缩携带上一轮摘要、checksum 和消息区间。
- 从加密 transcript 构建动态近期窗口，不再使用固定 `history.slice(-10)`。
- 每轮调用保存最新 Provider usage；累计 usage 只用于费用统计。
- 删除 Web 会话会清理该会话压缩状态和加密 transcript，不删除全局长期记忆。

### 群聊会话

- 多群聊和多 `gcs_*` 的 transcript、Session Memory、compact head、工具闭包和恢复状态继续隔离。
- 群聊主 Agent 未达到压缩线时使用当前精确会话全部原文，不再使用固定 20/12 条窗口或本地旧消息摘要。
- 每次主 Agent Provider 调用前同步测量完整 system、Skill、共享文件、RAG、恢复指令、会话和当前请求；达到容量线后在同一轮正式压缩并重建。
- 群聊配置的 Skill 现在同时供群聊主 Agent 和项目子 Agent 使用；主 Agent 可按当前精确群聊授权调用只读 MCP，工具结果回注同轮规划并参与最终容量门禁。
- 共享文件由主 Agent 读取并提炼到自包含工作单；项目子 Agent 不会无条件加载整份群聊共享文件，但会收到与任务相关的规则、来源和验收要求。
- 主 Agent Provider PTL 恢复不再调用 48K 字符首尾裁切，改走受精确会话熔断约束的正式模型压缩。
- 无自定义 `/compact` 要求时优先使用已验证 Session Memory；自定义要求直接调用模型摘要。
- 模型或 Session Memory 候选超阈值时不提交 compact head。
- typed memory 蒸馏仍服务长期检索，但不参与生成 canonical session summary。

### 项目会话

- 一个项目可以有多个稳定 CCM 会话；一条会话可连续复用第三方 Agent 原生 session/generation。
- 新原生 generation 启动且尚未正式压缩时，注入当前项目会话的全部历史原文；只有存在可信模型摘要后才切换为摘要加动态近期窗口。
- 前端已预存的当前用户消息按角色和完整内容精确去重；直接 API 未预存当前请求时不会误删上一条 Agent 回复。
- 支持 MCP 的 Codex、Claude Code 和 Cursor 使用签名 `project_session` 记忆快照：首次读取完整未压缩历史，后续同世代只读取消息和记忆增量。
- MCP 未同步时继续使用完整 Prompt；MCP 已同步但必需记忆未读完时，修改任务失败且不提交长期记忆。
- Provider usage 由服务端完成调用时记录，不依赖前端回传。
- 摘要保留 lineage，S2/S3 不覆盖丢失 S1 中仍有效的信息。
- 只有 compact 事务提交成功才轮换原生 generation。
- 删除、清空或替换消息会失效对应 usage、Session Memory 游标和 compact 边界。

### `tas_*` worker

- 父群聊尚未正式压缩时，直接使用当前精确 `gcs_*` 的全部原始消息，不使用固定 15 条、字符截断或本地摘要。
- 最终完整 prompt 达到项目子 Agent 的真实模型触发线后，先执行父群聊正式模型压缩，再重建 invocation、memory bundle、handoff、契约和快照。
- 正式压缩后使用模型摘要或 Session Memory 加动态近期完整原文；压缩前后都保持父会话与 `tas_*` 的精确身份绑定。
- 运行时切换到更小容量的 fallback Provider 后，会按新模型重新执行门禁、正式压缩和一次完整重建。
- 不再生成相互冲突的本地 worker summary，也不做字符级 prompt projection。
- Provider 原生 compact 无法证明真实执行时，当前 generation 失效并要求新 generation 回注正式上下文。
- 模型压缩失败或压缩后最终 payload 仍超阈值时禁止 Provider 调用；原 transcript 与旧 compact head 保持不变。
- 用户不能直接调用群聊成员或广播成员；所有群聊任务由群聊主 Agent 分派，并统一使用当前精确父会话上下文。
- 项目子 Agent通过签名 `ccm__knowledge_context` MCP 读取父群聊连续性、相关群聊记忆和目标项目长期记忆；bootstrap Prompt 不再重复展开完整 memory envelope。
- 子 Agent 的 MCP 候选先合并到结构化回执，只有群聊主 Agent验收通过后才能进入现有长期记忆 admission。

## Memory Center

Memory Center 分别列出：

- 全局 Agent 父节点下的全局长期记忆与全局会话列表；
- 每个群聊父节点下的 `gcs_*` 会话列表；
- 每个项目父节点下的项目长期记忆与项目会话列表；
- 可展开的 `tas_*` 任务 Agent 会话列表。

群聊、项目和任务 Agent 默认收起，点击指定父节点后才展示它自己的会话。没有已保存压缩状态的真实群聊会话也会显示为空会话，不再只投影已有 memory JSON 的会话。

精确会话详情只展示正式模型摘要、真实近期原文和压缩状态。本地 `factAnchors / decisions / nextActions` 运行流水不再作为会话记忆展示或注入模型；deterministic Session Memory fallback 不再标记为 ready。

全局、群聊和项目的用户可见会话已统一模型自动命名：首轮 Agent 回复后根据完整首轮语义生成标题，不再截取用户首句；手动标题永不被覆盖。

每个精确会话展示当前 token、自动阈值、摘要来源、近期窗口、Session Memory、压缩后门禁、连续失败和熔断状态。模型容量、自动阈值和 Session Memory 参数从用户设置进入所有链路，并允许 scope 覆盖。

## 当前代码入口

- 共享核心：[session-compaction-core.ts](../../backend/system/session-compaction-core.ts)
- 全局会话记忆：[memory.ts](../../backend/agents/global/memory.ts)
- 全局调用链：[loop.ts](../../backend/agents/global/loop.ts)
- 群聊压缩：[group-memory-compaction.ts](../../backend/modules/collaboration/group-memory-compaction.ts)
- 群聊 worker 上下文：[group-orchestrator-worker-context.ts](../../backend/modules/collaboration/group-orchestrator-worker-context.ts)
- 项目压缩：[project-session-compaction.ts](../../backend/modules/projects/project-session-compaction.ts)
- 项目会话：[sessions.ts](../../backend/modules/projects/sessions.ts)
- 任务 Agent 会话：[agent-sessions.ts](../../backend/tasks/agent-sessions.ts)
- 最终容量 gate：[final-dispatch-payload-gate.ts](../../backend/agents/final-dispatch-payload-gate.ts)
- worker fail-closed：[final-dispatch-reactive-compact.ts](../../backend/agents/final-dispatch-reactive-compact.ts)
- Memory Center API：[memory-control-center-handler.ts](../../backend/modules/knowledge/memory-control-center-handler.ts)
- Memory Center 前端：[MemoryCenterPanel.vue](../../frontend/src/components/knowledge/MemoryCenterPanel.vue)
- 第三方 Agent 记忆快照：[third-party-memory-snapshot.ts](../../backend/integrations/third-party-memory-snapshot.ts)
- 第三方 Agent 记忆 MCP：[knowledge-context-mcp.ts](../../backend/integrations/knowledge-context-mcp.ts)

## 验收证据

- 共享全链路：`51/51`；
- 全局模型压缩：`34/34`，包含 S1 -> S2 -> S3；
- 项目会话与原生绑定：`84/84`，包含压缩前完整原文、当前请求去重与 S1 -> S2 -> S3；
- 第三方 Agent 记忆 MCP：`49/49`，包含三种运行时、全量/增量、重加载、隔离和受控写回；
- 动态窗口：`23/23`；
- 群聊 CC 核心：`18/18`；
- 群聊 Session Memory 选择：`15/15`；
- 精确会话隔离：`8/8`；
- Memory Center：`23/23`，覆盖四类精确会话；
- Provider usage baseline：`35/35`；
- Provider identity baseline：`23/23`；
- production build：frontend、MCP、backend 全部通过；
- 浏览器：`1280x720` 与 `390x844` 无横向溢出，列表和详情独立滚动，记忆中心 console error 为 0；
- 测试真实付费 Provider 调用：`0`。

专项记录见 [all-session-cc-compaction-alignment-2026-07-18](./all-session-cc-compaction-alignment-2026-07-18/README.md)。

最后一批源码差异收口见 [cc-source-parity-closure-2026-07-18](./cc-source-parity-closure-2026-07-18/README.md)。

2026-07-20 收口：群聊用户入口只保留主 Agent，项目成员仅能由主 Agent 内部分派；全局 Agent 每次 Provider 调用前按真实最终消息执行自动压缩预检，并在提交边界前完成候选上下文重建和后置门禁。专项记录见 [group-main-only-global-provider-cc-context-2026-07-20](./group-main-only-global-provider-cc-context-2026-07-20/README.md)。

2026-07-20 项目会话补齐：新第三方 Agent generation 在正式压缩前回注全部项目会话原文，正式压缩后才使用摘要与动态近期原文；当前用户请求改为精确去重，不再盲删最后一条历史。专项记录见 [project-session-precompact-full-context-2026-07-20](./project-session-precompact-full-context-2026-07-20/README.md)。

2026-07-20 第三方 Agent 记忆 MCP：现有知识 MCP 扩展为签名会话与长期记忆读取桥梁；独立项目和群聊子 Agent采用 MCP 优先、全量首读、同世代增量、压缩后重加载及候选验收写回。专项记录见 [third-party-agent-memory-mcp-hydration-2026-07-20](./third-party-agent-memory-mcp-hydration-2026-07-20/README.md)。

## 维护边界

不新增 live soak、成本审批、replay 工单、WAL 或主界面诊断卡片。只有真实生产故障、明确性能数据或 Claude Code 的核心行为发生变化时才扩展状态；其余优先修复、合并和删除。
