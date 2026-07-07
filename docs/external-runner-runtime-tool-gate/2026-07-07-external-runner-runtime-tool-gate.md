# External Runner Runtime Tool Gate

## Why

CCM 已经在服务端派发项目/群聊子 Agent 前检查 MCP/Skill 授权与运行时同步状态，但外部 Agent Runner 请求会进入文件队列。如果请求排队后工具商城、授权范围或 runtime 快照发生变化，runner 只依赖 `allowedTools` 和 `mcpConfigPath` 启动子 Agent，会留下旧快照继续执行的窗口。

这次升级把派发时的 runtime tool 快照、dispatch gate、授权 scope 一起写入 runner request，并在 runner 真正启动 CLI 前复验。复验失败时 fail closed，写入结构化 blocked result，不启动 Claude Code/Cursor/Codex 等子 Agent。

## Changes

- `backend/server.ts`
  - `createAgentRunnerRequest` 现在写入 `runtimeToolSnapshot`、`runtimeToolDispatchGate`、`runtimeToolSnapshotPath`、`runtimeToolSnapshotRequired` 和 `toolScope`。
  - 外部 runner fallback 会携带 `groupId`、runtime tool 快照和 dispatch gate。
  - 项目 `/api/send`、`/api/send-stream` 的 tool context 增加 runner 可消费的快照字段。

- `backend/agents/runner.ts`
  - 新增 `validateExternalRunnerRuntimeToolGate`，启动前复验：
    - request gate 是否已阻断；
    - runtime snapshot 是否存在、可解析；
    - request `snapshotId` 是否仍匹配磁盘快照；
    - snapshot `dispatch_gate` 是否通过；
    - 当前项目/群聊授权 scope 是否仍等于排队时的授权；
    - `probeRuntimeToolReadiness` 的 delivery checks 是否通过。
  - 复验失败时写入 `runtime_tool_dispatch_gate`、`runtime_tool_snapshot`、`runtime_tool_readiness`、`runtime_tool_scope`，并标记 request failed。
  - runner 主入口改为 `require.main === module` guard，便于自测 import。
  - 新增 `runAgentRunnerSelfTest`。

- `backend/modules/collaboration/group-live-routes.ts`
  - 群聊实时派发路径向 project/group agent 调用显式传递 runtime tool 快照和 dispatch gate。

- `backend/modules/collaboration/collaboration.ts`
  - 探针、直接任务、自动执行、代码审查路径向外部 runner fallback 显式传递 runtime tool 快照和 dispatch gate。

- `scripts/runtime-tool-fabric-selftest.mjs`
  - 将 `runAgentRunnerSelfTest` 纳入 `npm run test:runtime-tools`。

## Verification

- Passed: `npm run build:backend`
- Passed: `npm run test:runtime-tools`
  - `agentRunner.runnerGateAcceptsFreshSnapshot: true`
  - `agentRunner.runnerGateBlocksMissingSnapshot: true`
  - `agentRunner.runnerGateBlocksDispatchGate: true`
  - `agentRunner.runnerGateBlocksScopeDrift: true`
- Passed: `npm run check`
- Passed: `git diff --check -- <touched files>`; only LF/CRLF warnings were reported.
- Passed: temp dist smoke on port `3091`
  - `GET /` returned `200`
  - `GET /api/tools/runtime-readiness?deep=0` returned `200`
  - readiness payload included `dispatch_gate`

## Risks

- 旧的 runner request 如果缺少 runtime snapshot 但声明了 MCP/Skill payload，会被新 runner 拒绝启动。这是预期的 fail-closed 行为。
- 群聊授权变更后，排队中的旧 request 会因 scope drift 被阻断，需要由服务端重新派发生成新快照。
