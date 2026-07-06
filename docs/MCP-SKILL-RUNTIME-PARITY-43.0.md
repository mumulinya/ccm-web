# MCP/Skill Runtime Parity 43.0

目标：对照 Claude Code 的 MCP/Skill 运行时能力，补强 CCM 全局/群聊协作中的工具授权、状态可视化、Skill 调用保留和子 Agent 续跑复用。

## Claude Code 对照

- Claude Code 会把 MCP 工具纳入统一工具池，并按 deny/allow 规则过滤；规则支持 `mcp__server`、`mcp__server__*`、`mcp__server__tool` 这种粒度。
- Claude Code 有独立 MCP client/config/auth/status 链路，会跟踪 pending/failed client，并支持重试、reload、toggle。
- Claude Code Skill 是一等工具，支持 discovery/invocation；被调用的 Skill 会进入 `invokedSkills`，并在 compact 时保留。
- Claude Code 对 skill 文件系统权限有窄范围规则，例如只允许访问 `.claude/skills/<name>/**`。

## CCM 已补强

- Runtime 工具快照：`syncRuntimeTools()` 为 Claude Code/Codex/Cursor/Gemini/Qoder 生成隔离配置和 `runtime-tool-snapshot.json`，记录 `snapshotId`、MCP config、Skill root、授权规则、状态和缺失项。
- 细粒度 MCP 授权：支持 `server/tool`、`server:tool`、`mcp__server__tool`，并在平台代理 `ToolManager` 执行前二次校验。
- MCP/Skill 状态诊断：同步审计里包含 `mcp_statuses`、`skill_statuses`、`permission_rules`、missing/errors/warnings，并写入 `agent-runner/runtime-tool-sync.jsonl`。
- MCP 代理状态机与重连：`ToolManager` 记录每个 MCP server 的 pending/connected/failed/disconnected 状态；工具调用发现 server 断连时会按原配置自动重连一次并更新状态。
- Skill 调用保留：Agent 输出或 `CCM_AGENT_RECEIPT.memoryUsed` 中声明 `Skill:<name>` 后，会被检测为 `invokedSkills`，写入 receipt、execution event 和 runtime tooling summary。
- 子 Agent 续跑复用：任务级 session 新增 runtime snapshot 字段，记录 `runtimeSnapshotId`、`runtimeSnapshotPath`、`mcpConfigPath`、`allowedTools` 和 permission rules；Agent QA continuation 也保存 runtime snapshot。
- Trace/任务卡可视化：`prepareAgentRuntimeTools()` 会写入 `agent_runtime.lifecycle` 的 `runtime_tool_sync` 事件；`runtime_kernel.runtime_tooling` 展示快照、MCP/Skill gate、缺失项和 invoked skills。
- 任务卡展示：`TaskExperienceCard` 的 Runtime Kernel 区块新增 MCP/Skill Gate、snapshot 标签、Skill 标签和缺失/错误提示。

## 仍保留的边界

- MCP OAuth、elicitation、动态 server 热重载仍未做到 Claude Code 同级，只记录配置缺失/同步失败并保留平台代理兜底。
- Skill 目前以 CCM managed `SKILL.md` 和 prompt/状态保留为主，不等价于 Claude Code 内部 SkillTool 的完整 remote skill 生命周期。
- MCP 工具级授权在原生 CLI 中受各运行时支持度影响；CCM 始终用平台代理校验做第二道边界。

## 验证记录

- `npm run check`
- `npm run build:backend`
- `node -e "const m=require('./ccm-package/dist/runtime-tool-sync.js'); const r=m.runRuntimeToolSyncSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)"`
- `node -e "const m=require('./ccm-package/dist/task-agent-sessions.js'); const r=m.runTaskAgentSessionSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)"`
- `node ccm-package/scripts/coordinator-smoke.js`
- `npm run build`
