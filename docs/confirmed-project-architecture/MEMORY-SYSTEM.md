# 记忆系统业务流程确认

Date: 2026-07-20

Status: Confirmed

## 目的

本文是 CCM 记忆系统的业务口径确认稿，统一说明全局 Agent、群聊主 Agent、独立项目 Agent 和群聊项目子 Agent 如何使用会话记忆、长期记忆、模型压缩与第三方记忆 MCP。

本文所有“会话记忆”都指向一个精确会话，绝不是按整个全局 Agent、整个群聊或整个项目混成一份聊天上下文。

## 核心定义

CCM 将记忆分为两层：

### 单个会话连续性

回答“当前这个会话刚才讨论了什么”。每个精确会话独立保存：

- 原始 transcript；
- 主 Agent 实际工具调用的隐藏执行消息链；
- 当前正式模型摘要；
- 上一代摘要 checksum 和摘要 lineage；
- 压缩后保留的动态近期完整原文；
- Provider usage、模型容量、compact boundary 和失败熔断状态；
- Session Memory 提取状态和恢复上下文。

没有压缩时，模型使用当前精确会话的全部原文。压缩后，模型使用正式摘要、动态近期完整原文和压缩后新增消息。压缩不会删除原始 transcript。

全局、群聊和项目必须通过同一个精确会话投影核心构造上述上下文。未压缩投影不得使用固定消息数、字符截断或本地摘要；是否需要正式压缩由模型上下文窗口、保留输出 Token、Provider usage和完整模型可见 payload 的 Token 计量决定。达到门限时必须先完成正式模型压缩并重新投影，失败则禁止继续调用业务模型。

工具结果的 MicroCompact 是正式压缩之外的选择性优化，不是“结果过长就裁剪”。仅已完成配对且不属于最近工作集的旧工具结果，才可在主会话缓存过期或接近 Token 门限但尚未越界时清理模型投影内容；非来源工具的原始隐藏执行账本仍保留。知识库和共享文件读取是明确例外：完整正文只留在当前Loop，持久隐藏链、run/runtime与幂等结果统一保存无正文来源投影。当前实现审计见 [未压缩上下文统一投影](../group-memory-cc-parity/unified-uncompressed-context-projection-2026-07-28/README.md)。

全局、群聊和项目主Agent的正式压缩边界同时保存`MainAgentPostCompactRestoreManifestV3`。它只记录已经实际调用的Skill、已经通过ToolSearch加载的MCP Schema，以及上下文来源清单的身份、checksum、Token和证据ID，不保存正文。新Run恢复前重新验证精确Agent、scope、session、generation、授权、目录revision、连接状态和当前内容；来源正文从知识库或共享文件权威存储重读，随后参与完整payload Token门禁。未使用的延迟工具不恢复，`alwaysLoad`由当前目录自然加载，任何漂移都失败关闭并退回重新调用或重新搜索。

压缩请求遇到 Prompt Too Long 时按 assistant response ID 划分的 API 回合从最旧处恢复，不拆分工具调用与结果；压缩成功后必须对业务模型真实可见 payload 再做一次 Token 门禁，仍超限则不提交摘要和 boundary。Anthropic 原生缓存编辑仅在 Provider 确认支持 `cache_edits/cache_reference` 时使用；其他 Provider 使用带真实回执的 CCM 内容投影，不能把内容清理伪装成原生缓存编辑。

用户可见 transcript 只显示用户消息和主 Agent正式回复。全局与项目主 Agent实际执行过的 `tool_use/tool_result` 按精确会话另存为隐藏执行消息链，并参与模型上下文、正式压缩和恢复；其中知识/共享文件工具结果落盘为`ccm-context-source-tool-result-reference-v1`，当前模型Loop仍使用完整结果。开发子 Agent与 TestAgent的原始过程继续留在任务时间线，只有主 Agent采用的派发结果和验收结论进入父会话隐藏执行链。

知识库和共享文件属于可恢复上下文来源，不是第三层记忆库。来源连续性新写`ccm-context-source-read-receipt-v2`与store v2；正式项目durable-memory或群聊typed-memory原子提交成功后，才按精确结构化source refs写入无正文`promotionEvidence`。历史数据只能由管理员在记忆中心先预览、核对plan checksum、填写原因并创建备份后迁移，可按job ID回滚，启动时不自动改写。

### 跨会话长期记忆

回答“跨会话仍然有效的重要规则和结论是什么”。长期记忆只保留具有复用价值的内容，例如：

