# TestAgent Work Order Contract

日期：2026-07-07

## 目标

给后续群聊主 Agent 接入 TestAgent 准备一个稳定的交接契约。主 Agent 之后只需要把任务背景、验收标准、项目路径、运行地址、验证命令、HTTP/API 检查、浏览器检查等信息组装成 work order，再调用 contract validator 和 `runTestAgent(...)`。

本轮仍然只修改 `backend/test-agent/*` 和 `docs/test-agent/*`，没有碰群聊协作代码。

## 本轮完成

- 新增 `backend/test-agent/contract/schema.ts`：
  - `TEST_AGENT_CONTRACT_IDS`
  - `TestAgentWorkOrderContractSchema`
  - `TestAgentReportContractSchema`
  - HTTP check / browser action / browser assertion / project / options 的结构 schema
- 新增 `backend/test-agent/contract/examples.ts`：
  - `TEST_AGENT_MINIMAL_WORK_ORDER_EXAMPLE`
  - `TEST_AGENT_WEB_APP_WORK_ORDER_EXAMPLE`
  - `TEST_AGENT_WORK_ORDER_EXAMPLES`
- 新增 `backend/test-agent/contract/validator.ts`：
  - `validateTestAgentWorkOrderContract(...)`
  - `assertTestAgentWorkOrderContract(...)`
  - `validateTestAgentReportContract(...)`
  - `assertTestAgentReportContract(...)`
- 新增 `backend/test-agent/contract/index.ts` 统一导出 contract 包。
- `backend/test-agent/index.ts` 导出 contract 包和 `runTestAgentContractSelfTest()`。
- `agent-profile.ts` 增加 `work_order_contract_validation` 能力声明。
- `self-test.ts` 增加 `runTestAgentContractSelfTest()`：
  - web app work order 示例必须通过；
  - 缺少 `projects` 的 work order 必须失败；
  - report contract 示例必须通过。

## 设计说明

contract validator 分两层：

1. 先用 `zod` 做结构校验，提前发现缺字段、数组/对象形状错误等问题。
2. 再复用现有 `normalizeTestAgentWorkOrder(...)` 做语义校验，避免 duplicate 规则，例如 browser action type、HTTP assertion type、无可执行检查等。

这样后续群聊主 Agent 接线时可以先做：

```ts
const contract = validateTestAgentWorkOrderContract(workOrder)
if (!contract.valid) {
  // 返回给群聊主 Agent 修正交接信息
}
const report = await runTestAgent(workOrder)
```

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit --pretty false`：通过。
- `npx tsc -p backend/tsconfig.json --outDir scratch/test-agent-compiled`：通过。
- 临时编译后执行 self-test：
  - `runTestAgentSelfTest({ includeBrowser: false })`：通过。
  - `runTestAgentMcpProviderSelfTest()`：通过。
  - `runTestAgentClaudeChromeMcpSelfTest()`：通过。
  - `runTestAgentComputerUseMcpSelfTest()`：通过。
  - `runTestAgentWorkOrderNormalizationSelfTest()`：通过。
  - `runTestAgentArtifactSelfTest()`：通过。
  - `runTestAgentCoverageSelfTest()`：通过。
  - `runTestAgentCommandPlannerSelfTest()`：通过。
  - `runTestAgentHttpApiSelfTest()`：通过。
  - `runTestAgentAdversarialHttpSelfTest()`：通过。
  - `runTestAgentSemanticLocatorSelfTest()`：通过。
  - `runTestAgentBrowserStateSelfTest()`：通过。
  - `runTestAgentBrowserPreflightSelfTest()`：通过。
  - `runTestAgentPlaywrightAvailabilitySelfTest()`：通过。
  - `runTestAgentRequiredCheckCoverageSelfTest()`：通过。
  - `runTestAgentContractSelfTest()`：通过。
- 已清理 `scratch/test-agent-compiled`。

## 未完成

- contract 目前是 zod runtime schema，还没有导出标准 JSON Schema 文件。
- report schema 主要校验顶层结构，后续可以逐步细化每类 result 的字段。
- 群聊主 Agent 还没有接入 validator；这部分等群聊协作代码稳定后再做。
