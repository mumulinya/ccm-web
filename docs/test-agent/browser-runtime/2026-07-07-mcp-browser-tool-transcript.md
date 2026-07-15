# TestAgent MCP 浏览器工具调用可审计增强

日期：2026-07-07

## 目标

继续完善独立 `backend/test-agent/`，参考 Claude Code 通过 MCP 暴露浏览器能力的思路，让 TestAgent 后续接入 `mcp__playwright__*`、`mcp__claude-in-chrome__*` 或 `mcp__computer-use__*` 时，不只是得到最终结论，还能复盘它实际调用了哪些浏览器工具。

## 本轮完成

- 新增 `backend/test-agent/browser/tool-executor.ts`：
  - `createRecordingBrowserToolExecutor()`：包装外部传入的 `browserToolExecutor`；
  - 自动记录每次 `callTool(toolName, input)`；
  - 将调用记录写入 `artifactDir/browser-tools/tool-calls.jsonl`；
  - 在内存中返回 `BrowserToolCallRecord[]` 供最终报告使用；
  - `createStaticBrowserToolExecutor()`：用于无真实 MCP 环境下的 provider 自测。
- 扩展报告协议：
  - `BrowserToolCallRecord`；
  - `TestAgentReport.browserToolCalls`。
- `runTestAgent()` 自动包装传入的 `browserToolExecutor`，不要求群聊或工具运行时改代码。
- `result-builder.ts` 将浏览器工具调用 transcript 作为 evidence 之一。
- `self-test.ts` 新增 `runTestAgentMcpProviderSelfTest()`，用 fake MCP 工具验证 MCP provider 路径。
- `agent-profile.ts` 补充 `browser_tool_call_transcript` 能力说明。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit`：通过。

## 后续接入方式

后续群聊主 Agent 或 CCM runtime 只需要提供：

```ts
const report = await runTestAgent(workOrder, {
  browserProvider: "mcp",
  browserToolExecutor: {
    listTools: async () => availableToolNames,
    callTool: async (toolName, input) => invokeRuntimeTool(toolName, input),
  },
});
```

TestAgent 会自动记录工具调用，不需要接入方手动维护 transcript。

## 未完成

- 尚未接入 CCM 现有 tool manager 的真实 `invokeRuntimeTool`。
- MCP provider 的参数映射仍是基础版，后续需要按实际 MCP schema 补强，例如 Playwright MCP 的 snapshot/ref 操作、Claude in Chrome 的 tabId 管理和 Computer Use 坐标动作。
