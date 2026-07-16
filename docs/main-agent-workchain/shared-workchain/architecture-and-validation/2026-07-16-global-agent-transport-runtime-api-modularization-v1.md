# Global Agent Transport Runtime API Modularization V1

## Scope

本轮继续拆分全局 Agent 后端执行入口，并为前一轮新模块补独立测试。知识库模块保持原结构，现有 HTTP API、`global-agent.ts` 公开导出和用户可见行为不变。

## Extracted Responsibilities

| Module | Responsibility |
| --- | --- |
| `global-agent-feishu-actions.ts` | 飞书触发的音乐、宠物、定时任务、管理操作和群聊/项目开发派发 |
| `global-agent-feishu-channel.ts` | 飞书事件解密与校验、消息生命周期、当前回合引导/排队/停止和重启恢复 |
| `global-agent-agentic-runtime.ts` | 全局上下文边界、工具执行、Mission 监督适配、Agentic loop 启动/续跑和服务恢复 |
| `global-agent-api.ts` | 43 个全局 Agent、飞书控制、监督、runtime、质量、run 和 git-review HTTP 路由 |

原 `backend/modules/global/global-agent.ts` 从 5,427 行降到约 3,355 行。它继续作为稳定 composition root，负责注入依赖并保留所有原导出。

## Independent Tests

新增 `scripts/global-agent-extracted-modules-selftest.mjs`，覆盖：

- 历史消息自测、持久化和损坏主文件的备份恢复。
- Mission 终态通知、轮询定时器释放和状态标签。
- 实时回合消息去重、steer 去重和 run 包络同步。
- 飞书音乐动作派发与控制命令解析。
- Agentic runtime 授权判断、全局上下文边界和记忆投影。
- API 模块直接处理历史 GET 路由，不经过原入口 facade。

Mission 跟踪新增可注入的 `fetch`、`setInterval` 和 `clearInterval`，并返回首次刷新 Promise。生产页面仍使用浏览器默认实现，现有调用方不需要修改。

## Compatibility

- `handleGlobalAgentApi` 仍从 `global-agent.ts` 导出。
- 飞书控制命令解析和恢复启动/停止函数仍从原入口导出。
- `buildAgenticContext`、上下文校验和服务 supervision 启动/停止函数仍从原入口导出。
- 新模块不反向导入 `global-agent.ts`；所有入口依赖显式注入，避免 CommonJS 初始化循环。
- 群聊主 Agent 继续拥有项目子 Agent 和 TestAgent 调度责任，全局 Agent 只接收进度与最终结果。

## Verification

- `npx tsc -p backend/tsconfig.json --noEmit`：通过。
- 独立模块自测：全部通过。
- 原入口：历史 7 项、飞书路由 4 项、飞书回合 4 项、模型重试 2 项通过。
- 原入口意图：26 个场景通过；状态 18 项、直接派发 14 项、TestAgent 转发 16 项无失败。
- 全局上下文边界专项：13 项通过。
- 飞书控制机器人可靠性：7 项通过。
- 临时生产服务 E2E：10 项通过，普通全局/群聊对话不显示 Todo，技术协议不进入主文本。
- `npm run build`：通过，前端、飞书 MCP 与后端发布产物完整生成。
- `npm run test:render-regression`：明确返回 `pass: true`、`exit=0`，共 38 张真实截图。
- 最新构建隔离生产服务：`#app`、全局面板和聊天容器均唯一挂载，正文正常、无横向溢出、技术详情默认折叠、控制台错误为 0。
- 最新后端真实 HTTP：历史、runtime tools、runs 和 control-center 四个只读 API 均返回 200。

## Maintenance Rules

- 飞书协议与回合恢复进入 `global-agent-feishu-channel.ts`。
- 飞书业务动作进入 `global-agent-feishu-actions.ts`。
- 全局上下文、工具执行和 Mission supervision 进入 `global-agent-agentic-runtime.ts`。
- 新 HTTP 路由进入 `global-agent-api.ts`，业务实现不得重新堆入路由函数。
- `global-agent.ts` 保持 composition root，不再因为行数继续机械拆分。
