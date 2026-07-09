# TestAgent CLI Handoff Boundary V1

## 背景

TestAgent 业务流程由独立模块维护。主 Agent 只负责连接、派发、进度展示和总结，不应该提前调用 TestAgent 内部 work-order builder。

TestAgent 已提供稳定进程边界：

- `node dist/test-agent/cli.js --from-handoff <handoff.json> --plan-only --json`
- `node dist/test-agent/cli.js --from-handoff <handoff.json> --json`

## 本次完成

- 群聊主 Agent 生成 `ccm-test-agent-handoff-v1`，不再 import `buildTestAgentWorkOrderFromHandoff`。
- TestAgent 原生复核预检改为调用 CLI `--from-handoff ... --plan-only --json`。
- TestAgent 原生复核执行改为调用 CLI `--from-handoff ... --json`。
- 技术时间线从 `test_agent_work_order_ready` 调整为 `test_agent_handoff_ready`。
- 旧任务如果已经携带 legacy work order，主 Agent 会兼容转换为 handoff 后再走 CLI 边界。
- 用户可见返工摘要只说“TestAgent 原生复核交接单”，不展示 handoff/work-order JSON 或 schema；完整 handoff、plan、report 继续放入技术详情。

## 自测覆盖

- `runCoordinatorReworkProtocolSelfTest()` 已导出，可单独验证 TestAgent 独立复核路由。
- 自测断言：
  - 独立复核会选择 `test-agent`，并排除原实现 Agent。
  - follow-up 只携带 handoff，不再携带主 Agent 预构建的 work order。
  - handoff 不泄露到用户可见返工文本。
  - TestAgent report 仍会转成 `independentReview` receipt。
  - TestAgent plan 预检失败会阻止真实执行。
- 真实 CLI 边界验证通过：
  - `--from-handoff --plan-only --json`
  - 返回 `ccm-test-agent-execution-plan-v1`
  - `valid: true`

## 验证命令

- `node scripts\main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- 编译后 `runCoordinatorReworkProtocolSelfTest()`
- 临时 handoff 文件调用 `ccm-package/dist/test-agent/cli.js --from-handoff <file> --plan-only --json`
