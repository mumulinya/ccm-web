# Marketplace Authorization Impact Preflight UI

## Why

上一轮商城操作已经会在 install/update/uninstall 后返回并审计 `authorizationImpact`，但用户在前端执行更新或卸载前仍然看不到具体会影响哪些项目或群聊。对于 CCM 统一管理 MCP/Skill 并下发给项目子 agent 的链路，这会让高风险操作仍然依赖泛化提示。

本次升级把授权影响报告前移到操作前预检，并在工具商城 UI 中展示，让用户在更新/卸载前知道当前工具被哪些项目/群聊授权使用。

## Changes

- 新增 `POST /api/marketplace/authorization-impact`。
- 新增 `previewMarketplaceAuthorizationImpact`，复用实际商城操作使用的 `buildMarketplaceAuthorizationImpact`。
- `runMarketplaceSelfTest` 的 install E2E fixture 增加预检断言，覆盖 update/uninstall 预检影响计数。
- 前端 API 新增 `toolsApi.marketplace.authorizationImpact`。
- 工具商城更新前会预检授权影响；若影响范围不为空，会弹出二次确认。
- 工具商城卸载前会预检授权影响，并在确认文案中包含影响数量。
- 工具卡片展示当前预检命中的项目/群聊；商城列表上方展示最近一次操作影响摘要。

## Affected Files

- `backend/modules/tools/marketplace.ts`
- `frontend/src/api/index.js`
- `frontend/src/components/tools/ToolsConfig.vue`
- `ccm-package/dist/modules/tools/marketplace.*`
- `ccm-package/public/index.html`
- `ccm-package/public/assets/*`

## Verification

- `npm run build:backend`
- `npm run build:frontend`
- `npm run test:runtime-tools`
- `npm run check`
- `git diff --check -- <touched files>`
- Temp server smoke on `http://127.0.0.1:3091/`
  - `/api/marketplace/list?source=local` returned 4 local items.
  - `POST /api/marketplace/authorization-impact` returned `ccm-marketplace-authorization-impact-v1`.
  - `/api/tools/runtime-readiness?deep=0` returned a valid readiness summary.

## Risks

- 预检是只读扫描，不会自动移除项目/群聊授权；卸载后仍由 readiness 和 dispatch gate 报告缺失工具。
- 前端确认弹窗目前只展示影响数量，详细 scope 在商城卡片和最近影响摘要中展示。
- 外部自定义来源的“保存来源并更新”会在保存来源前预检当前工具名和类型；最终安装材料仍由后端从保存后的来源重新读取并校验。
