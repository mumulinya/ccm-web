# TestAgent Adversarial Browser Probes

日期：2026-07-07

## 目标

让 TestAgent 支持浏览器侧对抗/边界验证，而不是只能做普通 happy path browser checks。后续群聊主 Agent 可以把“无效输入”“重复点击”“刷新后状态保持”“错误操作不应跳转”等风险场景作为 `adversarialBrowserChecks` 传给 TestAgent，由真实浏览器 provider 执行并写入证据报告。

本轮仍然只修改 `backend/test-agent/*` 和 `docs/test-agent/*`，没有碰群聊协作代码。

## 本轮完成

- `types.ts` 增加：
  - `TestAgentProjectTarget.adversarialBrowserChecks`
  - `NormalizedTestAgentProjectTarget.adversarialBrowserChecks`
  - `BrowserCheckSpec.adversarial`
  - `BrowserCheckSpec.probeType`
  - `BrowserCheckResult.adversarial`
  - `BrowserCheckResult.probeType`
- `work-order.ts` 支持：
  - `adversarialBrowserChecks`
  - `adversarial_browser_checks`
  - browser check 级别的 `adversarial/probe/probeType/probe_type`
- `browser/shared.ts`：
  - 普通 `browserChecks` 和 `adversarialBrowserChecks` 会合并执行；
  - 纯 `requiredChecks: ["adversarial"]` 不再误触发 browser provider，避免纯 HTTP adversarial 被浏览器可用性阻塞。
- `browser/playwright-provider.ts` 和 `browser/mcp-provider.ts`：
  - browser result 写入 `adversarial` 和 `probeType`。
- `result-builder.ts` 和 `artifacts.ts`：
  - evidence / markdown report 会显示 `Adversarial` 和 `Probe type`。
- `coverage.ts`：
  - acceptance coverage 匹配文本包含 adversarial browser 和 probe type。
- `required-checks.ts`：
  - `requiredChecks: ["adversarial"]` 现在同时认可 adversarial HTTP 和 adversarial browser 证据。
- `contract/schema.ts`：
  - work order contract 支持 adversarial browser checks。
- `contract/examples.ts`：
  - web app 示例增加 “Invalid login stays on login page” UI 对抗探针。
- `agent-profile.ts` 增加：
  - `adversarial_browser_probes`
- `self-test.ts` 新增：
  - `runTestAgentAdversarialBrowserSelfTest()`

## Work Order 示例

```ts
{
  requiredChecks: ["browser_e2e", "adversarial", "screenshots", "console_errors"],
  projects: [{
    name: "web-app",
    workDir: "C:\\path\\to\\web-app",
    adversarialBrowserChecks: [{
      name: "Invalid login stays on login page",
      probeType: "negative_auth_ui",
      url: "http://127.0.0.1:5173/login",
      actions: [
        { type: "fill", label: "Email", value: "bad@example.test" },
        { type: "fill", label: "Password", value: "wrong-password" },
        { type: "click", role: "button", name: "Sign in" }
      ],
      assertions: [
        { type: "urlIncludes", text: "/login" },
        { type: "visible", text: "Invalid" },
        { type: "consoleNoErrors" }
      ],
      screenshot: true
    }]
  }]
}
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
  - `runTestAgentArtifactManifestSelfTest()`：通过。
  - `runTestAgentCoverageSelfTest()`：通过。
  - `runTestAgentCommandPlannerSelfTest()`：通过。
  - `runTestAgentHttpApiSelfTest()`：通过。
  - `runTestAgentAdversarialHttpSelfTest()`：通过。
  - `runTestAgentAdversarialBrowserSelfTest()`：通过。
  - `runTestAgentSemanticLocatorSelfTest()`：通过。
  - `runTestAgentBrowserStateSelfTest()`：通过。
  - `runTestAgentBrowserPreflightSelfTest()`：通过。
  - `runTestAgentPlaywrightAvailabilitySelfTest()`：通过。
  - `runTestAgentRequiredCheckCoverageSelfTest()`：通过。
  - `runTestAgentContractSelfTest()`：通过。
- 已清理 `scratch/test-agent-compiled`。

## 未完成

- 目前 adversarial browser probes 仍由主 Agent 显式传入，尚未根据 acceptance criteria 自动生成。
- 还没有内置 probe 模板库，例如 repeated click、refresh persistence、invalid form input、role permission boundary。
- MCP adapter 的截图仍可能是工具输出字符串，不一定是本地图片文件路径；后续可继续标准化。
