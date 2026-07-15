# CCM Agent 协作协议 8.0

## 目标

8.0 将群聊主 Agent、项目 Agent 和 Agent-to-Agent 询问统一为任务内、可审计的协作协议。子 Agent 之间不是自由聊天，而是围绕一个 Task/Execution 交换问题、证据和结论；群聊主 Agent 保留路由、仲裁和最终验收权。

## 结构化问题

每条问题保存：

- `question_id`、`task_id`、`execution_id`、`group_id`；
- `from_agent`、`to_agent`、`type`；
- `question`、`reason`、`evidence`、`required_capabilities`；
- `deadline_at`、`blocking`、`parent_question_id`、`depth`、`hop_path`；
- `fingerprint`、`routing`、`admission`、`permission_contract`；
- `answer`、`answer_evidence`、`acceptance`、`permission_boundary`。

子 Agent 可以指定目标，也可以使用 `target: "auto"`。自动路由会综合项目能力标签、职责描述、问题关键词和当前开放问答负载选择目标，并把候选评分保存在记录中。

## 生命周期

1. 子 Agent 输出 `ask_agent` 或 `request_review`。
2. 主 Agent 做成员、风险、重复、环路、深度和预算门禁。
3. 阻塞问题进入 `waiting_dependency`，写入任务时间线和 Trace。
4. 被询问 Agent 在 `advisory_read_only` 契约下回答并提供证据。
5. 主 Agent 检查答案信息量、证据、冲突和权限边界，决定采纳或拒绝。
6. 合格答案注入原 Agent；系统使用任务级原生 session ID 续跑，缺失时沿用安全 scratchpad 恢复。
7. 续跑、超时、重试、人工仲裁和权限违规都写入 Trace、群聊卡片和任务时间线。
8. 评分不低于 60 的采纳结论写回发起方项目记忆，作为协作决策保存，不冒充代码验证。

## 熔断与权限

- 每个任务最多 8 条 Agent 问题；同一 Agent 对最多 2 次；最大深度 2。
- 指纹相同的开放问题不重复派发。
- 默认截止时间 5 分钟，超时后进入明确状态，可重试、换人或人工接管。
- 单条问题最多重试 2 次。
- 问答不注入额外 MCP/Skill，不能扩大项目、文件或工具权限。
- 回答 Agent 如果产生文件变更，权限门禁拒绝该回答并保留隔离证据；实际修改必须由主 Agent 创建正式工作单。
- 密钥、生产数据、支付扣款、合规或业务方向问题升级给用户，不允许其他 Agent 代替用户批准。

## 主 Agent 仲裁

自动门禁会生成证据评分、极性和冲突列表。回答信息不足、相反结论冲突或发生副作用时不会注入原 Agent。群聊支持主 Agent 手工采纳或拒绝；采纳后通过回答事件自动唤醒原 Agent 会话。

接口：

- `GET /api/agent-collaboration/protocol`
- `GET /api/agent-qa/list`
- `POST /api/agent-qa/retry`
- `POST /api/agent-qa/manual-takeover`
- `POST /api/agent-qa/arbitrate`

## 可视化

群聊内联问答和任务 Agent Pipeline 展示：

- 提问方、回答方、等待/回答/注入/续跑状态；
- 能力路由、Execution、截止时间；
- 回答证据、证据评分和主 Agent 仲裁理由；
- `advisory_read_only` 标识与权限违规；
- 重试、人工接管、主 Agent 采纳/拒绝入口。

## 自动化验收

`runAgentCollaborationProtocolSelfTest` 固定覆盖：能力与负载路由、Task/Execution 绑定、权限不扩张、准入、重复抑制、证据采纳和副作用识别。该测试已并入 `runCollaborationProtocolSelfTest` 和 Coordinator smoke。

## 2026-06-30 验收记录

- `npm run check`、完整前后端构建和 Coordinator smoke 通过。
- 8.0 自测 7 项全部通过；旧协作、原生会话、记忆、执行内核、可靠性与 Slash Command 回归均通过。
- 生产 API 返回 `version=8.0`、`mode=task_bound_structured_collaboration`；非法仲裁返回 400，不存在的问答返回 404，未产生测试记录。
- 群聊生产页面显示“Agent 协作 8.0”状态标识，浏览器控制台错误为 0。
- 服务由 PID `13084` 隐藏运行并监听 3080，没有弹出 Node 控制台窗口。