- 用户明确要求和长期偏好；
- 已确认的架构约束和技术决定；
- 用户纠正过的事实；
- 重要风险、契约和未完成事项；
- 需要在后续任务中继续遵守的项目规则。

普通聊天、临时过程、失败输出、可直接从源码重新读取的信息和无来源候选不应进入长期记忆。

## 精确会话身份

| Agent 类型 | 单个会话身份 | 跨会话长期记忆范围 |
| --- | --- | --- |
| 全局 Agent | 当前全局 Web 会话 `sessionId` | 全局 Agent 长期记忆 |
| 群聊主 Agent | `groupId + gcs_*` | 当前群聊的长期记忆 |
| 独立项目 Agent | `project + projectSessionId` | 当前项目长期记忆 |
| 群聊项目子 Agent | `groupId + gcs_* + taskId + tas_* + native generation + project` | 当前群聊相关长期记忆和目标项目长期记忆 |
| 音乐 Agent | 固定单例 `music-agent`，不向用户提供会话 | 音乐偏好长期记忆 |

兄弟会话之间不共享原始 transcript、摘要、Provider usage、压缩边界或失败熔断器。

## 全局 Agent

### 读取范围

全局 Agent 每次只使用：

1. 当前精确全局会话的连续性；
2. 全局 Agent 长期记忆；
3. 当前用户请求、全局系统指令和允许使用的工具。

全局 Agent 不读取群聊 transcript、群聊长期记忆、项目会话或项目长期记忆。它负责理解全局目标并向群聊主 Agent 分派任务，不需要把下游群聊的全部讨论带回自己的上下文。

### 单会话流程

```text
创建全局会话 A
  -> A 尚未压缩：A 的全部用户消息和全局 Agent 回复
  -> A 第一次压缩：S1(A) + A 的动态近期原文 + A 的新消息
  -> A 第二次压缩：S2(A，包含仍有效的 S1 信息) + 新的近期原文

创建全局会话 B
  -> B 从独立空 transcript 开始
  -> B 不读取 A 的原始消息或摘要
  -> B 只能按需召回全局长期记忆
```

删除全局会话 A 会删除 A 的会话连续性和压缩状态，不会连带删除全局长期记忆。

## 群聊主 Agent

### 读取范围

群聊主 Agent 每次只使用：

1. 当前 `groupId + gcs_*` 精确会话的连续性；
2. 当前群聊召回出的长期记忆；
3. 当前请求、群聊工作状态、恢复上下文和允许使用的工具。

同一个群聊可以创建多个 `gcs_*`。不同 `gcs_*` 的原始消息、摘要和压缩状态严格隔离。

### 单会话流程

```text
群聊 G 创建会话 gcs_001
  -> 未压缩：模型读取 gcs_001 全部原文
  -> 第一次压缩：S1(gcs_001) + 近期完整原文 + 新消息
  -> 第二次压缩：S2(gcs_001) + 更新后的近期完整原文 + 新消息

群聊 G 创建会话 gcs_002
  -> gcs_002 不读取 gcs_001 的原始 transcript 或会话摘要
  -> 只按当前问题召回群聊 G 中已经沉淀的长期记忆
```

群聊主 Agent验收后的用户可见任务结论会写入当前 `gcs_*` transcript。子 Agent 未验收的过程输出不会直接成为当前群聊正式结论。

## 独立项目 Agent

独立项目 Agent 指用户直接在项目管理页面选择某个项目会话，并调用 Codex、Claude Code 或 Cursor 等第三方 Agent。

### 读取范围

独立项目 Agent 每次只使用：

1. 当前 `project + projectSessionId` 精确项目会话；
2. 当前项目长期记忆；
3. 当前用户请求、项目指令、工具和恢复上下文。

它不读取群聊会话、群聊长期记忆、全局 Agent 上下文或其他项目记忆。

### 单会话流程

```text
项目 P 创建项目会话 ps_001
  -> 新 generation 且未压缩：读取 ps_001 全部用户消息和 Agent 回复
  -> 第一次压缩：S1(ps_001) + 动态近期原文 + 新消息
  -> 第二次压缩：S2(ps_001) + 更新后的近期原文 + 新消息

项目 P 创建项目会话 ps_002
  -> ps_002 不读取 ps_001 的原始 transcript 或会话摘要
  -> 两者都可以按当前任务召回项目 P 的长期记忆
```

第三方 Agent 的原生 session/generation 可以在同一个项目会话内继续使用。Provider 切换、原生 generation 变化、清空会话或 CCM 正式压缩提交后，需要按新的权威快照重新加载上下文。

### 写回规则

