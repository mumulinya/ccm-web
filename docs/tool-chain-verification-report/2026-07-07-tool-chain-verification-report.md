# Tool Chain Verification Report

## Why

CCM 已经分别提供了项目/群聊授权清单、子 Agent 运行时快照和工具调用审计。但排查时还需要人工把三份信息拼起来，才能回答“这个群聊或项目配置的 MCP/Skill 是否已经交付给子 Agent、是否实际调用、有没有越权”。

本次升级新增统一链路验收报告，把授权、运行时和调用审计聚合到同一份按项目/群聊分组的报告里。

## Changes

- 新增 `GET /api/tools/chain-verification`。
- 报告 schema 为 `ccm-tool-chain-verification-v1`。
- 每个项目/群聊返回：
  - 授权配置与授权可派发状态。
  - 运行时快照覆盖、可用性和待重同步状态。
  - 调用审计摘要、最近调用、Skill 调用、越权尝试。
  - 归一化状态：`not_configured`、`authorization_blocked`、`runtime_missing`、`runtime_needs_resync`、`unauthorized_attempts`、`ready_not_observed`、`verified`。
- 工具中心新增「链路验收」页签。
- 前端报告展示已观察调用、就绪未调用、需处理范围、待重同步、越权尝试和最近调用证据。
- `toolsApi.chainVerification()` 支持按 scope、scopeId、groupId、project、status 查询。

## Affected Files

- `backend/modules/tools/tools.ts`
- `frontend/src/api/index.js`
- `frontend/src/components/tools/ToolsConfig.vue`
- `ccm-package/dist/modules/tools/tools.js`
- `ccm-package/dist/modules/tools/tools.js.map`
- `ccm-package/public/index.html`
- `ccm-package/public/assets/ToolsConfig-*.js`
- `ccm-package/public/assets/ToolsConfig-*.css`
- `docs/tool-chain-verification-report/2026-07-07-tool-chain-verification-report.md`

## Verification

- `npm run build:backend`
- `npm run test:runtime-tools`
- `npm run build:frontend`
- `npm run check`
- 临时启动 `ccm-package/dist/server.js 3095` 并请求 `GET /api/tools/chain-verification`，返回：
  - `schema: ccm-tool-chain-verification-v1`
  - `success: true`
  - `totalScopes: 9`
  - `configuredScopes: 3`
  - `verified: 0`
  - `needsAttention: 3`
  - `rows: 9`
- `git diff --check -- backend/modules/tools/tools.ts frontend/src/api/index.js frontend/src/components/tools/ToolsConfig.vue`

## Risks

- `verified` 只表示在最近调用审计窗口内观察到调用，不代表历史上从未调用过或所有验收都完成。
- MCP 工具调用审计目前主要按项目/群聊上下文归属；若只记录子工具名而没有 server 名，报告不会强行推断具体 MCP grant。
- 没有运行过子 Agent 的项目/群聊会显示 `runtime_missing`，这是缺少交付证据而非一定配置错误。
- `git diff --check` 仍会显示仓库既有 CRLF 归一化提示。
