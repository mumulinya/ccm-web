# Marketplace Auto Runtime Resync

## Why

CCM 工具商城已经能在安装、更新、卸载 MCP/Skill 时报告授权影响和运行时影响，但之前运行时重同步主要依赖用户在 UI 中再点一次「重同步」。这会让「从商城下载工具」到「子 Agent 运行时实际拿到最新 MCP/Skill」之间多一个手动步骤。

本次升级让商城变更可以自动按受影响的 runtime snapshot 执行重同步，进一步闭合商城、授权、运行时交付链路。

## Changes

- `POST /api/marketplace/install`、`POST /api/marketplace/update`、`POST /api/marketplace/uninstall` 支持 `autoResync: true`。
- 后端根据 `runtimeImpact.snapshots[].snapshotId` 调用已有 `resyncRecentRuntimeToolSnapshots`，只重同步受影响快照。
- 新增 `ccm-marketplace-runtime-resync-v1` 脱敏结果结构，只返回 action、reason、before/after readiness 摘要和 summary，不暴露 workDir 或底层 runtime audit。
- 商城操作审计记录 `runtimeResync`，操作历史 summary 增加 `runtimeResynced` 与 `runtimeResyncFailed`。
- 工具商城前端安装、更新、卸载默认携带 `autoResync: true`。
- UI 在最近操作、操作 banner 和 toast 中展示自动重同步结果。
- marketplace E2E selftest 增加自动重同步断言，验证更新/卸载会重同步受影响快照且不会泄露 workDir。

## Affected Files

- `backend/modules/tools/marketplace.ts`
- `frontend/src/components/tools/ToolsConfig.vue`
- `ccm-package/dist/modules/tools/marketplace.js`
- `ccm-package/dist/modules/tools/marketplace.js.map`
- `ccm-package/public/index.html`
- `ccm-package/public/assets/ToolsConfig-*.js`
- `ccm-package/public/assets/ToolsConfig-*.css`
- `docs/marketplace-auto-runtime-resync/2026-07-07-marketplace-auto-runtime-resync.md`

## Verification

- `npm run build:backend`
- `npm run test:runtime-tools`
- `npm run build:frontend`
- `npm run check`
- 临时启动 `ccm-package/dist/server.js 3093` 并请求 `GET /api/marketplace/operations?limit=5`，返回：
  - `schema: ccm-marketplace-operations-v1`
  - `success: true`
  - `runtimeResynced: 0`
  - `runtimeResyncFailed: 0`
- `git diff --check -- backend/modules/tools/marketplace.ts frontend/src/components/tools/ToolsConfig.vue ccm-package/dist/modules/tools/marketplace.js ccm-package/dist/modules/tools/marketplace.js.map ccm-package/public/index.html`

## Risks

- 自动重同步依赖历史 runtime audit 中记录的 `workDir` 仍然存在；如果工作目录已经删除，主商城操作仍成功，但 `runtimeResync.summary.failed` 会记录失败。
- 自动重同步只处理 `runtimeImpact` 命中的 snapshot，不会全量刷新无关运行时。
- 如果没有受影响 runtime snapshot，后端不会返回 `runtimeResync`，UI 只展示授权/运行时影响。
- `git diff --check` 仍会显示仓库既有 CRLF 归一化提示。
