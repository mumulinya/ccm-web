# MCP / Skill Runtime Parity 45.0

## 目标

本轮补齐两块运行时能力：

- MCP OAuth/token refresh/elicitation 诊断：识别 MCP 配置中的鉴权字段、token 过期时间、refresh 配置，并在启动失败或调用失败时把 401/403、invalid token、interactive consent 等错误归类为 `auth_required`。
- Skill 一等 Tool 化：Skill 不再只是 prompt 文本增强，CCM 提供 `invoke_skill` / `skill:<name>` 调用入口，支持 discover、invoke、权限校验、调用审计和失败诊断。

## 实现内容

- `backend/mcp-client.ts`
  - 保留 MCP 连接/调用的 `lastError`、stderr 摘要与 elicitation 状态。
  - 对服务端主动发起的 elicitation/consent/auth 请求做受控拒绝，避免无界交互输入绕过 CCM。

- `backend/tool-manager.ts`
  - 新增 `auth_required` MCP 状态。
  - 识别 `auth`、`oauth`、`Authorization`、`token`、`api key`、`client id/secret`、`refresh token`、`expires_at/expiresAt` 等配置线索。
  - 连接前发现缺凭据或 token 过期时直接阻塞连接，并给出可见诊断。
  - 连接失败或工具调用失败时，将 401/403/unauthorized/invalid token/consent 等归类为鉴权阻塞。
  - `/api/tools/status` 返回每个 MCP server 的 auth 状态。
  - 新增 `discoverSkills()`、`invokeSkill()` 与 `invoke_skill` 工具调用路由。
  - Skill 调用写入 `~/.cc-connect/agent-runner/skill-invocations.jsonl`，未授权调用仍写审计。

- `backend/modules/tools.ts`
  - 新增 `GET /api/tools/skills/discover`。
  - 新增 `POST /api/tools/skills/invoke`。

- `frontend/src/components/ToolsConfig.vue`
  - MCP 卡片展示 `auth`、`refresh`、`expires`、`elicitation` 与错误摘要。
  - Skill 卡片展示 `SkillTool`、`invoke_skill`、`skill:<name>`、content hash 与审计文件。

## Agent 使用协议

授权 Skill 会在工具 prompt 中显示：

```json
{
  "name": "invoke_skill",
  "arguments": {
    "name": "release-notes",
    "input": "本次要交给该 Skill 的任务或上下文"
  }
}
```

也支持 `skill:<name>` / `Skill:<name>` / `skill__<name>` 作为兼容入口。所有入口都会走同一套授权校验。

## 边界

- 本轮没有实现完整 OAuth 浏览器 consent 流或 provider-specific token refresh 执行动作；当前能力是配置识别、过期/刷新诊断、受控 elicitation 阻断和可视化。
- SkillTool 返回的是结构化 prompt/instruction，由当前 Agent 继续执行；它不是独立沙箱进程。

## 验证

- `npm run check`
- `npm run build:backend`
- `node -e "const m=require('./ccm-package/dist/tool-manager.js'); const r=m.runToolManagerRuntimeSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)"`
- `node -e "const m=require('./ccm-package/dist/runtime-tool-sync.js'); const r=m.runRuntimeToolSyncSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)"`

