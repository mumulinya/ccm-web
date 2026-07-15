# 群聊主 Agent 多步工具化工作循环 2.0

日期：2026-07-04

## 目标

在 23.0 的 Action Registry 基础上，让群聊主 Agent 每轮消息都形成可追踪的：

```text
decision -> action -> observation -> verify -> reply
```

这条链路用于解释“主 Agent 为什么这么做”，并把普通对话、项目分析、项目任务和追加要求区分清楚。

## 本轮实现

### 1. main_agent_decision Trace

新增 `main_agent_decision` Trace 事件。事件数据包含：

- `decision.selected_actions`：本轮选择的主 Agent 动作
- `permissions`：每个动作的风险、是否允许、权限原因
- `observation`：本轮观察到的消息模式、意图、派发策略、任务/队列状态等
- `verify`：本轮动作链路是否满足权限和证据边界
- `reply`：最终回复类型、消息 ID 和摘要

### 2. 接入的主链

已接入：

- 普通主 Agent 对话
- 只读项目分析
- 明确项目任务创建
- 明确项目任务派发/排队
- 任务追加要求 / 续跑同一任务

### 3. 权限边界

行为保持如下：

- 普通对话：只读群聊上下文 + 最终回复，不创建任务、不派发子 Agent。
- 项目分析：读取群聊上下文、知识库和只读代码快照，不创建任务、不派发子 Agent。
- 项目任务：当前消息具备明确执行意图时，允许创建任务和派发/排队。
- 高风险治理：停止、取消、归档、清除任务必须来自用户明确指令或按钮操作。

### 4. 诊断

新增诊断项：

- `group-main-agent-tool-loop`

自检覆盖：

- 普通对话不会创建任务或派发子 Agent。
- 项目分析包含代码快照读取且不创建任务。
- 明确执行任务会选择创建任务和派发子 Agent。
- 高风险治理动作在没有显式授权时会阻断。
- 所有样例都有 decision / observation / verify / reply 结构。

## 新增/修改代码

- `backend/modules/collaboration.ts`
  - `buildMainAgentDecisionChain()`
  - `appendMainAgentDecisionTrace()`
  - `runGroupMainAgentToolLoopSelfTest()`
  - `/api/groups/send` 主链打点
  - `/api/orchestrator/main-agent-actions` 返回 `toolLoopSelfTest`
  - `/api/orchestrator/diagnostics` 新增 `group-main-agent-tool-loop`

## 后续建议

下一步可以继续增强：

1. 在前端任务卡或技术详情里展示 `main_agent_decision`。
2. 把高风险治理接口也统一写入 `main_agent_decision`。
3. 将 `main_agent_decision` 与 Agent 宠物状态联动，例如“读取项目”“正在派发”“等待回执”“验收完成”。
4. 给每个动作增加耗时和 token/成本统计。
5. 在 Trace 页面提供按 action 过滤能力，方便复盘误派发或漏派发。
