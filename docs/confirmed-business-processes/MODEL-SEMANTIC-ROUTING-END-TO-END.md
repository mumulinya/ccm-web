# 全链路模型语义路由完整业务流程

## 1. 适用范围

本流程适用于全局 Agent、群聊主 Agent、项目主 Agent、项目子 Agent、TestAgent、音乐 Agent 和长期记忆提取。凡是需要理解自然语言含义并据此选择任务类型、目标 Agent、测试动作、长期记忆或验收结论的环节，都必须进入统一模型语义决策链。

显式命令、合法 ID、项目路径、URL、MIME、Schema、枚举、权限、危险命令、Token、checksum、Provider 错误和真实执行状态继续由确定性代码处理。这些规则只能提高风险或拒绝操作，不能替模型降低风险或猜测用户意图。

## 2. 端到端链路

```text
用户消息、验收标准或 Agent 协作请求
-> 绑定精确 scope / session / task / generation
-> SemanticDecisionRuntimeV1
-> 当前统一 Provider、120 秒超时、五次重试与任务熔断
-> 模型返回结构化决策
-> Schema、枚举、候选集合、Token 与权限门禁
-> 执行、验收、记忆提取或用户展示
-> SemanticDecisionReceiptV1
-> 精确任务时间线、任务回放或记忆审计
```

同一 `decisionKind + scope + session + task + inputChecksum` 的并发请求使用 singleflight；成功结果可在进程内短期复用。回执只保存身份、模型、输入/结果 checksum、置信度、状态和时间，不保存 Prompt、API Key 或消息正文。

模型不可用、请求超出真实容量、响应不是合法 JSON、Schema 不完整或置信度不足时 fail closed。失败同样生成脱敏回执，执行链不得恢复关键词、正则、随机选择或本地摘要兜底。

## 3. 主 Agent 工作流

全局、群聊和项目入口先调用统一 `workflow` 决策。模型决定普通回答、只读分析、直接执行、计划任务、Epic 拆分、Skill、记忆策略和澄清问题。

- 普通问答不创建开发任务。
- 开发任务必须包含目标、影响范围、验收标准和精确会话身份。
- 缺失字段允许模型修复一次；仍不完整则等待用户。
- 群聊计划澄清只读取模型的 `clarificationQuestions`、`missingInfo` 和结构化风险信号。
- 本地代码不根据句子长度、业务词或正则决定是否创建任务。

## 4. 跨 Agent 协作

项目子 Agent 通过签名协调 MCP提交问题、证据、验收要求和可选目标。显式合法项目 ID 可直接进入门禁；`target=auto` 必须由群聊主 Agent 模型选择。

模型只可返回 `ask_agent`、`ask_user` 或 `reject`。服务端重新验证群聊成员、项目、精确会话、任务、Agent session、generation、权限和工具快照。模型失败或低置信度时，当前协作项和源任务进入 `blocked / needs_user`，释放队列租约，不随机选择成员。

路由决定、候选项目、升级原因和语义回执进入任务时间线。目标项目的正式工作项使用独立原生会话，完成后通过任务回执返回群聊主 Agent，不允许子 Agent直接修改另一个项目。

## 5. TestAgent 语义验收

自然语言验收标准只能由 `TestAgentSemanticPlanV2` 转换为命令、HTTP 和浏览器检查。执行器只接收已经通过 Schema 校验的结构化动作。

- 每条验收标准必须有一条 `criterionCoverage`。
- `planned` 必须引用实际检查名称。
- `unsupported` 或 `needs_user` 会阻塞验收。
- 未知动作、未知断言、跨项目路径和缺少证据的检查被拒绝。
- 只有 `targetUrl` 时仅生成固定的可访问、非空白和基础错误检查。
- 模型规划失败时不执行旧正则构造器，也不能通过验收。

项目子 Agent结果回执使用结构化 `verificationResults`：`passed | failed | blocked | skipped | not_run`。`verification` 只用于用户展示，不能再从其中的“passed”“失败”“建议运行”等文字推导状态。TestAgent、主 Agent和任务终态只读取结构化检查、`acceptance_gate` 和终态回执。

## 6. 记忆提取与压缩

全局和音乐 Agent的每个完整用户/助手轮次都会进入 `memory_extraction`。模型可返回空候选或 `ignore`，普通问答不会被强行写成长期记忆。

非忽略候选必须包含类型、`add | update | supersede` 操作、精确 source message ID、可逐字核验的证据、置信度和适用 scope。服务端只验证证据、checksum、敏感信息和作用域，不重新解释候选语义。

全局积压按游标从旧到新处理完整轮次，批次之间不会跳过消息。模型或容量门禁失败时保留原始 transcript，并记录 `pending_retry` 和失败回执。

群聊和项目压缩只保护模型确认的语义事实、权限事件、任务终态、TestAgent结果等结构化事实。压缩质量门禁不再从“必须、授权、失败、已完成”等自由文本猜测事实；结构化阻塞任务必须按 task ID 保留。原始 transcript、隐藏执行账本和压缩前档案始终不删除。

旧关键词时代生成的全局长期记忆不删除，记忆中心显示为 `legacy_unverified`。只有人工确认、结构化事件或重新经过模型证据核验后，才恢复为正式可信记忆。

## 7. 用户展示与审计

任务卡和任务回放只依据规范化 `status`、`acceptance_state`、门禁及终态回执展示执行状态。历史记录没有结构化验收状态时显示“验收状态无法证明”，不得根据自由文本猜测通过或失败。

任务回放的“排障信息”可查看语义决策类型、状态、模型、置信度、原因和 checksum。TestAgent同时展示验收标准覆盖和未规划项。记忆中心展示提取来源、证据消息、语义状态和旧数据未核验标记。所有页面都不展示 Prompt、密钥或未经清理的工具结果。

## 8. 失败与安全边界

- 模型未配置、认证错误或 Schema 无效：停止当前语义动作。
- 临时网络或 Provider 错误：使用统一重试；耗尽后进入任务熔断。
- Token 超限：Provider 调用前拒绝，不做字符截断或阈值放宽。
- 跨 scope、候选不唯一或置信度不足：等待用户。
- TestAgent标准未覆盖：阻塞验收，不运行猜测检查。
- 记忆提取失败：保留原文和游标，不写长期记忆。
- 历史自由文本状态：只显示未证明，不进入自动完成门禁。

## 9. 主要实现入口

- `backend/system/semantic-decision-runtime.ts`
- `backend/agents/workflow-decision.ts`
- `backend/modules/collaboration/collaboration-runtime-cross-agent-runtime.ts`
- `backend/test-agent/agentic-planner.ts`
- `backend/test-agent/browser/auto-checks.ts`
- `backend/modules/collaboration/agent-receipts.ts`
- `backend/agents/global/memory.ts`
- `backend/modules/music/memory.ts`
- `backend/modules/collaboration/group-compaction-projections.ts`
- `backend/modules/collaboration/task-replay.ts`

## 10. 验证证据

- `node scripts/model-semantic-routing-audit.mjs`：19 项生产调用链门禁通过。
- `node scripts/semantic-decision-runtime-selftest.mjs`：singleflight、精确作用域、脱敏回执、候选拒绝和Provider调用前Token门禁通过。
- `npm run test:quick`：23/23，通过独立临时后端构建，付费Provider调用为0。
- 全局压缩40项、音乐记忆27项、项目主Agent 34项、TestAgent浏览器链20项专项回归通过。

当前流程已经启用。历史兼容代码可以保留供旧数据读取和专项测试，但生产调用链静态审计禁止其重新进入语义路由、验收或长期记忆准入。
