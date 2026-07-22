# 持久 PTY 终端工作台

## 目标

本轮将原来的逐命令执行页面升级为真正的本地终端工作台。页面刷新不再终止 Shell；同一个终端中的当前目录、环境变量、登录状态和交互式 CLI 由同一个 PTY 进程保持。

## 业务流程

```text
打开终端工作台
  -> 读取终端工作区元数据
  -> 使用精确 session id 创建或重连 PTY
  -> xterm 通过 SSE 接收 ANSI 原始输出
  -> 键盘输入通过受鉴权的 HTTP 输入接口写入 PTY
  -> 调整页面尺寸时同步 PTY cols/rows
  -> 刷新页面后重新读取 scrollback 并连接同一个 Shell
```

关闭、重启、切换项目或切换 Shell 时，服务端停止该会话及其子进程树。CCM 服务本身重启后，终端标签、项目、目录和 Shell 选择仍保留，但操作系统 PTY 进程不会伪装成可恢复状态，而是创建新 Shell。

## 终端内核

- 后端使用 `node-pty` 创建 PowerShell 7、Windows PowerShell、Command Prompt 或当前系统可用 Shell。
- 前端使用 `@xterm/xterm`，并接入 fit、search 和 web-links addon。
- 每个终端绑定唯一 session id，最多同时运行 4 个持久会话。
- 单会话服务端 scrollback 上限约 150 万字符，前端 xterm 保留 10,000 行。
- SSE 只承载输出；输入、resize、确认和停止继续走现有鉴权 HTTP 链。
- 旧 `/api/terminal/stream` 保留，避免既有调用和测试失效。

## 项目工作流

- 终端可绑定项目目录，并在切换目录时明确重启 Shell。
- 自动读取当前目录 `package.json` 的 scripts，形成项目命令抽屉。
- 显示当前 Git 分支，并提供 Git 状态和最近提交操作。
- 进程抽屉展示 Shell、PID、运行时长和检测到的监听端口。
- Windows 停止操作使用 PTY kill 并请求停止子进程树，避免开发服务器残留占用端口。

## Agent 协作

“交给 Agent”优先使用用户在终端中选中的文本；没有选择时使用当前终端近期输出，最多携带末尾 14,000 字符。

- 全局助手：处理系统环境、工具链和跨项目问题。
- 项目 Agent：绑定当前已选项目。
- 群聊主 Agent：绑定用户选择的精确群聊。

输出只写入目标会话输入框，不自动发送。用户可以补充要求、删除敏感内容后再提交。

## 安全策略

- 危险命令不只在前端判断，PTY 输入在服务端 Enter 边界再次检查。
- 命中删除、格式化、强制清理、硬重置或整套服务停止等命令时，服务端先发送 Ctrl+C 清空待执行行，再签发 60 秒一次性 challenge。
- 用户确认后只能执行 challenge 绑定的原始命令，过期或不匹配均拒绝。
- 单次输入、命令长度、会话数和工作区持久化内容均有限额。
- Agent 草稿不会自动发送，终端输出不会自动写入长期记忆。

## 接口

- `GET /api/terminal/shells`
- `GET /api/terminal/sessions`
- `POST/DELETE /api/terminal/session`
- `GET /api/terminal/session/events`
- `POST /api/terminal/session/input`
- `POST /api/terminal/session/confirm`
- `POST /api/terminal/session/resize`
- `GET /api/terminal/project-actions`

## 验证

- `npm run test:terminal-pty-workbench`：真实 PTY 输出、resize、危险命令 challenge、项目工作流及三类 Agent 路由。
- `npm run test:terminal-render`：桌面和移动端 xterm、项目脚本、进程端口及 Agent 抽屉渲染。
- `npm run test:terminal-production`：旧工作区、旧流式命令、停止能力和兼容接口。
- `npm run build`：frontend、MCP 和 backend 生产构建。

全部测试使用本地 Shell 或 mock API，付费 Provider 调用为 0。
