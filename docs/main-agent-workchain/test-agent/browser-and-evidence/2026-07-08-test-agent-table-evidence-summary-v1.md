# TestAgent table evidence summary bridge v1

## Goal

让群聊主 Agent / 全局主 Agent 在接收 TestAgent 复核结果时，能把表格行、单元格断言转换成用户能看懂的验证摘要。

## Context

已参考 `docs/test-agent/assertions-and-coverage/2026-07-08-browser-table-assertions.md`。TestAgent 侧已经支持：

- `tableRowIncludes`
- `tableCellTextIncludes`
- `tableCellTextEquals`

本次只做主 Agent 连接层，不修改 `backend/test-agent` 的执行业务逻辑。

## Implemented

- 主 Agent 的 TestAgent 浏览器证据摘要新增“表格验证”行。
- 识别 TestAgent 报告和 verdict 中的表格断言计数。
- 用户可见文本只展示“核对了多少项表格行/单元格断言、是否有失败”。
- 选择器、行标识、单元格定位、artifact 路径仍留在技术详情/原始报告里，不进入普通回复。
- 表格断言失败时，普通摘要只提示哪类表格内容未匹配，并引导查看技术详情。
- 自测样本新增 3 个表格断言，覆盖回执和用户可见文本。

## Verification

已执行：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- 直接调用 `runCoordinatorReworkProtocolSelfTest()`，新增检查：
  - `nativeTestAgentReceiptIncludesTableEvidenceSummary: true`
  - `nativeTestAgentVisibleOutputIncludesTableEvidenceSummary: true`
  - `nativeTestAgentTableFailureSummaryHidesLocatorDetails: true`
