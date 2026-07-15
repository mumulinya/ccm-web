# Runtime Resync Snapshot Filter

## Why

商城安装、更新或卸载 MCP/Skill 后，CCM 已经能计算哪些运行时快照受影响。但重同步入口过去主要按全局 stale、项目或群聊范围处理，商城场景下可能会顺手同步无关快照。

本次升级让 runtime resync 支持 `snapshotId` / `snapshotIds` 精准过滤，并把商城 runtime impact 的重同步按钮改为只传入受影响的 snapshot IDs。这样从商城操作到运行时同步的闭环更小、更可解释，也更接近“安装后进入统一授权与运行时同步链路”的目标。

## Changes

- `resyncRecentRuntimeToolSnapshots` 支持 `snapshotId`、`snapshot_id`、`snapshotIds`、`snapshot_ids` 过滤。
- runtime sync 自测新增 snapshot filter 覆盖：不匹配 snapshot 不会被选中，匹配 snapshot 才会重同步。
- 工具商城的 runtime impact banner 重同步会携带受影响 `snapshotIds`。
- 单个商城条目的 runtime impact inline 区域新增“重同步”按钮。
- 商城 runtime 重同步完成后刷新运行时 readiness、商城操作历史和授权总览。
- 该功能只精准选择已有快照，不扩大 MCP/Skill 授权，也不绕过 dispatch gate。

## Affected Files

- `backend/tools/runtime-tool-sync.ts`
- `frontend/src/components/tools/ToolsConfig.vue`
- `ccm-package/dist/tools/runtime-tool-sync.*`
- `ccm-package/public/index.html`
- `ccm-package/public/assets/*`

## Verification

- `npm run build:backend`
- `npm run build:frontend`
- `npm run test:runtime-tools`
- `npm run check`
- `git diff --check -- backend/tools/runtime-tool-sync.ts frontend/src/components/tools/ToolsConfig.vue docs/runtime-resync-snapshot-filter/2026-07-07-runtime-resync-snapshot-filter.md`
- Restarted packaged server on `http://127.0.0.1:3091/`.
- `POST /api/tools/runtime-resync` with missing `snapshotIds` returned `selected=0`, `resynced=0`, `failed=0`.
- `POST /api/tools/runtime-resync` with real stale snapshot `d044f648a6296f2f` returned `selected=1`; that historical snapshot had unavailable `workDir`, so it safely returned `failed=1`.

## Risks

- 如果 runtime impact 中的 snapshotId 已过期或对应历史快照不存在，后端会选中 0 个或返回 failed，不会自动创建新工作区。
- 商城操作历史顶部的批量“重同步运行时”仍保留全局 stale 行为；具体 item 和最新 impact banner 使用 snapshot 精准过滤。
- snapshot 过滤只限制选择范围；同步时仍会按当前目录与当前授权 readiness 重新生成快照。
