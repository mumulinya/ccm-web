# Tool Authorization Runtime Coverage

## Why

上一轮授权总览能证明项目/群聊配置的 MCP/Skill 是否仍存在于当前工具目录，但它还不能直接证明子 agent 最近是否已经拿到了这些授权。用户需要从 CCM 看到完整链路：配置授权、目录 readiness、运行时快照、dispatch gate 和 catalog stale 状态。

本次升级把最近 runtime readiness 合并进授权总览。项目/群聊清单现在不仅显示授权是否可派发，还能显示最近 Claude Code、Cursor、Codex 等运行时快照是否可用、是否 stale、是否被 dispatch gate 阻断。

## Changes

- `buildToolAuthorizationInventory` 支持接收 runtime readiness，并生成 `ccm-tool-authorization-runtime-coverage-v1`。
- `GET /api/tools/authorization-inventory` 默认读取最近 runtime sync audit，使用 `probeRuntimeToolReadiness(..., { record:false })` 做轻量探针，避免打开页面污染 readiness 历史。
- inventory summary 新增 runtime 聚合字段：`runtimeSnapshots`、`runtimeOverallReady`、`runtimeDeliveryReady`、`runtimeCliReady`、`runtimeCatalogStale`、`runtimeDispatchBlocked`、`runtimeNeedsResync`。
- 每个项目/群聊 scope 新增 `runtime.summary` 与最近 runtime snapshot 列表。
- runtime coverage 输出只保留 runtime、snapshotId、project/group、ready/stale/blocked 和授权计数，不暴露 `snapshotPath`、`mcpConfigPath`、CLI command、env 或 prompt。
- 工具中心“授权总览”页签新增运行时快照统计、覆盖率、stale/blocked 数和每个 scope 的最近 runtime 状态。
- `runToolAuthorizationSelfTest` 增加 runtime coverage 自测，验证 runtime 汇总、project/group 挂载和路径不泄漏。

## Affected Files

- `backend/tools/tool-authorization.ts`
- `backend/modules/tools/tools.ts`
- `frontend/src/components/tools/ToolsConfig.vue`
- `ccm-package/dist/tools/tool-authorization.*`
- `ccm-package/dist/modules/tools/tools.*`
- `ccm-package/public/index.html`
- `ccm-package/public/assets/*`

## Verification

- `npm run build:backend`
- `npm run test:runtime-tools`
- `npm run build:frontend`
- `npm run check`
- `git diff --check -- backend/tools/tool-authorization.ts backend/modules/tools/tools.ts frontend/src/components/tools/ToolsConfig.vue docs/tool-authorization-runtime-coverage/2026-07-07-tool-authorization-runtime-coverage.md`
- Restarted packaged server on `http://127.0.0.1:3091/`
  - `/api/tools/authorization-inventory` returned `runtimeSnapshots=12`, `runtimeCatalogStale=12`, `runtimeDispatchBlocked=4`, `scopesWithRuntime=8`.
  - `/api/tools/authorization-inventory?runtime=0` returned `runtimeSnapshots=0`, proving runtime probe can be disabled.

## Risks

- runtime coverage 基于最近 runtime sync audit 和本地 snapshot 文件；如果某个子 agent 从未触发运行时同步，该 scope 会显示暂无运行时快照。
- 项目行会统计该项目在独立项目会话和群聊会话中的最近快照；群聊行只按 `groupId` 匹配群聊快照。
- 该视图是只读诊断，不会自动扩大授权，也不会绕过 runtime dispatch gate。
