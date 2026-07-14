# TestAgent Browser Evidence Connector V1

日期：2026-07-08

## 背景

TestAgent 业务流程由独立工作流继续维护，最新文档显示它已经能产出 `browserInteractionSummary`、`browserNetworkSummary`、结构化网络断言、trace/HAR 等证据。主 Agent 这轮只负责连接边界：发送更完整的 handoff，消费 TestAgent 已产出的摘要，并把结果翻译成用户能看懂的中文。

## 本次升级

- 群聊主 Agent 生成 `ccm-test-agent-handoff-v1` 时，会读取项目配置里的 TestAgent 复核字段：
  - `test_agent_target_url` / `testAgentTargetUrl`
  - `test_agent_http_checks` / `testAgentHttpChecks`
  - `test_agent_browser_checks` / `testAgentBrowserChecks`
  - 对抗 HTTP/浏览器检查和 browser probe templates
  - TestAgent 专用 options
- 如果配置里有 URL、HTTP 或浏览器检查面，handoff 会带给 TestAgent，让 TestAgent builder 自动推断 HTTP、浏览器、截图、网络日志、trace、HAR 等 required checks。
- 主 Agent receipt 现在会把 TestAgent 的浏览器交互和浏览器网络摘要翻译成中文证据：
  - “浏览器交互：已执行 X 个操作、Y 个断言……”
  - “浏览器网络：记录 X 个请求、Y 个响应……”
- 用户主文本只显示友好摘要；`networkLogPath`、本地 artifact 路径、report/verdict JSON、HAR/trace 路径仍留在技术详情。

## 边界

- 未修改 `backend/test-agent` 业务逻辑。
- TestAgent 仍负责 handoff 转 work order、预检、真实执行、report、verdict 和 artifact。
- 主 Agent 只负责读取项目配置、发出 handoff、消费 report/verdict 摘要，并决定是否接受、返工或等待人工确认。

## 验证

- `runCoordinatorReworkProtocolSelfTest()` 增加浏览器交互/网络摘要断言。
- `main-agent-decision-ui-selftest` 增加连接层静态断言。
- 渲染回归增加任务卡和全局流式卡断言，覆盖浏览器证据可见、技术路径不泄露。
