# TestAgent Plan Summary Normalizer V1

日期：2026-07-08

## 背景

主 Agent 连接 TestAgent 时会同时拿到两类数据：

- 完整 `ccm-test-agent-execution-plan-v1` plan。
- 后端时间线/SSE 中的字符串摘要，例如“TestAgent 复核计划：1 个项目，1 个命令...”。

如果任务体验层优先使用字符串摘要，历史任务卡或全局任务卡可能只显示标题，丢失“命令检查、HTTP 检查、浏览器检查、预期证据”等结构化用户信息。

## 本次升级

- 前端新增 `normalizeTestAgentExecutionPlanSummary(...)`。
- 任务卡和全局任务体验统一走归一化入口：
  - 已经是结构化摘要时，直接清洗后展示。
  - 只有字符串摘要时，结合完整 plan 重新生成结构化摘要。
  - 只有 plan 时，也能生成同样的用户可读卡片。
- 视觉回归 fixture 改为覆盖“字符串 summary + 完整 plan”的真实后端形态，避免渲染退化。

## 用户可见效果

用户仍然看到：

- TestAgent 复核计划是否可执行。
- 将运行多少命令、HTTP 检查、浏览器检查。
- 将产生哪些中文化证据类型。

用户不会在主文本看到：

- `ccm-test-agent-execution-plan-v1`
- `report_json`
- `browser_har`
- 本地 artifact 路径

## 边界

这次只修改主 Agent / 前端展示归一化层，不修改 `backend/test-agent` 的业务流程、计划生成或复核执行逻辑。
