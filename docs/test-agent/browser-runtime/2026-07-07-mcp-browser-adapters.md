# TestAgent MCP 浏览器 Adapter 分层

日期：2026-07-07

## 目标

继续完善独立 TestAgent 的浏览器验证能力。上一轮已经能注入 `browserToolExecutor` 并记录工具调用，本轮把 MCP provider 从“按后缀猜工具”升级为“按浏览器工具族适配”，更贴近 Claude Code 中 verification agent 对 `mcp__playwright__*`、`mcp__claude-in-chrome__*` 和 Chrome DevTools MCP 的使用方式。

## 本轮完成

- 新增 `backend/test-agent/browser/mcp-adapters.ts`。
- 支持三类 MCP 浏览器 adapter：
  - `Playwright MCP`
    - `browser_navigate`
    - `browser_click`
    - `browser_type`
    - `browser_press_key`
    - `browser_wait_for`
    - `browser_evaluate`
    - `browser_snapshot`
    - `browser_console_messages`
    - `browser_network_requests`
    - `browser_take_screenshot`
  - `Claude in Chrome`
    - `tabs_create_mcp`
    - `navigate`
    - `computer`
    - `form_input`
    - `javascript_tool`
    - `get_page_text` / `read_page`
    - `read_console_messages`
    - `read_network_requests`
    - `gif_creator`
  - `Chrome DevTools MCP`
    - `new_page` / `navigate_page`
    - `click`
    - `fill` / `type`
    - `evaluate_script`
    - `take_snapshot`
    - `list_console_messages`
    - `list_network_requests`
    - `take_screenshot`
- `mcp-provider.ts` 现在先识别 adapter，再执行 actions/assertions。
- MCP 断言增强：
  - `text`
  - `visible`
  - `notVisible`
  - `elementTextIncludes`
  - `urlIncludes`
  - `titleIncludes` 的 page text fallback
  - `consoleNoErrors`
  - `networkNoErrors`
- 新增 `runTestAgentClaudeChromeMcpSelfTest()`，验证 Claude in Chrome adapter 的 `tabId` 创建和后续传递。
- 更新 `runTestAgentMcpProviderSelfTest()`，验证 Playwright MCP `browser_snapshot` 文本断言和网络/console 断言。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit`：通过。

## 设计说明

这个 adapter 层仍然不直接依赖群聊、tool manager 或 MCP client。它只要求外部传入：

```ts
{
  listTools: async () => string[],
  callTool: async (toolName, input) => unknown
}
```

因此后续群聊主 Agent 接入时，不需要修改 TestAgent 的验证逻辑，只需要把 CCM runtime 的工具调用能力包成 `browserToolExecutor`。

## 未完成

- Playwright MCP 的真实 `ref`/snapshot 工作流还需要在接入真实 MCP 后微调。
- Claude in Chrome 的 tab 管理现在只支持创建并复用一个 tab，未实现“读取现有 tab 上下文后选择 tab”。
- Chrome DevTools MCP 各版本工具 schema 可能不同，后续需要用真实工具 schema 做兼容分支。
