# Marketplace Operation History UI

## Why

CCM 工具商城已经会在 install/update/uninstall 时写入 `operations.jsonl`，并把授权影响写入审计记录。但这些历史记录只能从文件查看，用户在工具商城里无法快速确认最近安装、更新、卸载了什么，以及这些操作影响了哪些项目或群聊授权。

本次升级把商城操作审计暴露为只读 API，并在工具商城页面展示最近操作记录，让 MCP/Skill 的安装与授权影响形成可见、可追踪的闭环。

## Changes

- 新增 `GET /api/marketplace/operations?limit=20`。
- 新增 `readMarketplaceOperationAudit`，读取最近操作并按最新在前返回。
- 返回前重新脱敏 `ccm-marketplace-operation-v1`，只保留操作动作、工具名、来源元信息、版本/checksum、reload 状态和 `authorizationImpact`。
- marketplace E2E 自测新增操作历史读取断言，验证：
  - 最近记录可读。
  - 授权影响 schema 被保留。
  - 不返回安装 env/prompt 等敏感材料。
- 前端新增 `toolsApi.marketplace.operations`。
- 工具商城新增“最近商城操作”紧凑列表，展示最近 5 条操作、版本变化、来源和授权影响摘要。

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
- Restarted packaged server on `http://127.0.0.1:3091/`
  - `/api/marketplace/list?source=local` returned 4 local items.
  - `/api/marketplace/operations?limit=5` returned `ccm-marketplace-operations-v1`.
  - `POST /api/marketplace/authorization-impact` returned `ccm-marketplace-authorization-impact-v1`.

## Risks

- 操作历史 API 是只读审计视图，不负责修复或回滚授权配置。
- UI 默认只展示最近 5 条，完整 API 默认读取 20 条、最多 200 条。
- 历史记录来自本地 JSONL 文件；如果文件被外部删除，API 会返回空列表而不是报错。
