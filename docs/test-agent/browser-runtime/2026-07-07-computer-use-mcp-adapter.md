# TestAgent Computer Use MCP Adapter

日期：2026-07-07

## 目标

继续参考 `D:\claude-code` 的浏览器/桌面验证思路，给独立 TestAgent 增加 `mcp__computer-use__*` 适配能力。这个能力先保持在 `backend/test-agent/` 内部，不接群聊协作代码，后续由群聊主 Agent 把真实工具执行器传进来即可。

## 参考点

- `D:\claude-code\src\utils\computerUse\setup.ts`
  - CC 会把 Computer Use 注册为 `mcp__computer-use__{tool}` 形式。
  - allowed tools 来自 `buildComputerUseTools(...)`。
- `D:\claude-code\src\utils\computerUse\toolRendering.tsx`
  - 确认工具名和入参形状：
    - `screenshot`
    - `request_access`
    - `left_click`
    - `type`
    - `key`
    - `scroll`
    - `wait`
    - `open_application`
    - `mouse_move`
  - 坐标字段使用 `coordinate` / `start_coordinate`。
- `D:\claude-code\src\tools\AgentTool\built-in\verificationAgent.ts`
  - 前端验证要真实打开页面、截图、点击、读 console，不应该只看代码。

## 本轮完成

- `BrowserActionSpec` 增加桌面自动化字段：
  - `coordinate`
  - `startCoordinate` / `start_coordinate`
  - `direction`
  - `amount`
  - `duration`
  - `bundleId` / `bundle_id`
  - `apps`
- `BrowserActionSpec.type` 增加：
  - `scroll`
  - `openApplication`
  - `requestAccess`
- `mcp-adapters.ts` 新增 `ComputerUseAdapter`。
- `createMcpBrowserAdapter(...)` 可以识别 `mcp__computer-use__*`。
- Computer Use adapter 支持：
  - `requestAccess` -> `mcp__computer-use__request_access`
  - `openApplication` -> `mcp__computer-use__open_application`
  - `goto` -> 对当前激活浏览器执行地址栏快捷键、输入 URL、Enter
  - `click/check/uncheck` -> `left_click`
  - `hover` -> `mouse_move`
  - `fill` -> 可选坐标点击后 `type`
  - `press` -> `key`
  - `scroll` -> `scroll`
  - `waitForTimeout` -> `wait` 或本地等待
  - `screenshot` -> `screenshot`
- 新增 `runTestAgentComputerUseMcpSelfTest()`，使用 fake executor 验证工具识别、动作链调用、截图调用和 transcript 记录。

## 设计边界

Computer Use 是桌面/坐标级工具，不是 DOM 级浏览器 provider。因此它不会假装能完成以下验证：

- DOM 文本读取；
- selector 定位；
- console error 读取；
- network request 读取；
- 页面内 JS evaluate。

如果工作单要求 `consoleNoErrors`、`networkNoErrors`、`text`、`visible` 等断言，Computer Use adapter 会明确返回失败，提示使用 Playwright、Claude in Chrome 或 Chrome DevTools MCP。这样可以避免“没有真实验证却误报通过”。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit`：通过。
- `npx tsc -p backend/tsconfig.json --outDir scratch/test-agent-compiled`：通过，输出到临时目录。
- 临时编译后执行 self-test：
  - `runTestAgentSelfTest({ includeBrowser: false })`：通过。
  - `runTestAgentMcpProviderSelfTest()`：通过。
  - `runTestAgentClaudeChromeMcpSelfTest()`：通过。
  - `runTestAgentComputerUseMcpSelfTest()`：通过。
- `scratch/test-agent-compiled` 已在验证后删除，未写入 `ccm-package/dist`。

## 后续接入点

后续群聊主 Agent 只需要把 CCM 的真实 MCP/tool runtime 包装成：

```ts
{
  listTools: async () => string[],
  callTool: async (toolName, input) => unknown
}
```

然后传给：

```ts
runTestAgent(workOrder, {
  browserProvider: "mcp",
  browserToolExecutor,
})
```

## 未完成

- 尚未接入 CCM 真实 tool manager。
- Computer Use 的 `goto` 是“当前浏览器已激活”的最佳努力模式，真实接入后可以根据运行环境增加打开浏览器/选择窗口逻辑。
- 坐标由工作单提供，TestAgent 当前不做 OCR 或视觉元素定位。
