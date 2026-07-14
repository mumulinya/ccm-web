# 全局主 Agent 执行中补充要求与目标调整 v1

日期：2026-07-10

## 目标

补齐全局主 Agent 在一次运行尚未结束时接收用户新消息的能力，使它能够像 Claude Code 主线程一样，在工具循环或模型决策之间读取新的用户要求，并继续使用同一个运行上下文。

本次只修改全局主 Agent 连接链路、用户展示和回归测试，不修改 TestAgent 内部业务实现。

## Claude Code 对照

参考 `D:\claude-code\src\query.ts` 的 mid-turn drain：

- 工具调用结束后读取队列中的用户 prompt。
- 用户 prompt 只进入主线程，不广播给子 Agent。
- 新 prompt 作为当前轮上下文继续处理，不创建一条没有历史的新任务。
- 队列消息在安全边界消费，避免把普通用户消息插入未闭合的工具结果序列。

CCM 采用相同原则，但结合现有授权、计划、Todo、推理闭环和用户可读展示做了本地化实现。

## 后端链路

### 活动运行对象

`backend/agents/global/loop.ts` 新增活动运行对象索引。

持久化运行仍写入原有运行存储；执行中的补充消息则直接进入当前循环持有的同一个 `GlobalAgentRun` 对象，避免只修改磁盘副本而正在运行的循环无法感知。

### 消息队列

运行对象新增：

- `pending_user_messages`
- `user_steer_history`
- `last_user_steer`

单条消息记录：

- 消息 ID 和请求幂等 ID
- `supplement` 或 `revise_goal`
- `queued` 或 `applied`
- 来源、接收时间、应用时间
- 是否保留原授权

请求 ID 相同的消息只入队一次。

### 安全消费

`continueLoop()` 在两个安全位置消费队列：

1. 每一轮模型调用前。
2. 模型调用返回后、使用该决策前。

第二个检查用于处理“模型思考期间用户调整目标”的竞态。如果此时有新消息，旧模型决策会被丢弃，下一轮使用最新目标重新判断。

### 补充要求

普通补充要求：

- 追加到同一运行历史。
- 写入推理事实和意图断言。
- 保留同一目标范围内已有授权。
- 下一轮模型必须读取该要求。

### 目标调整

目标调整：

- 标记 `reasoning_loop.replan_required`。
- 保留旧步骤、工具观察和验收证据，供重新判断。
- 清空旧目标范围的写入授权和已确认工具签名。
- 下一轮重新核对目标、计划、影响范围和验收条件。
- 不允许把旧授权自动扩大到新目标。

### API 与记忆

新增：

`POST /api/global-agent/runs/steer`

请求包含运行 ID、消息、可选类型、来源和请求 ID。

接口返回友好的“已接收”结果；当前运行在真正消费后通过原 SSE 返回“已纳入”。补充消息也会写入全局 Agent 会话记忆。

## 前端体验

`frontend/src/components/global/GlobalAgent.vue` 调整为：

- 全局任务运行时文字输入框保持可用。
- 发送按钮显示“补充要求”。
- 输入占位显示“补充要求或调整当前目标...”。
- 运行中附件入口保持禁用，避免附件跨请求边界混入当前运行。
- 第二条消息调用 `/runs/steer`，不会启动第二条全局运行，也不会创建重复助手流。
- 用户先看到“补充要求已接收”或“目标调整已接收”。
- 当前循环消费后显示“补充要求已纳入”或“目标调整已纳入”。
- 当接口响应和 SSE 到达顺序发生竞态时，界面固定按“已接收 → 已纳入”展示并去重。

普通问话仍沿用原逻辑，不会因为本功能自动展示 Todo。

## 验证

后端运行自测覆盖：

- 新消息进入同一运行。
- 模型等待期间到达的新消息会使旧决策失效。
- 消息只消费一次。
- 请求幂等去重。
- 补充要求进入下一轮模型上下文。
- 目标调整触发重规划。
- 目标调整撤销旧范围写入授权。
- 目标调整后不会执行旧工具决定。

真实渲染回归覆盖：

- 运行中的输入框可用。
- 运行中的附件按钮禁用。
- 发送按钮切换为“补充要求”。
- 第二条用户消息显示在真实聊天气泡。
- “已接收”和“已纳入”状态均可见。
- 输入目标调整文字后按钮可继续发送。

截图：

`scratch/render-regression/07g-global-mid-turn-steering.png`

全套渲染截图数量由 27 增加到 28。

## 涉及文件

- `backend/agents/global/loop.ts`
- `backend/modules/global/global-agent.ts`
- `frontend/src/components/global/GlobalAgent.vue`
- `frontend/visual-regression/main-agent-display-fixture.js`
- `scripts/main-agent-decision-ui-selftest.mjs`
- `scripts/main-agent-render-regression.mjs`
