# TestAgent Report Artifacts

日期：2026-07-07

## 目标

让 TestAgent 的验证结果不只存在于函数返回值里，也能沉淀成可复盘的文件。后续群聊主 Agent 可以把 artifact 路径发给用户、任务面板或复盘系统。

## 本轮完成

- 新增 `backend/test-agent/artifacts.ts`。
- 新增 `buildTestAgentMarkdownReport(report)`：
  - 输出状态、建议、任务信息、耗时；
  - 汇总命令、HTTP、浏览器验证；
  - 汇总 acceptance coverage；
  - 汇总 risks、blocked reasons、evidence。
- 新增 `writeTestAgentArtifacts(report)`：
  - 写入 `artifactDir/report.json`；
  - 写入 `artifactDir/report.md`；
  - 将两个文件路径写入 `report.metadata.artifactFiles`；
  - 将两个文件作为 `artifact` evidence 追加到最终报告。
- `runTestAgent()` 现在返回前会自动写 artifact。
- `index.ts` 导出 artifact writer，方便后续 CLI 或其他 runtime 复用。
- 新增 `runTestAgentArtifactSelfTest()`，验证 JSON/Markdown 文件真实写入且进入 evidence。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit`：通过。
- `npx tsc -p backend/tsconfig.json --outDir scratch/test-agent-compiled`：通过，输出到临时目录。
- 临时编译后执行 self-test：
  - `runTestAgentSelfTest({ includeBrowser: false })`：通过。
  - `runTestAgentMcpProviderSelfTest()`：通过。
  - `runTestAgentClaudeChromeMcpSelfTest()`：通过。
  - `runTestAgentComputerUseMcpSelfTest()`：通过。
  - `runTestAgentWorkOrderNormalizationSelfTest()`：通过。
  - `runTestAgentArtifactSelfTest()`：通过。

## 后续接入点

群聊主 Agent 后续拿到 `TestAgentReport` 后，可以读取：

```ts
report.metadata.artifactFiles.reportJsonPath
report.metadata.artifactFiles.reportMarkdownPath
```

并把 Markdown 报告路径或 JSON 报告路径绑定到任务完成消息、审计记录或项目复盘里。

## 未完成

- 还没有把 artifact 路径接到 CCM 前端 UI。
- 还没有将截图文件复制/归档到统一 artifact 目录；当前截图路径取决于 provider 返回。
- Markdown 报告是基础版，后续可以按用户界面展示格式继续优化。
