# Tool Invocation Audit

## Why

CCM 已经能统一管理 MCP 和 Skill，并能按项目 / 群聊生成授权与运行时快照。但仅有授权清单还不能证明子 Agent 实际调用了哪些工具，也不能快速看出是否发生了越权尝试。

本次升级补齐统一调用审计入口，用于观察 Claude Code、Cursor、Codex 等项目子 Agent 的 MCP / Skill 调用结果、失败记录和被拒绝的越权尝试。

## Changes

- 新增 `GET /api/tools/invocation-audit`，聚合最近的工具调用循环、Skill 调用和权限违规 JSONL 审计。
- 审计响应使用 `ccm-tool-invocation-audit-v1` schema，返回 summary、items 和审计文件来源。
- 后端审计输出只保留脱敏元信息，包括 runtime、项目、任务、工具名、Skill 名、状态、耗时、hash、输入大小和授权范围计数。
- 工具中心新增「调用审计」视图，显示最近事件、MCP/工具调用、Skill 调用、工具失败、越权拒绝和循环结束统计。
- 调用审计列表展示每条事件的状态、时间和上下文元信息，便于和授权总览、运行时就绪状态一起排查。

## Affected Files

- `backend/modules/tools/tools.ts`
- `frontend/src/api/index.js`
- `frontend/src/components/tools/ToolsConfig.vue`
- `docs/tool-invocation-audit/2026-07-07-tool-invocation-audit.md`

## Verification

- `npm run build:backend`
- `npm run build:frontend`
- `npm run test:runtime-tools`
- `npm run check`
- `git diff --check -- backend/modules/tools/tools.ts frontend/src/api/index.js frontend/src/components/tools/ToolsConfig.vue`
- 临时启动 `ccm-package/dist/server.js 3092` 并请求 `GET /api/tools/invocation-audit?limit=20`，返回：
  - `schema: ccm-tool-invocation-audit-v1`
  - `success: true`
  - `limit: 20`
  - `totalReturned: 20`
  - `toolCalls: 4`
  - `skillInvocations: 3`
  - `unauthorized: 9`

## Risks

- 当前审计依赖已有 JSONL 文件，历史记录为空时 UI 会显示空状态。
- 审计读取限制在最近文件尾部和最多 200 条 API 返回，适合排查近期行为，不替代长期合规归档。
- 旧格式审计行可能缺少部分字段，前端会按可用字段展示。
- `git diff --check` 仍会显示仓库既有 CRLF 归一化提示。
