# Global TestAgent Review Stream Bridge V1

日期：2026-07-08

## 背景

上一轮已经把 TestAgent `--plan-only` 预检计划桥接到全局主 Agent 的实时任务卡。继续检查链路后发现，全局直派群聊时，TestAgent 的最终独立复核结论还缺少同样的实时桥接。

群聊主 Agent 内部已经会把 TestAgent report 转成 `independentReview` 和 `testAgentReport`，任务卡也能展示“独立复核”。缺口在于全局主 Agent 没有把这个结构化结论从群聊 SSE 转成全局 SSE 和全局 run 字段。

## 本次升级

- 群聊主 Agent 在 TestAgent 原生复核完成后发送 `test_agent_review_ready`。
- 全局主 Agent 从群聊 SSE 中筛出该事件，并转换成全局流式事件。
- 全局 run 持久化新增 TestAgent plan/review 字段，避免刷新或历史重载后丢失：
  - `test_agent_execution_plan`
  - `test_agent_execution_plan_summary`
  - `test_agent_review_summary`
  - `independent_review_summary`
  - `independent_review`
  - `test_agent_report`
- 全局前端流式消息收到 `test_agent_review_ready` 后，会在任务卡显示“独立复核”摘要。
- 全局任务卡生成器会透传 `independent_review_summary` 和 `independent_review`，复用已有的用户友好复核卡片。

## 用户可见边界

用户主文本可以看到：

- “独立复核”
- “TestAgent/独立复核已检查交付证据”
- “TestAgent：已通过”
- “继续核对交付总结、改动和验证结果”

用户主文本不展示：

- `verdict`
- `passed`
- `report_json`
- 本地 artifact 路径
- TestAgent report 原始 JSON

## 边界

- 未修改 `backend/test-agent` 的业务流程。
- TestAgent 继续负责实际验证、report、verdict 和 artifact。
- 主 Agent 只负责消费 TestAgent 已产出的结构化结果，并转成全局/群聊用户能看懂的进度与结论。

## 验证

- 静态自测覆盖：
  - 群聊 `test_agent_review_ready`
  - 全局 review relay helper
  - 全局 run 持久化字段
  - 前端全局 review handler
- 渲染回归新增全局流式 TestAgent 复核结论场景。
- 截图断言覆盖：
  - 全局流式任务卡出现“独立复核”
  - 复核状态显示中文
  - `verdict`、`passed`、`report_json` 不泄露到用户主文本
