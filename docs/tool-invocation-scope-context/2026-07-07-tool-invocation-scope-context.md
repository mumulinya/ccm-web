# Tool Invocation Scope Context

## Why

CCM 已经能把群聊 / 项目授权的 MCP 和 Skill 交付给 Claude Code、Cursor、Codex 等子 Agent，也能记录工具调用审计。但此前调用审计对“这次调用属于哪个群聊、哪个项目、哪个任务”的证据不够完整，尤其是 Skill 调用和越权审计主要只带授权 scope 计数。

本次升级把 runtime、project、groupId、taskId、executionId 和调用来源贯穿到工具循环、Skill 调用和权限拒绝审计中，并支持按这些字段过滤调用审计。

## Changes

- `ToolScope` 增加 `auditContext`，仅用于审计，不参与授权扩大。
- `runToolCallLoop` 增加 `groupId`、`executionId`、`source`，并把上下文写入 `tool-call-loop.jsonl`。
- `server.ts` 在项目 / 群聊工具循环中传递 groupId、taskId、executionId。
- `ToolManager.invokeSkill` 和 MCP 越权拒绝记录写入 runtime、project、groupId、taskId、executionId、source。
- `GET /api/tools/invocation-audit` 返回 `groupId`、`executionId`、`invocationSource`，并支持按 runtime、project、groupId、taskId、category、source 过滤。
- 前端 `toolsApi.invocationAudit` 支持对象参数，调用审计 UI 展示群聊、执行 ID 和调用来源。
- `runToolManagerRuntimeSelfTest` 增加 `skillInvocationAuditCarriesContext`，防止 Skill 调用上下文回退。

## Affected Files

- `backend/tools/tool-manager.ts`
- `backend/tools/tool-call-loop.ts`
- `backend/server.ts`
- `backend/modules/tools/tools.ts`
- `frontend/src/api/index.js`
- `frontend/src/components/tools/ToolsConfig.vue`
- `ccm-package/dist/**`
- `ccm-package/public/**`
- `docs/tool-invocation-scope-context/2026-07-07-tool-invocation-scope-context.md`

## Verification

- `npm run build:backend`
- `npm run test:runtime-tools`
- `npm run build:frontend`
- `npm run check`
- 临时启动 `ccm-package/dist/server.js 3094` 并请求 `GET /api/tools/invocation-audit?limit=20&groupId=context-group&category=skill`，返回：
  - `schema: ccm-tool-invocation-audit-v1`
  - `success: true`
  - `totalReturned: 1`
  - `skillInvocations: 1`
  - `groupId: context-group`
  - `project: context-project`
  - `invocationSource: selftest`
- `git diff --check -- backend/tools/tool-manager.ts backend/tools/tool-call-loop.ts backend/server.ts backend/modules/tools/tools.ts frontend/src/api/index.js frontend/src/components/tools/ToolsConfig.vue`

## Risks

- 历史审计行不会 retroactively 获得 groupId/taskId；过滤时只会命中新格式或原本已有上下文的记录。
- `auditContext` 随 scope 写入审计文件，但 API 仍只暴露脱敏后的上下文字段和授权数量，不暴露工具参数、Skill 输入或环境变量。
- 没有 `allowedTools` scope 的旧调用路径仍保持原有不限制语义；这些路径可能只有 tool-loop 层审计上下文，没有 ToolManager scope 上下文。
- `git diff --check` 仍会显示仓库既有 CRLF 归一化提示。
