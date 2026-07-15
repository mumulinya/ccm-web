# TestAgent Browser Final State Evidence

日期：2026-07-07

## 目标

让浏览器验证报告不仅说明“执行过哪些 steps”，还记录浏览器最终落到哪里、页面标题是什么、页面文本里能看到什么。这样群聊主 Agent 后续判断任务是否完成时，可以直接读取最终页面状态，而不是只依赖截图路径或 action/assertion 名称。

本轮仍然只修改 `backend/test-agent/*` 和 `docs/test-agent/*`，没有碰群聊协作代码。

## 本轮完成

- `types.ts` 中 `BrowserCheckResult` 新增：
  - `finalUrl?: string`
  - `title?: string`
  - `pageTextPreview?: string`
- `browser/playwright-provider.ts`：
  - 每个 browser check 完成后尽量采集 `page.url()`、`page.title()` 和 `body.innerText()`；
  - 即使检查进入 blocked 路径，只要页面还存在，也会尽量记录最终状态。
- `browser/mcp-provider.ts`：
  - 使用 adapter 的 `currentUrl` 写入 `finalUrl`；
  - 使用已读取的 MCP page text 写入 `pageTextPreview`。
- `artifacts.ts`：
  - Browser 概览行显示 final URL；
  - Browser Details 显示 Final URL、Title 和 Page text preview。
- `result-builder.ts`：
  - structured evidence detail 中加入 final URL 和 title。
- `coverage.ts`：
  - acceptance coverage 匹配候选包含 `finalUrl/title/pageTextPreview`，提高“最终页面显示某内容”这类验收项的匹配质量。
- `self-test.ts`：
  - `runTestAgentAdversarialBrowserSelfTest()` 验证 `finalUrl` 和 `pageTextPreview`；
  - `runTestAgentBrowserProbeTemplateSelfTest()` 验证模板生成的 browser probe 也会记录最终页面状态。

## 报告字段示例

```json
{
  "name": "Invalid login stays on login page",
  "url": "http://example.test/login",
  "finalUrl": "http://example.test/login",
  "pageTextPreview": "Login\nInvalid password\nPlease try again",
  "status": "passed"
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
  - `runTestAgentBrowserProbeTemplateSelfTest()`：通过。
  - `runTestAgentSemanticLocatorSelfTest()`：通过。
  - `runTestAgentBrowserStateSelfTest()`：通过。
  - `runTestAgentBrowserPreflightSelfTest()`：通过。
  - `runTestAgentPlaywrightAvailabilitySelfTest()`：通过。
  - `runTestAgentRequiredCheckCoverageSelfTest()`：通过。
  - `runTestAgentContractSelfTest()`：通过。
- 已清理 `scratch/test-agent-compiled`。

## 未完成

- `pageTextPreview` 目前是文本预览，不是完整 DOM snapshot；后续可以加入单独 snapshot artifact。
- MCP provider 的 title 取决于底层工具是否暴露，目前先不伪造。
- Computer Use MCP 没有 DOM/page text 能力时仍只能依赖 screenshot 和工具输出。
