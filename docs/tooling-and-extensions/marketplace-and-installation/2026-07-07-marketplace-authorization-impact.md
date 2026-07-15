# Marketplace Authorization Impact

## Why

CCM 已经可以统一安装、授权并同步 MCP/Skill 给项目子 agent，但商城安装、更新、卸载操作原本只记录工具本身的变更。这样在卸载或更新一个已被项目/群聊授权的工具时，用户很难从商城操作结果里直接看出哪些项目或群聊会受到影响。

本次升级补齐商城操作到授权作用域之间的可见性闭环：商城 install/update/uninstall 会扫描当前项目与群聊工具授权，返回并审计受影响的授权范围。

## Changes

- 新增 `ccm-marketplace-authorization-impact-v1` 影响报告。
- 商城 `install`、`update`、`uninstall` 响应新增 `authorizationImpact`。
- 商城操作审计 `ccm-marketplace-operation-v1` 新增 `authorizationImpact` 字段。
- 影响扫描覆盖项目配置和群聊配置中的 `tools.mcp`、`tools.skill`。
- MCP grant 匹配复用授权模块解析逻辑，支持：
  - `server`
  - `server/tool`
  - `server:tool`
  - `mcp__server__tool`
  - `mcp__ccm__server__tool`
- 影响报告只包含 scope、ID/名称、命中的 grant 和计数，不写入 command、env、headers、prompt 等安装敏感材料。
- 自测 fixture 增加项目和群聊授权，覆盖 update/uninstall 的影响报告与审计写入。

## Affected Files

- `backend/tools/tool-authorization.ts`
  - 导出 `parseMcpGrant`，让 marketplace 的影响扫描与授权 readiness 使用同一套 MCP grant 解析规则。
- `backend/modules/tools/marketplace.ts`
  - 增加项目/群聊授权影响扫描。
  - 在商城操作响应和操作审计中写入 `authorizationImpact`。
  - 增加 marketplace E2E 自测断言。

## Verification

- `npm run build:backend`
- `npm run test:runtime-tools`
- `npm run check`
- `git diff --check -- <touched files>`
- Temp server smoke on `http://127.0.0.1:3091/`
  - `/api/marketplace/list?source=local` returned 4 local items.
  - `/api/tools/runtime-readiness?deep=0` returned a valid readiness summary.

## Risks

- 影响报告目前是只读扫描，不自动移除项目/群聊里的授权；卸载后这些授权会继续由现有 readiness/dispatch gate 标记为不可用。
- 影响扫描最多返回 200 个 scope，超过后会设置 `truncated: true`，避免审计文件膨胀。
- 前端暂未新增专门 UI 展示该影响报告，当前能力先通过 API 响应和审计文件暴露。
