# 全局 Agent CC Runtime Parity 40.0

本轮目标：补齐全局 Agent 对照 Claude Code 源码后暴露出的运行时骨架差距，让全局 Agent 不只是能调用管理接口，而是具备更接近 CC 的工具声明、权限、Hook、Todo、后台输出和会话调试能力。

## 实现范围

新增 `backend/global-agent-runtime.ts`，集中承载全局 Agent runtime 协议：

- `buildGlobalAgentToolDefinitions()`：把原 `GLOBAL_AGENT_TOOL_SPECS` 升级为可对外暴露的工具定义，包含 `name / description / inputSchema / risk / renderer / permissionScope`。
- 持久权限规则：`allow / deny`，支持按 tool、risk、target 匹配，写入 `global-agent-runtime/permissions.json`。
- Hook 规则：支持 `pre_tool_use / post_tool_use`，支持 `annotate / block`，写入 `global-agent-runtime/hooks.json`。
- Todo 计划账本：每次模型输出 plan 时同步 `pending / in_progress / blocked / done`。
- 后台输出流：记录 run started、decision、tool started/completed/failed、permission、hook、terminal 等尾部事件。
- 会话调试快照：聚合 run 状态、pending tool、last step、Todo、权限、Hook、输出尾部、reasoning assertions/deviations。

## 后端接入点

`backend/global-agent-loop.ts`：

- 模型工具提示改为使用结构化工具定义和 JSON Schema。
- run 启动时初始化 runtime run state。
- 每次决策后同步 Todo ledger。
- 工具执行前：
  - 评估持久权限规则；
  - 命中 deny 直接阻断；
  - 命中 allow 可跳过对应写操作确认；
  - 执行 `pre_tool_use` Hook，block 时终止本轮。
- 工具执行后：
  - 执行 `post_tool_use` Hook；
  - 记录后台输出；
  - 更新 Todo 状态。
- 确认后续跑路径也接入同样的 Hook、Todo 与输出记录。

`backend/modules/global-agent.ts` 新增 API：

- `GET /api/global-agent/runtime/tools`
- `GET /api/global-agent/runtime/permissions`
- `POST /api/global-agent/runtime/permissions`
- `GET /api/global-agent/runtime/hooks`
- `POST /api/global-agent/runtime/hooks`
- `GET /api/global-agent/runtime/background?id=...`
- `POST /api/global-agent/runtime/background/control`
- `GET /api/global-agent/runtime/session-debug?id=...`
- `GET /api/global-agent/runtime/self-test`

原 `/api/global-agent/agentic/tools` 现在也返回统一工具定义。

## 前端展示

`frontend/src/components/GlobalAgent.vue`：

- 全局 Agent 结果消息会显示“运行时调试”摘要。
- 展示内容包括状态、pending tool、模型/工具/恢复次数、Todo、权限、Hook 和输出尾部。
- 不改变原有 `TaskExperienceCard` 主卡展示，只在卡片下方提供调试状态。

## 设计边界

全局 Agent 仍然是 CCM 系统管理者，不直接吞并群聊主 Agent 或项目子 Agent 的开发职责。

本轮增强的是全局 Agent 的运行时协议能力：

- 系统工具更可声明；
- 写操作更可授权；
- 工具执行更可拦截；
- 长任务更可观察；
- 会话恢复和失败原因更可调试。

项目级 worktree 隔离、子 Agent fork、代码执行工具池仍应保留在群聊/项目 Agent 侧，由全局 Agent 负责调度、监督和恢复。

## 验证

已执行：

```powershell
npm run check
```

建议发布前继续执行：

```powershell
npm run build
node -e "const m=require('./ccm-package/dist/modules/global-agent');"
```

运行服务后可验证：

```powershell
Invoke-RestMethod http://127.0.0.1:3080/api/global-agent/runtime/self-test
Invoke-RestMethod http://127.0.0.1:3080/api/global-agent/runtime/tools
```
