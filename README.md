# cc-web

cc-connect 的 Web 管理界面，支持多 Agent 协作、任务派发、代码变更查看等。

[cc-connect](https://github.com/chenhg5/cc-connect) | [Node.js](https://nodejs.org)

## 功能特点

- 📂 **项目管理** - 创建、编辑、删除项目，一键启停 Agent
- 💬 **群聊协作** - 多 Agent 协作，支持 @mention 互相调用
- 📋 **任务派发** - 优先级队列，自动执行，跨 Agent 协作
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