- 用户消息和第三方 Agent 原始回复写入当前项目会话 transcript；
- 成功任务回执中的长期决定、约束、风险和未完成事项先成为候选；
- 只有任务成功、有来源证据并通过项目记忆 admission policy，候选才进入项目长期记忆；
- 失败、只读问答和普通过程文本不写项目长期记忆。

## 群聊项目子 Agent

群聊项目子 Agent 指群聊主 Agent 为某个目标项目创建工作单，并调用 Codex、Claude Code 或 Cursor 执行代码任务。

### 它拥有的会话身份

- 父聊天会话：当前精确 `groupId + gcs_*`；
- CCM 任务执行会话：当前 `tas_*`；
- 第三方原生会话：Provider 返回的 native session ID 和 generation；
- 目标项目：签名绑定的单个 project。

`tas_*` 用于记录任务执行、原生会话身份、派发证据、回执和重试状态。它不会再生成一份与父 `gcs_*` 冲突的本地 canonical summary。

### 读取范围

项目子 Agent 获得四类信息：

1. 当前工作单：任务目标、范围、权限和验收标准；
2. 当前父 `gcs_*` 的单会话连续性；
3. 与当前任务相关的群聊长期记忆；
4. 目标项目长期记忆。

未压缩的父 `gcs_*` 提供全部原始历史。已压缩的父 `gcs_*` 提供正式模型摘要和动态近期完整原文。边界前原文仍保存在 CCM，只在确实需要核验时分页读取。

项目子 Agent 不读取：

- 其他 `gcs_*` 的原始 transcript 或摘要；
- 其他群聊的任何记忆；
- 其他项目的会话或长期记忆；
- 全局 Agent 的会话和长期记忆；
- 被驳回、失败或未验收的其他子 Agent 过程输出。

### MCP 读取流程

支持 MCP 的第三方 Agent 使用签名 `ccm__knowledge_context`：

```text
群聊主 Agent 创建工作单
  -> CCM 从权威存储生成只读 ThirdPartyMemorySnapshotV1
  -> Prompt 直接携带工作单、权限、snapshot/checksum 和 challenge
  -> get_context_manifest 获取必读清单
  -> read_session_context 读取当前父 gcs_* 单会话
  -> read_memory_items 读取必需的群聊和项目长期记忆
  -> search_memory 按任务补充搜索
  -> report_memory_usage 报告采用、忽略、冲突和候选更新
  -> acknowledge_memory_context 确认必读内容已经加载
  -> 执行第三方 Agent 任务
```

首次绑定、新 generation、Provider 变化或 compact boundary 变化时必须完整读取必需上下文。同一 generation、同一 boundary、同一 scope 且上一轮确认有效时，只读取新增消息和发生变化的记忆。

修改任务未读完必需上下文或确认失败时，不允许按成功交付提交。只读问答可以回退完整 Prompt。

### 受控写回流程

```text
第三方子 Agent 原始输出
  -> tas_*、任务时间线和结构化回执
  -> 群聊主 Agent验收
     -> 验收通过：面向用户的最终结论写入当前 gcs_*
     -> 验收通过且有长期价值：进入群聊 typed-memory / 项目 durable-memory 候选审核
     -> 驳回或返工：不写正式群聊长期记忆，不写项目长期记忆
```

MCP 的 `report_memory_usage` 只能报告候选，不能直接修改 canonical memory。

## 音乐 Agent

音乐 Agent 是明确的例外：它不提供会话列表，不允许用户创建、切换或重命名音乐会话。整个音乐助手只有一个固定的 `music-agent` 单例上下文。

### 单例连续性

```text
音乐助手单例
  -> 未压缩：模型读取服务端保存的全部音乐对话原文
  -> 第一次压缩：正式模型摘要 S1 + 动态近期完整原文
  -> 第二次压缩：S1 进入模型输入，生成 S2 + 新的动态近期原文
  -> 原始 transcript 始终保留
```

音乐助手聊天不再以浏览器 `localStorage` 最近 100 条作为权威存储，也不再固定只给模型最近 10 条。权威数据保存在服务端 `music-agent-memory.json`；浏览器只渲染服务端返回的记录。

用户可以在音乐助手输入 `/compact` 手动触发模型压缩。自动压缩线继续按照统一模型配置的可信上下文容量计算；模型不可用、摘要无效或压缩后仍超限时不推进边界。

### 长期音乐偏好

音乐长期记忆只接受模型验证的明确偏好，例如：

- 喜欢或不喜欢的歌手、风格和曲目类型；
- 工作、休息、睡前等场景偏好；
- 默认音源模式、音量或播放方式；
- 用户对旧偏好的明确纠正。

