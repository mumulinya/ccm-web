# TestAgent Required Check Coverage

日期：2026-07-07

## 目标

让 `requiredChecks` 真正成为 TestAgent 的质量门槛，而不是仅作为提示文本存在。之前 TestAgent 会运行命令、HTTP、浏览器等检查，但最终报告没有单独说明每个 required check 是否被证据覆盖。本轮新增 `requiredCheckCoverage`，并让缺失/失败的 required checks 影响最终状态。

## 本轮完成

- `TestAgentReport` 增加：

```ts
requiredCheckCoverage: RequiredCheckCoverageItem[]
```

- 新增 `RequiredCheckCoverageItem`：

```ts
{
  check: string
  status: "verified" | "not_verified" | "unknown"
  evidence: string[]
  missingReason?: string
}
```

- 新增 `backend/test-agent/required-checks.ts`：
  - `buildRequiredCheckCoverage(...)`
- 支持这些 required check 类型的证据判断：
  - `commands`
  - `build`
  - `unit_tests` / `test`
  - `typecheck` / `tsc` / `typescript`
  - `lint`
  - `browser_e2e` / `e2e` / `playwright` / `cypress`
  - `screenshots`
  - `console_errors`
  - `networkNoErrors`
  - `http` / `api`
  - `adversarial`
- `result-builder.ts` 现在会：
  - 先构建 required check coverage；
  - required check 明确失败时，报告状态为 `failed`；
  - required check 缺少证据时，报告状态最多为 `partial`；
  - 将未覆盖 required check 写入 `risks`。
- `report.md` 新增 `Required Check Coverage` section。
- `agent-profile.ts` 增加 `required_check_coverage_gate` 能力。
- `index.ts` 导出 `buildRequiredCheckCoverage(...)`。
- 新增 `runTestAgentRequiredCheckCoverageSelfTest()`：
  - 一个命令检查通过；
  - `screenshots` required check 没有证据；
  - 最终状态必须是 `partial`，不能 `passed`；
  - `requiredCheckCoverage` 中 `commands=verified`、`screenshots=unknown`。

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

## 设计说明

这让 TestAgent 更适合后续群聊主 Agent 使用：主 Agent 可以把 `requiredChecks` 当成硬性验收门槛。如果用户要求 browser/screenshot/api/adversarial，而 TestAgent 没有对应证据，报告不会误报 `passed`。

## 未完成

- required check 名称仍是启发式映射，后续可换成枚举化 schema。
- 自定义 required check 目前会标为 `unknown`，不会自动匹配任意证据。
- 尚未在 CCM 前端 UI 展示 required check coverage。
