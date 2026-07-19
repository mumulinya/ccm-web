# CCM 记忆系统当前状态

Date: 2026-07-18

## 完成状态

全局 Agent、群聊主 Agent、项目会话和 `tas_*` worker 已统一到 Claude Code 风格的会话压缩不变量。当前目标已完成，后续进入维护模式，不再并行保留本地摘要、字符裁剪或固定消息条数等过渡方案。

## 核心不变量

- 正式摘要只能来自模型或通过身份、游标和 checksum 校验的模型 Session Memory。
- 本地规则只估算 token 和校验保真，不能提交为 canonical summary。
- 每次压缩都把上一轮摘要带入下一轮，形成 S1 -> S2 -> S3 lineage。
- 原始 transcript 永不因压缩删除；compact head 只改变下一轮模型可见上下文。
- 模型可见上下文固定为正式摘要、`10K-40K token` 动态近期原文、恢复上下文和 hooks 结果。
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
  -> 摘要 + 动态近期原文注入新 generation
```

Global Agent 只使用全局长期记忆和当前全局会话连续性，严格排除群聊 transcript、群聊记忆和项目记忆。

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
- 无自定义 `/compact` 要求时优先使用已验证 Session Memory；自定义要求直接调用模型摘要。
- 模型或 Session Memory 候选超阈值时不提交 compact head。
- typed memory 蒸馏仍服务长期检索，但不参与生成 canonical session summary。

### 项目会话

- 一个项目可以有多个稳定 CCM 会话；一条会话可连续复用第三方 Agent 原生 session/generation。
- Provider usage 由服务端完成调用时记录，不依赖前端回传。
- 摘要保留 lineage，S2/S3 不覆盖丢失 S1 中仍有效的信息。
- 只有 compact 事务提交成功才轮换原生 generation。
- 删除、清空或替换消息会失效对应 usage、Session Memory 游标和 compact 边界。

### `tas_*` worker

- 直接使用父群聊或项目会话的正式摘要、Session Memory 和动态近期原文快照。
- 不再生成相互冲突的本地 worker summary，也不做字符级 prompt projection。
- Provider 原生 compact 无法证明真实执行时，当前 generation 失效并要求新 generation 回注正式上下文。
- 最终 payload 超阈值时禁止 Provider 调用。

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

## 验收证据

- 共享全链路：`51/51`；
- 全局模型压缩：`34/34`，包含 S1 -> S2 -> S3；
- 项目会话与原生绑定：`66/66`，包含 S1 -> S2 -> S3；
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

## 维护边界

不新增 live soak、成本审批、replay 工单、WAL 或主界面诊断卡片。只有真实生产故障、明确性能数据或 Claude Code 的核心行为发生变化时才扩展状态；其余优先修复、合并和删除。
