# TestAgent 原生复核工作单路由 v1

日期：2026-07-08

## 背景

群聊主 Agent 已经能在复杂变更、证据不足或需要第二视角时，把返工路由切到独立验证 Agent。为了让用户配置的 `test agent` 真正承担测试/验收角色，本次把独立复核从普通文本任务升级为 TestAgent 原生工作单。

## 本次升级

- 当主 Agent 判断需要 fresh verifier 时，优先选择群成员中的 `test-agent` / `test agent` / `测试 agent`。
- 派发给 test agent 时生成 `ccm-test-agent-work-order-v1`，内容包含原实现 Agent、用户目标、验收标准、改动文件、验证命令和只读复核要求。
- 用户可见文本只提示“TestAgent 原生复核工作单已生成”，不展示完整 JSON。
- 完整工作单写入子 Agent 技术上下文和任务时间线事件 `test_agent_work_order_ready`，方便在技术详情中排查。
- 自测补充断言：工作单项目必须是原实现 Agent，metadata 必须记录 reviewSubject，工作单不得泄漏到用户可见返工文本。

## 当前边界

这份记录描述的是 TestAgent 接入的第一步：主 Agent 先能生成结构化工作单，并把完整 JSON 放入技术详情/时间线。后续已经在 `2026-07-08-test-agent-native-runner-dispatch-v1.md` 和 `2026-07-08-test-agent-plan-preflight-v1.md` 补齐 CLI/process boundary、计划预检和真实执行闭环。TestAgent 自身验证策略、报告、artifact 和 verdict 仍由 `backend/test-agent` 负责。

## 验证

- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态检查，确保工作单构建、时间线事件和协议断言存在。
- `getCoordinatorReworkProtocolSelfTest()` 增加协议断言，覆盖原生工作单 schema、复核对象、用户可见文本隐藏 JSON 等关键要求。
