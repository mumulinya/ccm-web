# ccm - cc-connect 多项目管理器

同时管理多个 AI 编程助手项目的命令行工具，配合 [cc-connect](https://github.com/chenhg5/cc-connect) 使用，内置飞书 MCP 集成。

## 安装

```bash
# 一键安装（自动配置 cc-connect、飞书 MCP、Claude Code / Cursor）
npm install -g git+https://github.com/你的用户名/ccm.git

# 安装后自动运行 setup，也可手动执行
ccm-setup
```

## 快速开始

```bash
# 1. 创建第一个项目
ccm --init

# 2. 扫码创建飞书机器人
cc-connect feishu setup --project 项目名 --config ~/.cc-connect/configs/config-xxx.toml

# 3. 启动所有项目
ccm start all

# 4. 交互式选择
ccm
```

## 命令

| 命令 | 说明 |
|------|------|
| `ccm` | 交互式菜单 |
| `ccm --init` | 新建项目配置 |
| `ccm --list` | 列出所有配置 |
| `ccm status` | 查看运行状态 |
| `ccm start all` | 启动所有项目 |
| `ccm start 1` | 启动第1个项目 |
| `ccm start 项目名` | 启动指定项目 |
| `ccm stop all` | 停止所有项目 |
| `ccm stop 1` | 停止第1个项目 |
| `ccm-setup` | 重新运行安装脚本 |

## 包含内容

```
ccm-package/
├── bin/
│   ├── ccm.js          ← 主命令
│   └── setup.js        ← 安装脚本
├── configs/
│   └── config-template.toml
├── mcp-feishu/         ← 飞书 MCP 服务器
│   ├── dist/           ← 编译后的代码
│   └── src/            ← 源码
├── package.json
└── README.md
```

安装后自动配置：

```
~/.cc-connect/
├── configs/            ← 项目配置
├── pids/               ← 进程记录
├── logs/               ← 运行日志
└── projects.txt        ← 项目目录列表

~/.claude/.mcp.json     ← Claude Code MCP 配置
~/.cursor/mcp.json      ← Cursor MCP 配置
```

## 飞书 MCP 功能

Agent 可以通过 MCP 工具读取飞书消息：

| 工具 | 说明 |
|------|------|
| `list_chats` | 列出机器人所在的群聊 |
| `get_chat_history` | 获取群聊历史消息 |
| `search_messages` | 搜索群聊中的关键词 |
| `get_message_detail` | 获取单条消息详情 |

## 飞书自定义命令

在飞书聊天中可用：

| 命令 | 中文别名 | 说明 |
|------|---------|------|
| `/sessions` | `/会话` | 列出所有会话 |
| `/history #1` | `/历史 #1` | 查看会话历史 |
| `/ask <项目> #N <消息>` | `/提问` | 跨项目发消息 |
| `/projects` | `/项目` | 查看项目列表 |

## 新增项目

```bash
# 方式一：交互式创建
ccm --init

# 方式二：手动创建配置文件
# 在 ~/.cc-connect/configs/ 下新建 config-xxx.toml

# 方式三：扫码创建飞书机器人
cc-connect feishu setup --project 项目名 --config ~/.cc-connect/configs/config-xxx.toml
```

## 依赖

- Node.js >= 16
- [cc-connect](https://github.com/chenhg5/cc-connect)（自动安装）
- [Claude Code](https://docs.anthropic.com/claude-code) 或其他 AI 编程助手

## 其他电脑部署

```bash
# 1. 安装
npm install -g git+https://github.com/你的用户名/ccm.git

# 2. 填写飞书凭证
# 编辑 ~/.cc-connect/ccm-package/mcp-feishu/.env

# 3. 创建项目并启动
ccm --init
ccm start all
```
