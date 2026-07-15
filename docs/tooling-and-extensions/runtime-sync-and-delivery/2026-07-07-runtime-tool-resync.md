# Runtime Tool Resync

## Why

商城更新或卸载 MCP/Skill 后，已有 Claude Code、Cursor、Codex 等子 agent 运行时快照会通过 catalog revision 被标记为 stale。上一轮已经把 stale 影响展示出来，但用户还缺少一个主动动作来让最近运行时快照按当前 MCP/Skill 目录重新生成。

本次升级新增最近 runtime snapshot 的重同步能力。它只复用历史 audit 中已有的 runtime、workDir 和 requested scope，不扩大授权；同步时会重新计算当前授权 readiness，缺失的 MCP/Skill 仍会进入 missing 和 dispatch gate。

## Changes

- 新增 `resyncRecentRuntimeToolSnapshots`。
- 新增 `POST /api/tools/runtime-resync`。
- `probeRuntimeToolReadiness` 保持 `record: false` 能力，resync 前后检查不会污染 readiness 历史。
- resync 默认只处理 catalog stale 的最近快照，最多 50 条。
- resync 成功后会调用 `recordRuntimeToolSyncAudit` 写入新的 runtime sync audit。
- runtime sync 自测新增 stale snapshot resync 覆盖，验证旧快照 stale、新快照 fresh 且 snapshotId 更新。
- 工具商城 UI 在运行时影响 banner 和最近商城操作面板中新增“重同步”入口。

## Affected Files

- `backend/tools/runtime-tool-sync.ts`
- `backend/modules/tools/tools.ts`
- `frontend/src/api/index.js`
- `frontend/src/components/tools/ToolsConfig.vue`
- `ccm-package/dist/tools/runtime-tool-sync.*`
- `ccm-package/dist/modules/tools/tools.*`
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
  - `POST /api/tools/runtime-resync` returned `ccm-runtime-tool-resync-v1`.
  - Local smoke found one stale historical audit with unavailable `workDir`, so it safely returned `failed=1` instead of creating a new runtime snapshot.

## Risks

- 重同步只处理最近 runtime sync audit 可见的快照；很旧且不在 audit 视图中的快照不会被主动刷新。
- 如果历史 workDir 已不存在，结果会标记 failed，不会创建新的工作区。
- 若工具已卸载，重同步会生成带 missing/dispatch gate 的新快照，不会绕过授权放行。
