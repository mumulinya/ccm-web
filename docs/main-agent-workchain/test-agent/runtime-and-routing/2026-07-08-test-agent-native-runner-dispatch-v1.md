# TestAgent 原生 runner 派发闭环 v1

日期：2026-07-08

## 背景

上一版已经让群聊主 Agent 在需要独立复核时生成 `ccm-test-agent-work-order-v1`，并把完整工作单放入技术上下文。但执行仍复用普通第三方 Agent runtime，test agent 还没有真正按原生工作单运行验证。

## 本次升级

- 群聊派发路径识别到 `test_agent_work_order` 且目标为 `test-agent` / `test agent` / `测试 agent` 时，走 TestAgent CLI/process boundary。
- 主 Agent 只负责写入工作单 JSON，并调用 `node dist/test-agent/cli.js <work-order.json> --json`；TestAgent 内部验证流程仍由 `backend/test-agent` 自己负责。
- 原生 TestAgent 使用工作单里的被复核项目 `workDir`，不要求 test agent 自己再绑定一个项目目录。
- 原生执行会写入任务时间线：
  - `test_agent_native_execution_start`
  - `test_agent_native_execution_done`
- TestAgent report 会转换成标准子 Agent 结果说明：
  - `status=done/failed/partial/blocked`
  - `verification` 保存真实执行/核对记录
  - `independentReview` 保存 reviewer、verdict、summary、evidence
  - `filesChanged=[]`，避免把复核文件误报成 test agent 修改的代码
- 完整 `ccm-test-agent-report-v1`、CLI dispatch 信息和 artifacts 路径保留在技术数据中，供技术详情排查。

## 用户可见策略

用户主文本只看到友好的复核状态和总结。工作单 JSON、report JSON、artifact manifest、命令输出等底层信息默认归入技术详情/时间线数据。

## 当前边界

这次接入的是 TestAgent CLI 边界，不修改 TestAgent 内部业务流程。普通实现 Agent 仍继续使用用户配置的 Claude Code / Cursor / Codex 等第三方写代码 Agent。后续如果要让外部 `cc` 或 Cursor 也消费同一份 TestAgent 工作单，可以在 runtime 层增加专用 adapter，但不影响本次主 Agent 与 TestAgent 的连接闭环。

## 验证点

- 协议自测覆盖：TestAgent report 能转换为 independentReview receipt。
- 协议自测覆盖：TestAgent receipt 不伪造代码改动。
- 静态自测覆盖：CLI 工作单派发、时间线事件和第三方工具注入绕过逻辑必须存在。
