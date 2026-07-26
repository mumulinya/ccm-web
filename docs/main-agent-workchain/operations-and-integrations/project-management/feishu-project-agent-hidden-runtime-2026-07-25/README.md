# 飞书项目 Agent 后台执行

## 目标

飞书消息进入项目后，项目主 Agent、项目子 Agent 和 TestAgent 的执行进度只通过 CCM、飞书卡片、任务时间线和任务回放呈现。Windows 桌面不能因为启动 Claude Code 或其他开发 Agent 而弹出黑色控制台窗口。

## 执行链

```text
飞书消息
-> 当前项目 cc-connect 长连接
-> 精确项目会话与项目主 Agent
-> 项目工作项
-> 第三方开发 Agent
-> TestAgent 与项目主 Agent 验收
-> 原飞书会话
```

项目连接在 Windows 上不再只依赖最外层 Node `windowsHide`。CCM 先启动编译为 `winexe` 的受控启动器，启动器用 `UseShellExecute=false` 和 `CreateNoWindow=true` 创建 `cc-connect`，因此它后续启动的 Agent CLI 也不会获得新的控制台。

当环境只有 npm 的 `cc-connect.cmd` 时，启动器会无窗口调用 `cmd.exe /d /s /c cc-connect ...`；存在原生 `cc-connect.exe` 时则直接执行。两种路径都保留日志重定向、PID 管理和项目停止能力。

## 备用 Runner

`agent-runner.ps1 -Watch` 只保留为 Node 子进程能力受限时的兼容通道。在 Windows 上，入口脚本会立即通过 `Start-Process -WindowStyle Hidden` 转交给隐藏监听子进程并退出前台。隐藏子进程继续保留请求文件、超时、结果文件和心跳协议。

## 交互边界

- 飞书消息、网页任务、定时任务和自动开发触发的 Agent 执行必须隐藏。
- 项目连接和控制机器人长连接必须隐藏。
- 用户在设置页明确点击“登录”“授权”或需要回填认证信息时，允许打开浏览器或交互窗口。
- 后台任务不能借用登录窗口，也不能把任务执行失败伪装成登录提示。

## 验证

- `node scripts/project-agent-hidden-process-selftest.mjs`：8 项无窗口启动约束通过。
- `npm run check`：Backend、飞书 MCP TypeScript 类型检查通过。
- 集成测试域包含 `project-agent-hidden-process-selftest.mjs`，防止项目飞书链路退回可见控制台。
- 验证未调用付费 Provider。
