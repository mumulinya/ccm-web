# TestAgent 浏览器 Provider 与 HTTP 探测增强

日期：2026-07-07

## 目标

在不修改群聊协作代码的前提下，继续完善独立 `backend/test-agent/` 模块，让 TestAgent 更接近 Claude Code verification agent 的设计：

- verification-only，不修改项目文件；
- 不只看代码，必须执行命令、启动服务、探测页面、操作浏览器；
- 浏览器能力可扩展，不把实现锁死在单一 Playwright 逻辑里；
- 报告必须包含可复盘的真实证据。

## 参考点

参考 `D:\claude-code` 中的实现思路：

- `src/tools/AgentTool/built-in/verificationAgent.ts`：要求 verifier 检查实际可用浏览器工具，优先使用 `mcp__claude-in-chrome__*` 或 `mcp__playwright__*`，并明确不能用“没有浏览器”作为未经尝试的借口。
- `src/utils/claudeInChrome/setup.ts`：将 Chrome 扩展浏览器能力注册成 MCP 工具。
- `src/utils/claudeInChrome/prompt.ts`：浏览器验证包含 tab 上下文、导航、console 日志、弹窗规避和失败重试边界。
- `src/commands/init-verifiers.ts`：Web UI verifier 推荐 Playwright，同时支持 Chrome DevTools MCP 与 Claude Chrome Extension MCP。

## 本轮完成

- 新增浏览器 provider 架构：
  - `backend/test-agent/browser/provider-types.ts`
  - `backend/test-agent/browser/shared.ts`
  - `backend/test-agent/browser/playwright-provider.ts`
  - `backend/test-agent/browser/mcp-provider.ts`
  - `backend/test-agent/browser/registry.ts`
- `browser-verifier.ts` 改为 provider registry 入口。
- Playwright provider 增强：
  - 支持 `goto/click/fill/selectOption/check/uncheck/hover/press/wait/evaluate`；
  - 收集 console error、page error、网络请求失败和 5xx response；
  - 支持截图证据；
  - 浏览器二进制缺失时返回结构化 `blocked`，不抛崩。
- MCP provider 预留：
  - 接收 `browserToolExecutor`；
  - 可发现 `mcp__playwright__*`、`mcp__claude-in-chrome__*`、Chrome DevTools、Computer Use 类工具；
  - 先支持基础导航、点击、输入、console 读取和截图工具映射；
  - 当前未接群聊和工具运行时，只作为后续接入点。
- 新增 `http-verifier.ts`：
  - 请求目标页面；
  - 抽取同源 `src/href` 静态资源做小样本探测；
  - 避免“HTML 200 但 JS/CSS/API 资源挂了”被误判为通过。
- 报告协议增强：
  - `TestAgentReport.httpResults`；
  - `BrowserCheckResult.provider`；
  - `BrowserCheckResult.networkErrors`；
  - HTTP 探测进入 evidence、risk、status 和 acceptance coverage。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit`：通过。

## 后续接入点

后续群聊主 Agent 可调用：

```ts
import { runTestAgent } from "../test-agent";

const report = await runTestAgent(workOrder, {
  browserProvider: "auto",
  browserToolExecutor,
});
```

其中 `browserToolExecutor` 后续可由 CCM 的 MCP/tool runtime 提供，不需要 TestAgent 直接依赖群聊协作模块。

## 未完成

- 还没有接入 CCM 现有 MCP tool manager 的真实 `callTool`。
- Playwright Chromium 二进制如果本机未安装，浏览器 E2E 仍会 `partial/blocked`。
- MCP provider 当前是基础映射，后续需要根据 CCM 实际工具 schema 做精细适配。