一次播放、一次搜索、模型推荐和助手自己的描述都不能自动成为长期偏好。清空音乐聊天默认只清空 transcript 和压缩状态，保留长期音乐偏好。

### 与全局 Agent 的关系

全局 Agent 的 `play_music` 直接调用统一音乐播放引擎，不把全局会话转交给音乐 Agent，也不把一次全局点歌自动写成音乐长期偏好。音乐 Agent 页面和全局 Agent 点歌继续共享唯一播放器、唯一 `<audio>` 元素和 latest-wins 播放协调器。

## 压缩连续性

全局会话、群聊会话和项目会话都遵循相同连续性：

### 未压缩

```text
模型可见上下文 = 当前精确会话全部原文 + 当前请求 + 固定上下文
```

### 第一次压缩

```text
全部旧原文 -> 模型摘要 S1

模型可见上下文 = compact boundary + S1 + 动态近期完整原文 + 恢复上下文 + 新消息
```

### 第二次压缩

```text
S1 + 第一次压缩后的新增原文 -> 模型摘要 S2

模型可见上下文 = 新 boundary + S2 + 新的动态近期完整原文 + 恢复上下文 + 新消息
```

S2 必须保留 S1 中仍然有效的用户要求、决定、文件、纠正和未完成事项。后续以相同方式形成 S3。任何本地规则摘要都不能成为正式摘要。

## MCP 与正式记忆的关系

MCP 不创建第二套记忆系统：

```text
原始 transcript / 正式模型摘要 / 长期记忆
  -> 只读签名快照
  -> MCP 分页读取
  -> 第三方 Agent

第三方 Agent 输出
  -> 原始记录和候选回执
  -> 主 Agent或项目验收
  -> 现有正式 transcript / 长期记忆 admission
```

快照是可重新生成的派发缓存。原始 transcript、正式模型摘要和经过 admission 的长期记忆才是事实来源。

## 最终确认

1. 所有会话记忆均按单个精确会话保存、压缩、计量和熔断。
2. 新建会话不会继承旧会话原始 transcript 或会话摘要。
3. 跨会话连续性只通过经过筛选的长期记忆提供。
4. 全局 Agent 严格保持 global-only，不读取群聊或项目上下文。
5. 群聊主 Agent只读取当前 `gcs_*` 和当前群聊长期记忆。
6. 独立项目 Agent只读取当前项目会话和当前项目长期记忆。
7. 群聊项目子 Agent读取当前父 `gcs_*`、相关群聊长期记忆、目标项目长期记忆和当前工作单。
8. `tas_*` 不建立与父会话冲突的第二份正式摘要。
9. MCP 只读；任何长期记忆写入都必须经过项目成功回执或群聊主 Agent验收。
10. 音乐 Agent 没有用户会话，使用固定单例 transcript、正式摘要链和模型提取的长期音乐偏好。
11. 原始 transcript 永不因压缩删除，正式摘要失败时不推进 compact boundary。
12. 全局和项目主 Agent的工具执行链不展示为聊天气泡，但必须参与当前精确会话的 CC 风格压缩；工具调用与结果必须成对。空闲时间 MicroCompact与旧超大结果的可恢复内容替换是两种独立投影，原始账本均不修改。
13. 记忆中心对全局、群聊和项目精确会话统一展示 MicroCompact 回执；只有 checksum核验通过的真实回执才展示清理数量和节省 Token，旧会话缺少回执时明确标记“历史数据未记录”，不补造估算值。
14. Prompt Too Long 恢复按 API 回合执行，压缩候选还必须通过真实 post-compact payload 二次门禁；任何失败都不推进正式摘要边界。
15. Anthropic 原生缓存编辑与 CCM 受控内容投影是两种明确能力，Provider 不支持时不会伪造 `cache_edits/cache_reference`。
16. 普通 Provider 的 MicroCompact只由空闲时间触发；上下文压力必须进入正式模型压缩。
17. post-compact真实 payload 首次超限时只允许一次正式模型重压缩，之后仍超限必须 fail closed。
18. 长期记忆统一标注 `user | feedback | project | reference`；临时状态、失败过程、Skill/MCP定义、恢复附件和源码可推导事实不准入。
19. Context Engine使用模型族Tokenizer与真实Provider usage校准执行最终Token门禁；任何校准状态均不保存Prompt正文。
20. 全局、群聊、项目和音乐正式摘要在推进边界前必须通过统一质量门禁；第二模型抽检默认关闭，命中后只调用一次且失败时拒绝提交。
21. 正式压缩前自动创建精确会话恢复点；恢复演练不修改canonical数据，管理员恢复前还会创建恢复前快照。
22. 记忆中心展示真实压缩、缓存、质量和失败趋势，告警事件只保存计量与原因代码。
23. Provider原生缓存不可用时，CCM自建缓存仍提供热物化、并发合流、稳定前缀、成本建议和受控清理；多实例只共享锁定后的元数据与能力证据，不共享Prompt正文或模型回答。
24. Skill与MCP按CC风格区分逐项`available | loaded | invoked`：授权可用不等于进入本轮模型载荷；只有真实载入的目录、正文、Schema和结果计入Token，真实调用必须有精确名称与checksum回执。历史会话缺少逐项证据时显示“未证明”，不得按分类Token猜测。
25. 正式压缩只恢复有证据的Skill正文和已加载MCP Schema；恢复项必须重新通过授权、checksum、连接、目录revision和完整payload Token门禁，禁止跨会话继承或使用旧Schema。
26. 知识/共享文件完整工具结果只存在于当前Agent Loop；所有CCM控制的持久化边界必须使用无正文来源投影，非来源工具不得被误删。
27. 来源`used`与`promoted`严格分离；只有正式长期记忆原子准入成功且直接引用同scope/session/generation来源时才能写Promotion证据。
28. Promotion回写按`memoryId + sourceRefChecksum`幂等；回写失败不撤销已提交的正式记忆，但必须产生可重试审计。
29. 历史来源收口不自动运行；预览、apply和rollback都绑定精确会话、plan checksum、操作原因与受限备份。

