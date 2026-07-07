# TestAgent Artifact Manifest

日期：2026-07-07

## 目标

让 TestAgent 的产物不只散落在 `report.json`、`report.md`、screenshots 和 browser tool transcript 中，而是额外生成一个稳定的 `artifact-manifest.json`。后续群聊主 Agent 或 UI 可以直接读取 manifest，快速找到报告、截图、MCP 浏览器调用日志等证据文件。

本轮仍然只修改 `backend/test-agent/*` 和 `docs/test-agent/*`，没有碰群聊协作代码。

## 本轮完成

- `types.ts` 新增：
  - `TestAgentArtifactManifest`
  - `TestAgentArtifactManifestItem`
- `artifacts.ts` 新增：
  - `buildTestAgentArtifactManifest(...)`
  - `writeTestAgentArtifacts(...)` 现在会写入 `artifact-manifest.json`
- `report.metadata.artifactFiles` 现在包含：
  - `reportJsonPath`
  - `reportMarkdownPath`
  - `manifestPath`
- `agent.ts` 会把 browser tool recorder 的 `tool-calls.jsonl` 路径写入：
  - `report.metadata.browserToolTranscriptPath`
- `artifact-manifest.json` 会列出：
  - JSON report
  - Markdown report
  - manifest 自身
  - browser screenshots
  - browser tool transcript
  - report evidence 中已有的 artifact 项
- `agent-profile.ts` 增加 `artifact_manifest` 能力。
- `index.ts` 导出：
  - `buildTestAgentArtifactManifest(...)`
  - `runTestAgentArtifactManifestSelfTest()`
- `self-test.ts` 新增 `runTestAgentArtifactManifestSelfTest()`：
  - 使用 fake MCP browser provider；
  - 验证 manifest 文件存在；
  - 验证 report、markdown、manifest、screenshot、browser tool transcript 都被列入 manifest；
  - 验证 `tool-calls.jsonl` 确实写出。

## Manifest 结构

```ts
{
  schema: "ccm-test-agent-artifact-manifest-v1"
  reportId: string
  workOrderId: string
  taskId: string
  groupId: string
  status: "passed" | "failed" | "blocked" | "partial"
  artifactDir: string
  generatedAt: string
  summary: {
    reports: number
    screenshots: number
    browserToolTranscripts: number
    evidenceArtifacts: number
  }
  files: Array<{
    type: "report_json" | "report_markdown" | "artifact_manifest" | "screenshot" | "browser_tool_transcript" | "evidence_artifact"
    title: string
    path: string
    project?: string
    status?: string
    source?: string
  }>
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
  - `runTestAgentSemanticLocatorSelfTest()`：通过。
  - `runTestAgentBrowserStateSelfTest()`：通过。
  - `runTestAgentBrowserPreflightSelfTest()`：通过。
  - `runTestAgentPlaywrightAvailabilitySelfTest()`：通过。
  - `runTestAgentRequiredCheckCoverageSelfTest()`：通过。
  - `runTestAgentContractSelfTest()`：通过。
- 已清理 `scratch/test-agent-compiled`。

## 未完成

- manifest 当前只列出已知 artifact 类型，后续如果加入 video、trace、HAR、coverage 文件，需要扩展 type。
- MCP provider 返回的 screenshot 可能只是工具输出字符串，不一定是本地图片路径；manifest 会如实记录，后续可在 adapter 层进一步标准化。
- CCM 前端还没有展示 manifest；等群聊协作和 UI 接线时再补。
