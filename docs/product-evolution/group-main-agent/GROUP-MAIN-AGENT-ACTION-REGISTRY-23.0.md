# 群聊主 Agent 工具化工作循环 1.0

日期：2026-07-04

## 目标

把群聊主 Agent 从“只靠提示词判断”推进到“有明确动作边界的工具化工作循环”。

这一轮先完成 Action Registry：把主 Agent 可以做的动作统一登记，标注风险、权限、后端能力和完成证据。后续再把这些 Action 接成真正的多步 `think -> act -> observe -> verify -> reply` 执行循环。

## 已登记的主 Agent 动作

| 动作 | 风险 | 权限边界 | 用途 |
| --- | --- | --- | --- |
| `read_group_context` | read | 自动只读 | 读取群聊最近消息、压缩摘要、当前目标和协作记忆 |
| `read_project_code_snapshot` | read | 项目分析/任务理解时自动只读 | 读取绑定项目的安全代码快照，过滤密钥、依赖和构建产物 |
| `query_knowledge_base` | read | 自动只读 | 检索本地知识库，辅助回答和任务简报 |
| `inspect_task_status` | read | 自动只读 | 查看任务、执行器、会话、时间线和验收状态 |
| `create_project_task` | write | 需要当前消息明确执行意图 | 创建持久任务卡 |
| `dispatch_child_agent` | write | 需要当前消息明确执行意图 | 派发子 Agent 执行自包含工作单 |
| `ask_user_clarification` | safe | 缺少关键目标/授权时自动 | 追问用户一个最关键问题 |
| `govern_task_lifecycle` | high | 必须用户明确指令或按钮操作 | 停止、取消、归档、恢复、清除任务 |
| `read_child_agent_receipts` | read | 自动只读 | 读取结构化回执、文件变更、验证和阻塞原因 |
| `replan_from_observation` | safe | 失败断言/事实变化后自动 | 重新规划、返工、等待或安全停止 |
| `generate_final_reply` | safe | 验收后自动 | 生成给用户看的最终回复 |

## 本轮代码落点

- `backend/modules/collaboration.ts`
  - 新增 `GROUP_MAIN_AGENT_ACTIONS`
  - 新增 `getGroupMainAgentActionRegistry()`
  - 新增 `buildGroupMainAgentActionContext()`
  - 新增 `runGroupMainAgentActionRegistrySelfTest()`
  - 新增诊断项 `group-main-agent-action-registry`
  - 新增接口 `GET /api/orchestrator/main-agent-actions`
- `backend/modules/group-orchestrator.ts`
  - 在群聊主 Agent system prompt 中加入动作边界说明

## 行为原则

1. 普通聊天不创建任务、不派发子 Agent。
2. 项目分析可以读取群聊上下文、知识库和只读代码快照，但不能修改。
3. 创建任务和派发子 Agent 必须来自当前用户消息的明确执行意图。
4. 停止、取消、归档、清除任务属于高风险治理动作，必须用户明确指令或按钮操作。
5. 子 Agent 缺回执、缺验证或回执不可信时，主 Agent 不能说完成。
6. 最终回复必须基于验收证据；未完成时明确说明风险和缺口。

## 诊断与验证

可通过：

```text
GET /api/orchestrator/diagnostics
GET /api/orchestrator/main-agent-actions
```

检查动作注册表是否覆盖完整、写操作是否有授权边界、高风险治理动作是否必须显式确认。

## 下一步建议

下一轮最值得做：

1. 把 Action Registry 接入真正的主 Agent step loop。
2. 每次群聊消息产生一条可追踪的 `main_agent_decision` 记录。
3. 前端展示“主 Agent 当前选择了什么动作”，但只给用户看简洁状态，内部细节折叠。
4. 给 `create_project_task` / `dispatch_child_agent` / `govern_task_lifecycle` 加统一权限审计。
5. 把 action evidence 写入 Trace，方便复盘“为什么派发/为什么没派发”。
