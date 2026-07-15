# TestAgent Browser Page Snapshot Artifacts

日期：2026-07-07

## 目标

让 TestAgent 的浏览器验证证据从“截图 + 文本预览”继续增强为可复核的页面快照 artifact。后续群聊主 Agent 或 UI 不需要只看 `pageTextPreview`，可以直接打开 `page-snapshots` 下的文件复查最终页面内容。

本轮仍然只修改 `backend/test-agent/*` 和 `docs/test-agent/*`，没有碰群聊协作代码。

## 本轮完成

- `types.ts`：
  - `BrowserCheckResult.pageSnapshots?: string[]`
  - `TestAgentArtifactManifestItem.type` 增加 `browser_snapshot`
  - `TestAgentArtifactManifest.summary.browserSnapshots`
- `browser/playwright-provider.ts`：
  - 每个 browser check 完成后写出最终页面快照；
  - HTML 快照：`page-snapshots/<project>-<check>-<index>.html`
  - 文本快照：`page-snapshots/<project>-<check>-<index>.txt`
- `browser/mcp-provider.ts`：
  - 将 MCP page text 写成 `page-snapshots/<project>-<check>-<index>.txt`
- `result-builder.ts`：
  - `pageSnapshots` 写入 artifact evidence。
- `artifacts.ts`：
  - Markdown Browser Details 增加 `Page snapshots`；
  - artifact manifest 增加 `browser_snapshot` 文件项；
  - manifest summary 增加 `browserSnapshots`。
- `coverage.ts`：
  - acceptance coverage 匹配候选包含 page snapshot 路径。
- `required-checks.ts`：
  - 支持 `browser_snapshot` / `browser_snapshots` / `dom_snapshot` / `page_snapshot` required check。
- `agent-profile.ts` 增加：
  - `browser_snapshot_artifacts`
- `self-test.ts`：
  - `runTestAgentArtifactManifestSelfTest()` 验证 manifest 中有 `browser_snapshot`；
  - `runTestAgentBrowserProbeTemplateSelfTest()` 验证 `browser_snapshots` required check 为 `verified`。

## 报告示例

```json
{
  "name": "Invalid form input template",
  "pageSnapshots": [
    "C:\\Users\\admin\\.cc-connect\\test-agent-artifacts\\...\\page-snapshots\\browser-probe-template-self-test-Invalid-form-input-template-1.txt"
  ]
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

- Playwright HTML snapshot 目前是单文件 HTML，不包含外部资源归档。
- MCP provider 目前只能写文本 snapshot，取决于底层 MCP 工具是否能提供 DOM/HTML。
- 后续可以加入 trace、HAR、video 等更重的浏览器证据 artifact。
