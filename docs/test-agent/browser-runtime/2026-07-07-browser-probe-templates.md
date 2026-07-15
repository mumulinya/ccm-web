# TestAgent Browser Probe Templates

日期：2026-07-07

## 目标

让群聊主 Agent 后续不用为常见浏览器对抗场景重复手写完整 `actions/assertions`。本轮新增 `adversarialBrowserProbeTemplates`，由 TestAgent 在 work order normalization 阶段生成可执行的 `adversarialBrowserChecks`，再交给现有 Playwright/MCP browser provider 跑真实验证。

本轮仍然只修改 `backend/test-agent/*` 和 `docs/test-agent/*`，没有碰群聊协作代码。

## 本轮完成

- `types.ts` 新增：
  - `BrowserProbeTemplateSpec`
  - `BrowserProbeTemplateFieldSpec`
  - `TestAgentProjectTarget.adversarialBrowserProbeTemplates`
  - `TestAgentProjectTarget.adversarial_browser_probe_templates`
- 新增 `backend/test-agent/browser-probe-templates.ts`：
  - `buildAdversarialBrowserProbeChecks(...)`
- 支持 3 类模板：
  - `invalid_form_input`
  - `repeated_click`
  - `refresh_persistence`
- `work-order.ts`：
  - 将模板展开为 `adversarialBrowserChecks`；
  - 生成后的检查继续走现有 action/assertion normalizer；
  - `no_executable_checks` 现在会把 `adversarialBrowserChecks` 算作可执行检查。
- `contract/schema.ts`：
  - work order contract 支持 `adversarialBrowserProbeTemplates`。
- `contract/examples.ts`：
  - web app 示例改用 `invalid_form_input` 模板描述无效登录 UI 探针。
- `agent-profile.ts` 增加：
  - `browser_probe_templates`
- `index.ts` 导出：
  - `buildAdversarialBrowserProbeChecks(...)`
  - `runTestAgentBrowserProbeTemplateSelfTest()`
- `self-test.ts` 新增：
  - `runTestAgentBrowserProbeTemplateSelfTest()`

## Work Order 示例

```ts
{
  requiredChecks: ["browser_e2e", "adversarial", "screenshots", "console_errors"],
  projects: [{
    name: "web-app",
    workDir: "C:\\path\\to\\web-app",
    adversarialBrowserProbeTemplates: [{
      kind: "invalid_form_input",
      name: "Invalid login stays on login page",
      url: "http://127.0.0.1:5173/login",
      fields: [
        { label: "Email", value: "bad@example.test" },
        { label: "Password", value: "wrong-password" }
      ],
      submit: { role: "button", name: "Sign in" },
      expectedUrlIncludes: "/login",
      expectedText: "Invalid",
      screenshot: true
    }]
  }]
}
```

## 模板语义

- `invalid_form_input`
  - 可生成：goto、fill fields、click submit、URL/text/console assertions。
- `repeated_click`
  - 可生成：goto、setup actions、重复 click target、断言。
  - `repeat` 会限制在 2 到 10 次，避免误造过重检查。
- `refresh_persistence`
  - 可生成：goto、setup actions、reload、state assertions。
  - 适合验证 localStorage/sessionStorage/JS 状态刷新后仍正确。

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
  - `runTestAgentBrowserProbeTemplateSelfTest()`：通过。
  - `runTestAgentSemanticLocatorSelfTest()`：通过。
  - `runTestAgentBrowserStateSelfTest()`：通过。
  - `runTestAgentBrowserPreflightSelfTest()`：通过。
  - `runTestAgentPlaywrightAvailabilitySelfTest()`：通过。
  - `runTestAgentRequiredCheckCoverageSelfTest()`：通过。
  - `runTestAgentContractSelfTest()`：通过。
- 已清理 `scratch/test-agent-compiled`。

## 未完成

- 模板仍需要主 Agent 显式选择，尚未从 acceptance criteria 自动推断。
- `repeated_click` 和 `refresh_persistence` 已有生成逻辑，但还没有单独的 runtime self-test 覆盖。
- 后续可以加更多模板，例如 permission boundary、empty state、offline/network failure、back/forward navigation。
