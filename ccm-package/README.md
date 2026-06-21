# cc-web

cc-connect 的 Web 管理界面，支持多 Agent 协作、任务派发、代码变更查看等。

[cc-connect](https://github.com/chenhg5/cc-connect) | [Node.js](https://nodejs.org)

## 功能特点

- 📂 **项目管理** - 创建、编辑、删除项目，一键启停 Agent
- 💬 **群聊协作** - 多 Agent 协作，支持 @mention 互相调用
- 📋 **任务派发** - 优先级队列，自动执行，跨 Agent 协作
- 🧠 **主 Agent 编排** - 像 Claude Code Coordinator 一样先理解业务/接口文档、生成计划，再拆成自包含工作单给子项目 Agent，等待回执后复盘验收
- 🌿 **子 Agent 隔离** - 可选 Git worktree 隔离，避免并行子 Agent 互相覆盖文件
- 🔧 **工具配置** - MCP 服务器、Skills 管理
- 📝 **代码变更** - Git diff 可视化，一键回滚/提交
- 📚 **对话模板** - 预设常用开发场景，快速启动
- 📊 **协作仪表盘** - 任务统计、进度跟踪
- 🔔 **飞书通知** - 任务完成自动通知

## 安装

```bash
npm install -g @mumulinya167/cc-web
```

## 使用

```bash
# 启动 Web 控制台
cc-web

# 访问 http://localhost:3080
```

## 首次使用

1. 启动 `cc-web`
2. 访问 http://localhost:3080
3. 点击"+ 新建项目"创建第一个项目
4. 配置飞书通知（可选）

## 日常开发自动化工作流

1. 在“群聊协作”中创建一个开发群，把前端、后端、服务端等项目 Agent 加入群聊。
2. 建议在“设置 -> 统一大模型配置”中配置主 Agent 的 OpenAI/Anthropic 兼容 API；未配置或调用失败时，系统默认使用规则主 Agent 继续计划和派单。
3. 把业务描述、接口文档、PRD 或验收标准作为共享文件加入群聊，或直接写进任务描述。
4. 在“任务派发”里新建任务，分配给群聊并启用“创建后立即加入执行队列”。
5. 主 Agent 会先形成协调计划，再按项目职责分派给子 Agent；子 Agent 回复必须带 `CCM_AGENT_RECEIPT` 回执。
6. 主 Agent 会根据回执和实际输出做最多 3 轮复盘/返工；任务列表会显示最终报告、验收状态和仍需用户补充的信息。

需要并行改代码时，可以设置环境变量 `CCM_CHILD_AGENT_ISOLATION=worktree`，让子 Agent 在目标仓库的 `.cc-connect/worktrees/` 下创建独立 Git worktree 执行。

定时需求可以在“定时任务”中配置 Cron 表达式和执行提示词。触发后系统会自动创建任务并进入同一套主 Agent 编排队列。

更完整的业务描述、定时任务和验收回执写法见 [日常开发 Agent 操作手册](docs/daily-dev-agent.md)。

## 目录结构

```
~/.cc-connect/
├── configs/            # 项目配置文件
├── mcp/                # MCP 工具配置
├── skills/             # Skills 配置
├── shared/             # 共享文件
├── templates.json      # 对话模板
├── feishu-config.json  # 飞书配置
├── groups.json         # 群聊配置
└── tasks.json          # 任务配置
```

## 依赖

- Node.js >= 18
- [cc-connect](https://github.com/chenhg5/cc-connect)

## License

MIT
