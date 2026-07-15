# TestAgent Browser State Assertions

日期：2026-07-07

## 目标

继续增强 TestAgent 的浏览器真实验证能力。Claude Code verification agent 明确提醒 verifier 要警惕“按钮看起来能点，但状态刷新后消失”这类问题。本轮给 TestAgent 增加 browser state assertions，让工作单能表达 reload/history navigation 后的 localStorage/sessionStorage/JS 状态验证。

## 本轮完成

- `BrowserActionSpec.type` 增加：
  - `reload`
  - `goBack`
  - `goForward`
- action 别名：
  - `refresh` -> `reload`
  - `reload_page` -> `reload`
  - `go_back` / `back` -> `goBack`
  - `go_forward` / `forward` -> `goForward`
- `BrowserAssertionSpec.type` 增加：
  - `jsTruthy`
  - `jsEquals`
  - `localStorageEquals`
  - `localStorageIncludes`
  - `sessionStorageEquals`
  - `sessionStorageIncludes`
- assertion 别名：
  - `js_truthy` / `javascript_truthy` -> `jsTruthy`
  - `js_equals` / `javascript_equals` -> `jsEquals`
  - `local_storage_equals` -> `localStorageEquals`
  - `local_storage_includes` -> `localStorageIncludes`
  - `session_storage_equals` -> `sessionStorageEquals`
  - `session_storage_includes` -> `sessionStorageIncludes`
- `BrowserAssertionSpec` 增加：
  - `key`
  - `expression`
- Playwright provider 支持：
  - `page.reload(...)`
  - `page.goBack(...)`
  - `page.goForward(...)`
  - 执行 JS expression 并断言 truthy/equality；
  - 读取 `localStorage` / `sessionStorage` 并断言 equals/includes。
- `agent-profile.ts` 增加 `browser_state_assertions` 能力说明。
- 新增 `runTestAgentBrowserStateSelfTest()`：
  - 验证 refresh/go_back/go_forward 规范化；
  - 验证 local storage assertion 规范化；
  - 验证 JS expression assertion 规范化。

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

## 后续接入点

群聊主 Agent 后续可以传：

```json
{
  "browserChecks": [{
    "name": "Profile save persists after refresh",
    "actions": [
      { "type": "fill", "label": "Display name", "value": "Ada" },
      { "type": "click", "role": "button", "name": "Save" },
      { "type": "reload" }
    ],
    "assertions": [
      { "type": "localStorageEquals", "key": "profile.saved", "value": "true" },
      { "type": "jsTruthy", "expression": "document.body.textContent.includes('Ada')" }
    ],
    "screenshot": true
  }]
}
```

## 未完成

- 当前 self-test 主要验证规范化和类型路径，没有强依赖本机 Chromium。
- MCP provider 暂未实现 JS/storage assertions；目前主要由 Playwright provider 执行。
- 还没有高级持久化探针，例如刷新后重新登录、跨 tab/session 验证。
