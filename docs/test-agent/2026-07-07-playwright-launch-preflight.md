# TestAgent Playwright Launch Preflight

日期：2026-07-07

## 目标

增强 browser provider preflight 的真实性。上一轮 preflight 能记录 provider 可用性和 MCP tools，但 Playwright availability 只检查 `require("playwright")` 是否成功；如果 Chromium 浏览器二进制缺失，只有真正运行浏览器时才会 blocked。本轮把 Playwright preflight 升级为真实 launch/close Chromium。

## 本轮完成

- `browser/playwright-provider.ts` 新增：
  - `checkPlaywrightAvailability(...)`
- Playwright availability 现在会：
  - 尝试加载 Playwright package；
  - 尝试 `chromium.launch({ headless: true, timeout: 10000 })`；
  - 成功后立即 close browser；
  - 失败时返回 `Playwright Chromium launch failed: ...`。
- `BrowserProviderAvailability` 增加：
  - `diagnostics`
- `BrowserProviderPreflightResult` 增加：
  - `diagnostics`
- `report.metadata.browserProviderPreflight` 现在会包含 Playwright diagnostics：

```json
{
  "packageAvailable": true,
  "launchChecked": true,
  "browser": "chromium"
}
```

- `report.md` 的 `Browser Provider Preflight` section 会展示 diagnostics。
- `index.ts` 导出 `checkPlaywrightAvailability(...)`。
- 新增 `runTestAgentPlaywrightAvailabilitySelfTest()`：
  - fake Playwright launch 成功分支；
  - fake Playwright launch 失败分支；
  - 验证 browser 被 close；
  - 验证 diagnostics 和 reason。

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

## 设计说明

这让 TestAgent 更符合 Claude Code verification agent 的精神：先实际检查可用工具，而不是只根据包是否存在推断浏览器可用。后续如果本机 Playwright package 存在但 Chromium 二进制没安装，报告会在 preflight 里解释原因，而不是只在最终 browser result 里出现 launch blocked。

## 未完成

- Preflight 目前只检查 Chromium，不检查 Firefox/WebKit。
- 真实 launch 会带来少量时间成本；后续可加缓存，避免同一 report 内重复 launch。
- 尚未自动安装 Playwright 浏览器，TestAgent 仍保持 verification-only。
