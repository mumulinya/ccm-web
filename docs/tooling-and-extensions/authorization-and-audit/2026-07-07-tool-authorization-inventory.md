# Tool Authorization Inventory

## Why

CCM 已经支持项目与群聊分别授权 MCP/Skill，并会在子 agent 运行时同步阶段写入 readiness 和 dispatch gate。问题是授权配置分散在 project configs 与 groups 中，工具中心只能看到目录、运行时快照和商城影响，不能一眼判断“哪些项目/群聊已经授权、哪些授权会导致子 agent 派发失败”。

本次升级新增全局只读授权清单，把项目与群聊的 MCP/Skill 授权、可用数、缺失项和 dispatch readiness 汇总到统一 API 与工具中心页面。它不扩大权限，只复用现有 `normalizeToolAuthorization`、`buildScopeAudit` 与 `buildAuthorizationReadiness`。

## Changes

- 新增 `buildToolAuthorizationInventory`，统一构建项目/群聊授权清单。
- 新增 `GET /api/tools/authorization-inventory`。
- 授权清单只返回工具授权名、缺失摘要与 readiness，不暴露 MCP command/env、Skill prompt 或项目执行配置。
- `runToolAuthorizationSelfTest` 增加 inventory 覆盖，验证范围统计、缺失汇总和敏感字段不会泄漏。
- 工具中心新增“授权总览”页签，展示项目/群聊数量、已配置范围、MCP/Skill 授权数、缺失项和每个范围的 dispatch 状态。

## Affected Files

- `backend/tools/tool-authorization.ts`
- `backend/modules/tools/tools.ts`
- `frontend/src/api/index.js`
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
- `git diff --check -- backend/tools/tool-authorization.ts backend/modules/tools/tools.ts frontend/src/api/index.js frontend/src/components/tools/ToolsConfig.vue docs/tool-authorization-inventory/2026-07-07-tool-authorization-inventory.md`
- Restarted packaged server on `http://127.0.0.1:3091/`
  - `/api/tools/authorization-inventory` returned `ccm-tool-authorization-inventory-v1`, `totalScopes=9`, `configuredScopes=3`, `needsAttention=1`.
  - `/api/tools/runtime-readiness?deep=0` returned success.
  - `/api/marketplace/list?source=local` returned 4 local marketplace items.

## Risks

- 授权总览反映的是当前项目/群聊配置与当前工具目录状态；历史子 agent 快照是否已经同步仍以“Agent 运行时”页签为准。
- 没有授权任何 MCP/Skill 的项目或群聊会显示为可派发，因为空授权本身不会触发缺失工具阻断。
- 如果外部工具刚安装或卸载，清单会立即反映授权缺失或恢复；已有运行时快照仍可能需要通过重同步刷新。
