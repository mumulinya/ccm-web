# npm 1.0.11 CLI 与终端发布记录

## 发布结论

- 包名：`@mumulinya167/cc-web`
- 版本：`1.0.11`
- npm dist-tag：`latest -> 1.0.11`
- 发布时间：`2026-07-22T08:55:14.436Z`
- 包大小：`57,832,595 bytes`
- 解包大小：`88,092,707 bytes`
- 文件数：`1,128`
- SHA-1：`8cb9c5fe3c599126e6ef18d7d13f2db1feffd224`
- Integrity：`sha512-rLbzO3QpLz38cqFAkkkh36b1dfoUn3GBu1lEbous/rndv+83hMk1IRPsq0sSfawJI5Ix+RAOWDgn0QFk1TBiwA==`
- Tarball：`https://registry.npmjs.org/@mumulinya167/cc-web/-/cc-web-1.0.11.tgz`

该版本已发布到 npm 官方仓库，并从 registry 全新安装后通过发布验收。所有自动化测试均使用本地或 mock 数据，付费 Provider 调用为 `0`。

## CLI 调整

`ccm` 入口已按服务管理和项目管理职责重新整理：

- `ccm start [--port <port>] [--background] [--open]`
- `ccm stop [web]`
- `ccm restart [--background] [--open]`
- `ccm status [--json]`
- `ccm open [--port <port>]`
- `ccm logs [--lines <count>] [--follow]`
- `ccm doctor [--json]`
- `ccm update --check`
- `ccm update`
- `ccm project list`
- `ccm project start <name> [agent]`
- `ccm project stop <name|all>`
- `ccm project init`
- `ccm project agents`
- `ccm project interactive`

旧版 `start/stop <project>`、`start/stop all`、`--list`、`--init`、`agents` 和 `pet` 入口继续兼容，由独立的 legacy project CLI 模块承接，不再与 Web 服务生命周期代码混在一个文件中。

## 启动输出

服务启动改为单一状态块，展示真实版本、访问地址、数据目录、运行模式和停止方式。后台模式写入 `~/.cc-connect/logs/ccm-server.log`，实例身份写入精确 lock 文件；`status --json` 和 `doctor --json` 可供自动化读取。

## 终端能力

- npm 包显式包含 `node-pty@^1.1.0`。
- 安装版支持持久化 PTY、ANSI 渲染、窗口尺寸调整、输入、停止和恢复。
- 危险命令保留服务端 challenge 确认。
- 项目脚本、进程管理和 Agent 草稿路由均经过回归。

## 发布验证

发布前：

- production frontend、MCP Feishu、backend build 通过。
- CLI 发布自检 `7/7` 通过。
- 本地认证 `8/8` 通过。
- 会话压缩 `51` 项、第三方记忆 MCP `49` 项通过。
- 项目管理 `6` 条工作流、Git/目录 `8` 项、代码变更 `20` 项通过。
- Agent Provider `8` 项、Gemini CLI/OpenCode `15` 项通过。
- 音乐、清理中心、定时任务可靠性回归通过。
- 终端生产链路和 PTY 工作台回归通过。
- 文档链接检查 `1,068` 个链接，失败 `0`。

发布包验证：

- 本地 tarball 全新安装 `194` 个包成功。
- npm registry 线上包全新安装 `194` 个包成功。
- 两次安装均验证版本、CLI、doctor、后台启停、首次注册、认证接口和持久化 PTY。
- 安装版认证后验证 `8` 个核心 API：项目、群聊、记忆中心、清理中心、宠物、音乐、定时任务和终端。

## 用户命令

首次安装或升级：

```bash
npm install -g @mumulinya167/cc-web@latest
ccm doctor
ccm start --open
```

检查后续更新：

```bash
ccm update --check
ccm update
```

## 已知外部提示

npm 安装时会报告 `prebuild-install@7.1.3` 和 `boolean@3.2.0` 为上游弃用依赖。本次 Windows Node.js 22 隔离安装与运行验证未受影响；后续应在对应上游依赖提供替代版本时升级。
