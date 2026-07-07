# TestAgent Browser Telemetry Artifacts

日期：2026-07-07

## 目标

让 TestAgent 的浏览器验证不只判断 console/network 是否有错误，还把浏览器遥测记录成可复核 artifact。后续群聊主 Agent 或 UI 可以直接打开 console/network 日志，确认浏览器运行期间真实发生了什么。

本轮仍然只修改 `backend/test-agent/*` 和 `docs/test-agent/*`，没有碰群聊协作代码。

## 本轮完成

- `types.ts`：
  - `BrowserCheckResult.consoleMessages?: string[]`
  - `BrowserCheckResult.networkRequests?: string[]`
  - `BrowserCheckResult.consoleLogPath?: string`
  - `BrowserCheckResult.networkLogPath?: string`
  - `TestAgentArtifactManifestItem.type` 增加：
    - `browser_console_log`
    - `browser_network_log`
  - `TestAgentArtifactManifest.summary` 增加：
    - `browserConsoleLogs`
    - `browserNetworkLogs`
- `browser/playwright-provider.ts`：
  - 采集所有 console message；
  - 采集 browser request/response/requestfailed 摘要；
  - 继续从中提取 console errors 和 network errors；
  - 写出 `browser-telemetry/<project>-<check>-<index>.console.log`；
  - 写出 `browser-telemetry/<project>-<check>-<index>.network.log`。
- `browser/mcp-provider.ts`：
  - 将 MCP 工具返回的 console/network 错误或摘要写成 telemetry log artifact；
  - MCP 工具没有返回内容时也写出空日志，方便证明已查询。
- `result-builder.ts`：
  - console/network log path 写入 artifact evidence。
- `artifacts.ts`：
  - Markdown Browser Details 增加 Console messages、Network requests 和完整日志路径；
  - artifact manifest 增加 `browser_console_log`、`browser_network_log` 文件项；
  - manifest summary 增加 console/network log 计数。
- `coverage.ts`：
  - acceptance coverage 匹配候选包含 console/network 消息和日志路径。
- `required-checks.ts`：
  - 支持 `browser_console_logs` / `console_log` required check；
  - 支持 `browser_network_logs` / `network_log` required check。
- `agent-profile.ts` 增加：
  - `browser_telemetry_artifacts`
- `self-test.ts`：
  - `runTestAgentArtifactManifestSelfTest()` 验证 manifest 中有 console/network log artifact；
  - `runTestAgentBrowserProbeTemplateSelfTest()` 验证 `browser_console_logs`、`browser_network_logs` required check 为 `verified`。

## Artifact 示例

```text
browser-telemetry/
  browser-probe-template-self-test-Invalid-form-input-template-1.console.log
  browser-probe-template-self-test-Invalid-form-input-template-1.network.log
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

- MCP provider 的遥测深度取决于底层 MCP 工具，目前通常只有错误/摘要。
- Playwright network log 当前是 request/response 文本摘要，不是 HAR；后续可以加入 HAR artifact。
- 还没有把 console/network log 做成 UI 展示，后续接入群聊主 Agent 或前端时再补。
