# TestAgent 复核计划预检 v1

日期：2026-07-08

## 背景

`docs/test-agent` 中已经把 TestAgent 设计成独立 CLI/process boundary，并提供 `--plan-only` 用于在真实验证前查看执行计划。主 Agent 连接层需要先消费这个计划，再启动真实复核，避免用户只看到“已派发”却不知道 TestAgent 准备验证什么。

## 本次升级

- 群聊主 Agent 派发 TestAgent 工作单前，先调用：
  - `node dist/test-agent/cli.js <work-order.json> --plan-only --json`
- plan 输出必须是 `ccm-test-agent-execution-plan-v1`。
- plan 有效时，主 Agent 写入时间线事件：
  - `test_agent_execution_plan_ready`
- 用户可见状态只展示友好的计划摘要，例如项目数、命令数、HTTP/浏览器检查数和预期证据类型。
- plan 无效时，主 Agent 不启动真实 TestAgent 复核，而是回写 `blocked` 结果说明，让后续返工修复 handoff/work order。
- 完整 plan JSON、CLI 路径、工作单文件路径和 stderr 摘要保留在技术数据中。

## 边界

这次只修改主 Agent 与 TestAgent 的连接层。TestAgent 的 plan 生成、验证策略、artifact 写入和报告格式继续由 `backend/test-agent` 负责。

## 验证点

- 协议自测覆盖：plan 摘要是用户可读文本，不泄漏 raw schema/protocol。
- 协议自测覆盖：invalid plan 会变成 blocked receipt，且不会伪造代码改动。
- 静态检查覆盖：`--plan-only`、`test_agent_execution_plan_ready` 和 CLI plan dispatch 必须存在。
