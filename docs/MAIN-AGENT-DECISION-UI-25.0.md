# 前端展示 main_agent_decision 1.0

日期：2026-07-04

## 目标

把后端 24.0 已产生的 `main_agent_decision` 展示到群聊前端，让用户能看懂主 Agent 本轮为什么回复、为什么只读分析、为什么创建任务或派发子 Agent。

## 已实现

### 1. 主 Agent 决策卡

新增组件：

- `frontend/src/components/MainAgentDecisionCard.vue`

展示内容：

- 当前模式：普通回复 / 项目分析 / 项目任务 / 协调派发 / 追加要求 / 任务治理
- 读取内容：群聊上下文、项目代码快照、知识库、任务状态、子 Agent 回执
- 本轮动作：从 Action Registry 转成人类可读短句
- 权限判断：只读/安全动作、已获得当前消息授权、或需要确认
- 下一步：来自 `dispatchPolicy.nextStep` 或验证状态
- 技术详情：默认折叠，包含 Trace、动作、观察结果和原始 JSON

### 2. 群聊消息接入

`GroupChat.vue` 已支持：

- SSE `main_agent_decision`
- `agent_done.mainAgentDecision`
- `task_created.mainAgentDecision`
- 历史消息里的 `mainAgentDecision` / `main_agent_decision`

群聊中展示方式：

- 主 Agent 普通回复下方显示决策卡
- 项目任务接管消息下方显示决策卡
- 原始 Trace 和完整 JSON 默认折叠在技术详情

### 3. 任务体验卡兼容

`TaskExperienceCard.vue` 已兼容：

- `card.mainAgentDecision`
- `card.main_agent_decision`
- `card.technical.mainAgentDecision`
- `card.technical.main_agent_decision`

如果任务卡后续带入主 Agent 决策，也会显示同一张简洁决策卡。

### 4. 后端兼容补充

项目任务创建时，`task_created` SSE 和保存的群聊消息都会带上 `mainAgentDecision`，避免刷新页面后丢失。

## 自检

新增：

```text
node scripts/main-agent-decision-ui-selftest.mjs
```

自检覆盖：

- 决策卡组件存在
- 用户可读字段存在
- 技术详情默认折叠
- GroupChat 接收 SSE 并展示
- TaskExperienceCard 兼容展示
- 后端 `task_created` 携带决策数据

## 下一步建议

1. 在群聊顶部“主 Agent 状态”中展示最近一次 `main_agent_decision`。
2. 把宠物动作更精确映射到 `decision.mode`：
   - project_analysis -> thinking
   - project_task / delegation -> planning/building
   - followup -> working
   - governance blocked -> waiting
3. 在 Trace 页面支持按 Action 过滤。
4. 给决策卡增加“为什么没有派发”的更明确文案。
