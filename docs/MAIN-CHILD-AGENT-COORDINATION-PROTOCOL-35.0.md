# 主 Agent ↔ 子 Agent 协作协议 6.2

目标：把协作从“执行后检查”继续前移为“开始前 ACK 审核、中途契约传递、全过程事件流”。

## 1. ACK 前置审核

新增 `ack_review`：

- `approved`：ACK 目标、范围和验证计划清晰。
- `weak`：ACK 缺少目标或计划范围。
- `needs_rewrite`：ACK 里还有 unclear 问题。
- `missing`：缺少结构化 ACK。
- `waiting`：工作单已形成，但还没等到子 Agent ACK。

如果 ACK 不完整，任务卡会生成“要求重写 ACK”的精准返工建议。

## 2. contractChanges 自动传递计划

新增 `contract_transfer`：

- 读取结构化 `contractChanges`
- 找到 consumers / 依赖 Agent
- 生成传递计划：
  - `ready_to_inject`：消费者在当前工作单内，可注入给依赖 Agent。
  - `needs_target`：找不到明确目标，需要主 Agent 补齐目标。
  - `needs_contract_changes`：检测到契约风险，但没有结构化 contractChanges。

## 3. 协作事件流

新增 `coordination_events`，任务卡会显示最近事件：

- `work_order_sent`
- `ack_received`
- `heartbeat_received`
- `contract_changed`
- `receipt_scored`
- `targeted_rework_created`
- 以及部分 Agent QA / dispatch / acceptance timeline 事件

这让任务复盘更像真实 AI 编程工作台，而不是只看最终结果。

## 4. 接入位置

- ACK 审核：`buildAckPreflightReview()`
- 契约传递：`buildContractTransferPlan()`
- 事件流：`buildCoordinationEventStream()`
- 聚合入口：`buildUserAgentCoordinationProtocol()`
- 前端展示：`TaskExperienceCard.vue`

## 5. 自测覆盖

- ACK 审核通过能出现在任务卡数据里。
- contractChanges 能生成契约传递计划。
- 协作事件流包含工作单、ACK、契约、回执评分。
- 精准返工建议仍可点击执行。

## 后续可继续增强

- 真正暂停执行直到 ACK 审核通过。
- contractChanges 自动注入依赖 Agent 的 native session。
- 事件流持久化为独立 Trace 查询页。
