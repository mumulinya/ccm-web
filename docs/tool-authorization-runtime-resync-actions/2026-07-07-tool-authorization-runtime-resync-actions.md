# Tool Authorization Runtime Resync Actions

## Why

授权总览已经能显示项目/群聊的 MCP/Skill readiness，也能合并最近子 agent 运行时快照，指出 stale、blocked 和 needs resync。缺口是用户看到问题后还要切到其他区域才能处理。

本次升级把运行时重同步动作直接放到授权总览里，让 CCM 从“诊断视图”继续推进到“处理入口”：全局重同步所有待处理快照，或只重同步某个项目/群聊范围。

## Changes

- 授权总览顶部在存在待处理 runtime 快照时显示“重同步待处理快照”。
- 每个项目/群聊 scope 在存在 stale、blocked 或 delivery 异常快照时显示“重同步此范围”。
- 全局动作调用 `POST /api/tools/runtime-resync`，参数为 `{ staleOnly: true, limit: 50 }`。
- 项目动作调用同一 API，并附加 `projectName`。
- 群聊动作调用同一 API，并附加 `groupId`。
- 重同步完成后刷新授权总览、运行时 readiness 和商城操作历史。
- 该动作只重建已有快照对应的运行时工具配置，不扩大 MCP/Skill 授权。

## Affected Files

- `frontend/src/components/tools/ToolsConfig.vue`
- `ccm-package/public/index.html`
- `ccm-package/public/assets/*`

## Verification

- `npm run build:frontend`
- `npm run check`
- Restarted packaged server on `http://127.0.0.1:3091/`.
- `POST /api/tools/runtime-resync` with `{ staleOnly:true, projectName:"cc-connect-test", limit:1 }` returned `ccm-runtime-tool-resync-v1`, `selected=1`, `resynced=1`, `failed=0`.
- `/api/tools/authorization-inventory?runtime=0` returned success with runtime probing disabled.

## Risks

- 如果历史快照中的 `workDir` 已不存在，后端会返回 failed；UI 会显示完成结果但不会创建新的工作区。
- 单项目重同步会匹配该项目在项目会话和群聊会话里的快照；单群聊重同步只按 `groupId` 过滤。
- dispatch gate 仍由后端复验，缺失工具或授权不就绪不会因为点击重同步而放行。
