# MCP/Skill Runtime Parity 44.0

目标：在 43.0 的 runtime snapshot 基础上，继续补齐二阶段能力，让 MCP/Skill 的可用性、变更、越权和压缩保留更接近 Claude Code 的运行时行为。

## 本轮增强

- MCP 真实工具探测：`ToolManager.buildScopeAudit()` 会基于已连接 server 的真实 tool list 判断授权 grant 是否可用；`server/tool` 授权但 server 未注册该 tool 时标记为 `missing_tool`。
- runtime missing_tool 诊断：`prepareAgentRuntimeTools()` 合并 ToolManager 审计，把 `missing_tool`、server failed/disconnected 写入 runtime audit、trace lifecycle 和任务卡 `runtime_kernel.runtime_tooling`。
- MCP 越权审计：平台代理执行 MCP tool 前继续强校验 scope；未授权调用会写入 `agent-runner/tool-permission-violations.jsonl`。
- MCP 状态可视化：工具配置页展示 server `state`、注册工具数、retry count、last connected/error 和错误信息，便于定位“配置存在但工具没注册”的问题。
- Skill 热更新/快照失效：runtime snapshot id 现在纳入 Skill description、prompt、filename、source mtime；Skill JSON 文件变更后下一次同步会生成新 snapshot。
- Skill 调用记忆保留：项目记忆结论记录 `invokedSkills`，执行简报会回灌最近 Skill 使用；群聊压缩摘要会保留 “Agent 使用 Skill:name#hash” 事实。
- 自测覆盖：新增 ToolManager runtime 自测；项目记忆自测增加 invoked Skill 保留断言；coordinator smoke 纳入 ToolManager runtime 自测。

## 仍保留的边界

- MCP OAuth/token refresh/elicitation 仍未完整实现；当前只做连接状态、重连和错误记录。
- 原生 CLI 的实际 tool list 仍依赖各 CLI 自己的 MCP 加载行为；CCM 能证明的是平台代理真实连接到的工具列表。
- Skill 仍是 CCM managed `SKILL.md` + 使用追踪，不是完整 Claude Code remote SkillTool 生命周期。

## 验证记录

- `npm run check`
- `npm run build:backend`
- `node -e "const m=require('./ccm-package/dist/tool-manager.js'); const r=m.runToolManagerRuntimeSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)"`
- `node -e "const m=require('./ccm-package/dist/project-memory.js'); const r=m.runProjectMemorySelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)"`
- `node -e "const m=require('./ccm-package/dist/runtime-tool-sync.js'); const r=m.runRuntimeToolSyncSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)"`