五项收口与测试证据见 [CC 记忆链五项收口](../group-memory-cc-parity/cc-memory-five-improvements-2026-07-28/README.md)。

## Context Engine V2

全局、群聊、项目和音乐 Agent 的统一模型请求使用 `ContextPlanV2` 描述精确会话的模型可见上下文。计划只保存不可变块元数据、Token、checksum、保护状态和编辑动作，不保存 Prompt正文；超出真实容量时必须先完成正式模型压缩，字符截断和本地摘要不能作为绕过方式。

Provider原生缓存只在官方端点、有效 `confirmed` 能力证据或用户明确强制且没有 `unsupported` 证据时启用。字段被接受、延迟下降和后端总量指标不能伪装为命中；只有每请求缓存 Token 回执计入节省。普通中转站不支持或无法证明时自动使用 CCM受控投影，正式摘要、长期记忆和第三方 MCP hydration仍然正常工作。

第三方 Agent manifest绑定 ContextPlan checksum、块变化和确认游标。首次或 lineage变化完整读取，同 generation且上一轮确认有效时只读取增量；checksum、scope、cursor或boundary不一致时强制 rehydration。

CCM自建缓存包含短期内存物化缓存、精确checksum Singleflight、自适应稳定前缀、真实usage成本/延迟建议、生命周期清理和多实例文件租约。它只复用上下文准备结果，不缓存模型最终回答；磁盘状态只保存块元数据、Token、checksum和审计摘要，Prompt正文仍不落盘。删除会话、generation或compact boundary变化必须使旧缓存失效。

完整协议、Provider矩阵和测试证据见 [CCM Context Engine V2](../group-memory-cc-parity/ccm-context-engine-v2-2026-07-28/README.md)。

模型级Token预检、摘要质量、趋势告警、恢复演练和抽样复核见 [Context Engine V2.1](../group-memory-cc-parity/ccm-context-engine-v21-quality-observability-recovery-2026-07-28/README.md)。
# Provider 中立上下文缓存

全局、群聊和项目主 Agent 的直接模型请求统一经过 `ProviderNeutralContextCacheV1`。该层将已通过会话容量门禁的模型可见上下文描述为不可变内容块和编辑计划：Anthropic 官方直连在能力和编辑计划均验证通过时走原生 `context_management`，其他本地 API 走 CCM 受控投影，外部 CLI 继续走签名 MCP 或完整 Prompt。缓存状态不保存正文、不修改 canonical memory，也不把非原生路径标记成原生缓存。

实施与审计见 [Provider 中立上下文缓存与编辑计划](../group-memory-cc-parity/provider-neutral-context-cache-2026-07-28/README.md)。

Provider Adapter V2 将同一上下文计划映射为不同的真实请求能力：OpenAI 使用稳定 `prompt_cache_key` 和可选 retention，Gemini Generate Content 使用原生隐式缓存 usage，Anthropic 使用 `context_management` 并可显式启用 `cache_reference/cache_edits`。自定义网关未经官方端点识别或用户显式能力声明时，只允许稳定前缀和 CCM 受控投影。
