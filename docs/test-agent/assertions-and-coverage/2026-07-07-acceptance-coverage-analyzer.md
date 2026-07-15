# TestAgent Acceptance Coverage Analyzer

日期：2026-07-07

## 目标

让 TestAgent 的 `acceptanceCoverage` 从“按整体状态一刀切”升级为“逐条验收标准映射真实证据”。这更接近 Claude Code verification agent 的要求：不能只说 PASS，必须说明每个检查点由哪些命令、HTTP、浏览器操作或工具调用证明。

## 本轮完成

- 新增 `backend/test-agent/coverage.ts`。
- `result-builder.ts` 改为调用 `buildAcceptanceCoverage(...)`。
- coverage analyzer 会收集这些证据候选：
  - dev server 启动结果；
  - verification command 输出；
  - HTTP 页面和资源探测结果；
  - browser check 名称、URL、步骤、错误、截图；
  - MCP browser tool call transcript；
  - work order issue；
  - 已构建的 evidence。
- 每条 acceptance criterion 单独判定：
  - 命中失败/阻塞证据：`not_verified`；
  - 命中通过证据：`verified`；
  - 没有直接证据：`unknown`；
  - 单条验收标准且整体通过时，允许用全部通过证据作为兜底。
- 支持英文 token/stem 匹配和基础中文 bigram 匹配，减少完全依赖整句相等的问题。
- 新增 `runTestAgentCoverageSelfTest()`：
  - `Login page renders` 命中过关命令输出 -> `verified`；
  - `Settings save persists` 命中失败浏览器断言 -> `not_verified`；
  - `Checkout flow completes` 没有证据 -> `unknown`。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit --pretty false`：通过。
- `npx tsc -p backend/tsconfig.json --outDir scratch/test-agent-compiled`：曾被无关文件阻塞：
  - `backend/modules/knowledge/memory-control-center.ts(4808,39): error TS2304: Cannot find name 'normalizeCompactFileReferencePath'.`
  - 该文件不属于 TestAgent，本轮未修改。
- 为避免依赖失败的全量产物，创建临时 `scratch/test-agent-tsconfig.json`，只包含 TestAgent 和必要 core 依赖。
- `npx tsc -p scratch/test-agent-tsconfig.json`：通过。
- scoped 编译后执行 self-test：
  - `runTestAgentSelfTest({ includeBrowser: false })`：通过。
  - `runTestAgentMcpProviderSelfTest()`：通过。
  - `runTestAgentClaudeChromeMcpSelfTest()`：通过。
  - `runTestAgentComputerUseMcpSelfTest()`：通过。
  - `runTestAgentWorkOrderNormalizationSelfTest()`：通过。
  - `runTestAgentArtifactSelfTest()`：通过。
  - `runTestAgentCoverageSelfTest()`：通过。

## 设计说明

这次没有把 coverage 写成“只要总报告 passed 就所有验收项 verified”。原因是 TestAgent 后续会被群聊主 Agent 用来判断项目子 Agent 的任务是否真的完成，如果某条验收标准没有直接证据，它应该保留 `unknown`，而不是制造确定性。

## 后续接入点

后续群聊主 Agent 可以读取：

```ts
report.acceptanceCoverage
```

然后把逐条验收状态展示给用户，或者在存在 `unknown` / `not_verified` 时要求项目子 Agent 继续补测。

## 未完成

- coverage 仍是文本相似度和结构化结果结合的启发式，不等价于完整需求追踪系统。
- 后续如果 work order 支持带 ID 的验收项，可以把 evidence 直接绑定到 criterion ID，减少文本匹配的不确定性。
- artifact writer 追加的 `report.json` / `report.md` 目前在 coverage 之后写入，因此不会反向作为验收证据；这是刻意的，报告文件本身不应该证明业务功能完成。
