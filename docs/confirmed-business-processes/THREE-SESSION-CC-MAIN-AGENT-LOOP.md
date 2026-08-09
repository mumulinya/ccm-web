# 三类会话 CC 式统一 Agent Loop

## 适用范围

本流程适用于全局、群聊和项目会话的 Web 与飞书入口。音乐助手继续使用独立音乐语义与播放器链，不属于本流程。

## 权威链路

```text
用户消息
→ 精确会话串行队列
→ 完整会话上下文与Token容量门禁
→ 必要时正式模型压缩
→ 主 Agent首次模型调用
→ 直接回复 / 澄清 / 只读工具 / 计划 / 分派
→ 工具结果回到同一Agent Loop，有新进展则继续
→ 代码任务形成最小可执行计划后立即派发项目子Agent
→ 主Agent进入waiting_dependency，由ACK / Progress / Result事件唤醒
→ 回复结束，或进入既有开发、TestAgent与最终验收链
```

三类聊天入口不再先调用独立意图分类模型。`WorkflowDecision`仍是权限、任务、验收和回放的结构化事实，但由主 Agent首轮响应同时生成。

## 首轮决定

- 全局 Agent首次调用负责问答、状态、目标选择、任务计划与下游派发。
- 群聊主 Agent首次调用获得精确群聊会话、成员项目目录以及群聊授权的Skill和只读MCP目录。
- 项目主 Agent首次调用绑定精确项目与项目会话，获得项目授权的Skill、只读MCP及内置源码、运行诊断和知识工具Schema。
- 普通问候、致谢和自包含问答直接返回，正常容量下只有一次Provider调用，不读取知识、源码、运行日志，不创建任务或TestAgent运行。
- 模型不可用、结构无效或容量门禁失败时失败关闭，保留原始消息，不使用关键词路由替代。

每轮生成`MainAgentTurnDecisionV1`和`MainAgentTurnReceiptV1`。回执绑定scope、精确session、turn、响应类型、模型调用次数、工具轮数、usage和checksum，不保存Prompt正文。项目与群聊主Agent默认使用`adaptive`循环：原6次工具调用和8次模型轮次只作为分段统计与续环回执，不再使正常业务失败；显式关闭`adaptiveAgentLoopEnabled`时才恢复旧`bounded`兼容行为。

## 按需工具

- 全局：`query_knowledge`、`query_global_memory`、`read_global_shared_files`及全局授权工具。
- 群聊：`query_knowledge`、`read_project_source`及群聊授权的Skill和只读MCP。
- 项目：`query_knowledge`、`read_project_source`、`read_runtime_diagnostics`及项目授权的Skill和只读MCP。
- Skill首轮只提供目录，模型选择`invoke_skill`后才加载正文。
- MCP只有实际提供给模型的Schema计入本轮上下文；调用结果进入精确会话隐藏执行账本。
- 每轮默认最多两个工具请求，这是批量并发门而不是总轮数。互不依赖且被Schema证明为只读的请求可安全并行；`tool_search`、Skill、副作用或未知工具保持串行。
- 新工具结果持续返回同一个Agent Loop；相同签名不会重复执行，而是返回重规划提示。连续三次没有新工具、有效结果或计划进展时才以`no_progress`熔断。
- 写入、副作用、越界和高风险操作继续经过RBAC、精确授权回执和用户确认，模型输出不能绕过服务端门禁。

## 会话与压缩

- 未压缩时传递当前精确会话的完整模型可见轮次，不混入兄弟会话。
- 最终payload按真实Token容量校验；超限先执行正式模型压缩，再重新执行容量门禁。
- 压缩失败不推进boundary，也不继续主模型调用。
- MicroCompact只处理足够旧、已配对且满足时间或压力条件的工具结果；canonical transcript和隐藏执行账本不修改。
- `turn_decision`和`tool_activity`通过SSE投影；旧`presentation/chunk/planning/done/error`保持兼容。

## 任务分流

- `reply`直接写回原会话。
- `clarify`保存待补充状态，后续消息仍由主 Agent首轮统一理解。
- `plan`和`dispatch`复用现有持久任务、严格串行队列、项目子Agent、TestAgent、权限、回放和长期记忆准入。
- 代码任务只在主Agent内完成形成WorkItem、AC、依赖和允许/禁止范围所需的最小只读核实；材料齐全后立即派发项目子Agent，不让主Agent继续代替Worker探索实现。
- 派发后主Agent不轮询模型。任务进入`waiting_dependency`，由Agent Communication V2的ACK、Progress、Result和Terminal事件恢复验收、返工或汇总。
- 群聊源码工具产生的项目、路径和checksum证据直接进入计划门禁，不在任务预检阶段重复调用模型。
- 后台开发任务不长期占用聊天队首；新聊天回合仍按精确会话串行。
- Web与飞书共用同一主Agent入口和回执，回复只回原来源会话。

## 验证证据

- `scripts/group-direct-reply-fast-path-selftest.mjs`验证全局问候一次模型调用、无工具，以及群聊首轮结果不产生第二次Provider调用。
- `scripts/model-semantic-routing-audit.mjs`验证自然语言路由没有恢复关键词兜底。
- 后端TypeScript生产构建验证三类适配与统一类型契约。
- 测试全部使用Mock Provider，付费Provider调用为0。

## 终止与续环边界

`adaptive`表示“有进展就继续”，并不表示绕过安全门或无限空转。正常结束条件是模型不再请求工具且已经给出回复、澄清、计划或分派，或进入`waiting_dependency`。取消、权限拒绝、Provider/上下文容量门、正式压缩失败、重复失败、连续无进展和不确定副作用仍会停止或暂停。上下文接近上限时先执行既有MicroCompact/正式压缩与权威恢复，再决定是否继续；不会用固定业务轮数伪造失败。

## 用户可见执行流

三类会话已使用同一 `ccm-user-visible-agent-event-v1` 投影和公共页面组件。代码任务运行中直接显示“进度说明 → 工具/Skill/MCP → 用户可读的需求实施计划 → 子 Agent → TestAgent/返工”，且不显示执行记录入口；Result 到达后切换为“最终回答 → 文件变更卡 → 折叠执行记录”，展开记录后仍可在准备阶段和项目 Agent 之间查看最终计划及修订历史。`Ctrl+O`只展开当前完成消息，普通零工具问答仍只显示思考状态和最终回答。详情见 [CC-STYLE-USER-VISIBLE-EXECUTION-FLOW.md](./CC-STYLE-USER-VISIBLE-EXECUTION-FLOW.md)。
