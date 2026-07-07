# TestAgent Browser Provider Preflight

日期：2026-07-07

## 目标

让 TestAgent 在浏览器验证前记录 provider 可用性诊断。参考 Claude Code verification agent 的要求，verifier 应该实际检查可用工具，而不是假设“没有浏览器”。后续群聊主 Agent 如果看到 browser check blocked/partial，可以从报告中知道是 Playwright 不可用、MCP executor 缺失，还是 MCP 工具存在但 adapter 不匹配。

## 本轮完成

- `browser/registry.ts` 新增：
  - `BrowserProviderPreflightResult`
  - `collectBrowserProviderPreflight(...)`
- provider 顺序统一由 registry 管理：
  - `browserProvider: "mcp"` -> MCP 优先；
  - `browserProvider: "playwright"` -> Playwright 优先；
  - `auto` -> Playwright 后 MCP。
- `runTestAgent()` 在浏览器验证前采集 preflight，并写入：

```ts
report.metadata.browserProviderPreflight
```

- `report.md` 新增 `Browser Provider Preflight` section：
  - provider；
  - preferred；
  - available；
  - reason；
  - tools。
- `index.ts` 导出 `collectBrowserProviderPreflight(...)`。
- `agent-profile.ts` 增加 `browser_provider_preflight` 能力。
- 新增 `runTestAgentBrowserPreflightSelfTest()`：
  - 注入 fake MCP Playwright tools；
  - 验证 `mcp` preflight available；
  - 验证 tool list 写入 metadata；
  - 验证 Markdown 包含 `Browser Provider Preflight` 和 MCP tool name。

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

## 后续接入点

群聊主 Agent 后续可以读取：

```ts
report.metadata.browserProviderPreflight
```

并在任务完成消息中解释：

- 当前用了哪个 provider；
- 为什么某个 provider 不可用；
- MCP runtime 暴露了哪些 browser tools；
- 是否需要安装 Playwright 浏览器二进制或接入 browserToolExecutor。

## 未完成

- Playwright availability 当前只检测 Node package 是否可 require，浏览器二进制缺失仍在 launch 阶段体现为 blocked；后续可以加更深的 launch preflight。
- MCP preflight 只记录工具名，尚未记录工具 schema。
- 尚未把 preflight 展示到 CCM 前端 UI。
