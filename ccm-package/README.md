# CCM Workspace

<img src="./public/ccm-app-icon.png" alt="CCM" width="84" height="84" />

CCM 是一个运行在本机的多 Agent 协作工作区，统一管理全局助手、群聊主 Agent、项目 Agent、第三方开发 Agent、会话记忆、任务验收、Git 工作流和持久终端。

## 安装

要求 Node.js 20 或更高版本。

```bash
npm install -g @mumulinya167/cc-web@latest
ccm start --open
```

默认地址：<http://localhost:3080>。默认只监听 `127.0.0.1`，不会意外暴露到局域网或公网。

首次安装时，登录页会提供初始账户或注册入口。账户、项目、会话和运行数据保存在用户目录下的 `.cc-connect`，不会写入 npm 安装目录。

## 常用命令

```text
ccm start                         前台启动 CCM
ccm start --background --open     后台启动并打开浏览器
ccm stop                          停止 CCM 服务
ccm restart --background          重启后台服务
ccm status                        查看服务与项目状态
ccm status --json                 输出结构化状态
ccm doctor                        检查 Node、运行资源、PTY 与 Agent CLI
ccm open                          打开当前工作区
ccm logs --follow                 跟踪后台启动日志
ccm update --check                检查 npm 新版本
ccm update                        全局安装 latest
ccm version                       查看当前版本
```

项目兼容命令：

```text
ccm project list
ccm project start <项目名> [agent]
ccm project stop <项目名|all>
ccm project init
ccm agents
ccm pet [stop]
```

旧命令 `ccm start/stop <项目名>`、`ccm start/stop all`、`ccm --list` 和 `ccm --init` 继续可用。

## 主要能力

### Agent 协作

- 全局助手只使用全局上下文，并负责跨群聊、跨项目管理和任务路由。
- 群聊主 Agent 按精确群聊会话工作，拆分任务并验收项目子 Agent 结果。
- 独立项目 Agent 按精确项目会话运行，第三方 Agent 可通过受控 MCP 读取权威上下文。
- 支持 Claude Code、Codex、Cursor、Gemini CLI、OpenCode 和 Qoder CLI 配置。

### 会话与记忆

- 全局、群聊和项目均使用独立会话。
- 正式模型摘要与动态近期原文组成压缩后的连续上下文。
- 多轮压缩保留上一代摘要链，原始 transcript 不会因压缩删除。
- 记忆控制中心展示模型可见上下文、Token 分项、压缩门禁和会话状态。

### 开发工作流

- 项目管理支持本地目录、创建文件夹、GitHub 远端与开发 Agent 配置。
- 代码协作页面支持 Diff、暂存、提交、fetch、fast-forward pull 和 push。
- TestAgent 使用 Playwright MCP 执行浏览器检查，并把验证证据交回主 Agent。
- 任务回放、定时任务、自动开发和清理中心使用同一套任务与验收记录。

### 终端工作台

- 基于 `node-pty` 与 xterm 的持久 Shell，会话在页面刷新后可重新连接。
- `node-pty` 是可选原生能力；当前平台无法安装或加载时，CCM 核心服务仍可启动，终端页面自动切换为逐条命令兼容模式。
- 支持 ANSI、交互式 CLI、Shell 切换、项目脚本、Git 分支、PID 与监听端口。
- 危险命令在后端 Enter 边界要求一次性确认。
- 终端输出可以预填到全局、项目或群聊 Agent，但不会自动发送。

## 运行方式

前台运行适合直接观察服务日志：

```bash
ccm start
```

后台运行适合日常使用：

```bash
ccm start --background --open
ccm status
ccm logs --follow
ccm stop
```

指定端口：

```bash
ccm start --port 31900
ccm open --port 31900
```

### 服务器远程访问

同一局域网或云服务器需要显式监听所有网卡：

```bash
ccm start --background --host 0.0.0.0 --port 3080
ccm status
```

其他设备应访问 `http://<服务器 IP>:3080`，不能使用 `localhost`。同时需要在系统防火墙和云安全组中放行 TCP `3080`。远程 API 必须通过 CCM 登录会话，只有服务器本机的 Agent 调用保留免登录能力。

公网部署建议让 CCM 继续监听 `127.0.0.1`，再通过 Nginx、Caddy 或 Cloudflare Tunnel 提供 HTTPS。直接使用 HTTP 会让登录凭据在网络中以明文传输；首次登录后也应立即修改初始管理员密码。

同一数据目录只允许一个 CCM 实例。测试多个实例时应为每个实例配置独立的 `CCM_TASK_STORE_DIR`。

## 本地数据

默认目录：

```text
~/.cc-connect/
  configs/    项目与 Agent 配置
  logs/       后台服务和项目日志
  pids/       项目进程记录
  run/        CCM 服务实例锁
  sessions/   会话数据
```

凭据和账户数据不会打进 npm 包。删除或迁移 `.cc-connect` 前应先停止 CCM 并自行备份。

## 开发构建

```bash
npm install
npm --prefix frontend install
npm run build
npm run docs:check
```

发布前可运行：

```bash
npm run release:preflight
npm run test:release
```

`release:preflight` 只读取五种开发 Agent 的安装、登录、版本和模型配置，不调用付费模型。需要执行每种 Provider 一次真实只读验收并核对最近飞书往返与权限审批时，显式运行 `npm run release:acceptance:live`；该命令可能产生最多五次模型调用。

源码位于 `backend/`、`frontend/` 和 `integrations/`；`ccm-package/dist` 与 `ccm-package/public` 是生产构建产物。

## 外部条件

第三方 Agent 登录、付费模型、飞书租户、Git 远端和外部音乐服务需要用户自己的账号、网络与凭据。CCM 不会替用户创建这些外部授权。

## License

MIT
