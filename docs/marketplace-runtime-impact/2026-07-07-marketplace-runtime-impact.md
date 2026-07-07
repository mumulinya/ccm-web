# Marketplace Runtime Impact

## Why

CCM 商城操作已经能报告授权影响和操作历史，但工具安装、更新、卸载还会影响已经生成过的 Claude Code、Cursor、Codex 等子 agent 运行时快照。此前用户只能通过 runtime readiness 页面间接看到 catalog revision stale，商城操作结果本身没有明确提示哪些运行时快照需要重同步。

本次升级把运行时影响纳入商城操作结果和审计：当 MCP/Skill 更新或卸载后，CCM 会扫描最近 runtime tool audit，找出请求过该工具的快照，并报告 catalog stale、dispatch blocked、delivery blocked 等状态。

## Changes

- `probeRuntimeToolReadiness` 新增 `record: false` 选项，允许 marketplace 复用 readiness 计算但不写入新的 readiness JSONL。
- 新增 `ccm-marketplace-runtime-impact-v1`。
- marketplace install/update/uninstall 响应新增 `runtimeImpact`。
- marketplace operation audit 与 operation history API 保留脱敏后的 `runtimeImpact`。
- operation history summary 新增：
  - `impactedRuntimeSnapshots`
  - `staleRuntimeSnapshots`
- marketplace E2E 自测增加：
  - update 后旧 runtime 快照 catalog stale。
  - uninstall 后当前 runtime 快照 catalog stale。
  - operation audit/history 保留 runtime impact 且不泄漏 secret。
- 工具商城 UI 新增运行时同步提示，成功操作 toast、最近影响 banner、操作历史中都会显示受影响运行时快照摘要。

## Affected Files

- `backend/tools/runtime-tool-sync.ts`
- `backend/modules/tools/marketplace.ts`
- `frontend/src/components/tools/ToolsConfig.vue`
- `ccm-package/dist/tools/runtime-tool-sync.*`
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
  - `/api/tools/runtime-readiness?deep=0` returned a valid readiness summary.

## Risks

- `runtimeImpact` 是提示和审计，不会主动重写历史 runtime 快照；下一次子 agent 派发时仍由 runtime sync 重新生成快照。
- 只扫描最近 runtime tool audit，历史很久的快照可能不会显示在商城操作结果里。
- `record: false` 保持 marketplace 查询不污染 readiness 历史；现有 runtime readiness API 默认仍会记录探测结果。
