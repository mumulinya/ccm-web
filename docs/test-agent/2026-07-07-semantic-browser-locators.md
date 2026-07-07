# TestAgent Semantic Browser Locators

日期：2026-07-07

## 目标

增强 TestAgent 的浏览器操作能力。之前 Playwright provider 主要依赖 CSS selector；真实群聊主 Agent 更可能把“点击 Save 按钮”“填写 Email 输入框”“检查 toast 文本”描述成 text、label、testId 或 role。参考 Claude Code verification agent 的浏览器操作思路，本轮给 TestAgent 增加语义定位能力。

## 本轮完成

- `BrowserActionSpec` 和 `BrowserAssertionSpec` 增加语义定位字段：
  - `locator`
  - `testId` / `test_id`
  - `dataTestId` / `data_testid`
  - `label`
  - `placeholder`
  - `role`
  - `name`
  - `altText` / `alt_text`
  - `title`
  - `exact`
- `work-order.ts` 会规范化这些字段，支持常见别名：
  - `ariaLabel` / `aria_label` -> `label`
  - `accessibleName` / `accessible_name` -> `name`
  - `alt` -> `altText`
- 新增 `backend/test-agent/browser/semantic-locator.ts`：
  - `buildSemanticLocatorPlan(...)`
  - `browserTargetDetail(...)`
  - `resolvePlaywrightLocator(...)`
- Playwright provider 现在支持：
  - selector / locator；
  - testId；
  - label；
  - placeholder；
  - role + accessible name；
  - text；
  - alt text；
  - title。
- `press` 支持无目标的全局 keyboard press，例如只传 `{ type: "press", key: "Enter" }`。
- MCP adapter 的 target input 也会带上语义字段，后续真实 MCP 工具可利用这些信息。
- `agent-profile.ts` 增加 `semantic_browser_locators` 能力。
- 新增 `runTestAgentSemanticLocatorSelfTest()`：
  - 验证 `test_id` -> `testId` locator plan；
  - 验证 `label + exact`；
  - 验证无目标 `press_key` 不强制 locator；
  - 验证 `role + name`；
  - 验证 `data_testid` assertion。

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

## 后续接入点

群聊主 Agent 后续可以传：

```json
{
  "browserChecks": [{
    "name": "Save profile",
    "actions": [
      { "type": "fill", "label": "Email", "value": "ada@example.test" },
      { "type": "click", "role": "button", "name": "Save" }
    ],
    "assertions": [
      { "type": "visible", "data_testid": "save-toast" },
      { "type": "elementTextIncludes", "data_testid": "save-toast", "value": "Saved" }
    ],
    "screenshot": true
  }]
}
```

## 未完成

- 当前 self-test 验证 locator plan，没有启动真实 Chromium；真实浏览器路径仍依赖本机 Playwright 浏览器二进制。
- 还没有支持 chained locator，例如 role 内再按 text 过滤。
- 还没有自动从截图/OCR 反推坐标；Computer Use 仍需要工作单显式给坐标。
