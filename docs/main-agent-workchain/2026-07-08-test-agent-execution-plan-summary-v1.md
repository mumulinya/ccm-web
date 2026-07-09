# TestAgent Execution Plan Summary V1

日期：2026-07-08

## 背景

另一个 Agent 已在 `docs/test-agent/2026-07-08-execution-plan-dry-run.md` 中把 TestAgent 的执行计划做成稳定 CLI 契约：

- `node dist/test-agent/cli.js --from-handoff <handoff.json> --plan-only`
- 输出 schema 为 `ccm-test-agent-execution-plan-v1`
- plan 会说明 TestAgent 准备运行哪些命令、HTTP 检查、浏览器检查，以及会产出哪些证据文件。

主 Agent 连接层需要消费这份计划，让用户在真实复核开始前知道 TestAgent 正在准备验证什么；但原始 JSON、路径、枚举值仍应留在技术详情。

## 本次升级

- 后端在 TestAgent plan-only 成功后，SSE 额外发送 `test_agent_execution_plan_ready`。
- 群聊任务卡收到该事件后，把 plan 写回当前任务运行态。
- 全局/群聊任务体验会透传：
  - `test_agent_execution_plan`
  - `testAgentExecutionPlan`
  - `test_agent_execution_plan_summary`
  - `testAgentExecutionPlanSummary`
- 前端新增 TestAgent 复核计划摘要，用户可见内容只展示：
  - 涉及项目数
  - 命令检查数
  - HTTP 检查数
  - 浏览器检查数
  - 预期证据类型的中文标签
- `report_json`、`browser_har`、本地 artifact 目录等技术值不会出现在用户主文本。

## 边界

- 不修改 `backend/test-agent` 的业务流程。
- TestAgent 继续负责 handoff 转 work order、plan 生成、验证执行、report、verdict 和 artifact。
- 主 Agent 只负责连接、状态同步、用户可读展示和技术详情归档。

## 验证

- 静态自测覆盖 TestAgent plan 摘要工具、任务卡展示、SSE 事件处理、全局任务体验透传和后端事件字段。
- 渲染回归覆盖：
  - 计划摘要可见
  - 中文证据标签可见
  - raw `report_json` / `browser_har` 不可见
  - 本地 artifact 路径不可见
- 类型检查、前端构建、后端构建和截图渲染回归均通过。
