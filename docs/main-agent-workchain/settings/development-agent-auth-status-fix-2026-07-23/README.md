# 开发 Agent 认证状态与服务器登录修复

## 问题

开发 Agent 设置页曾将 Cursor CLI 的任意 `logged in` 文本视为成功。`Not logged in` 同样包含该片段，因此未登录状态可能被误显示为“已登录”。页面同时优先显示版本号，隐藏了 CLI 返回的认证详情。

Linux 服务器上的登录按钮还会沿用 Windows PowerShell 窗口流程，远程浏览器无法在服务器桌面完成该交互。

## 修复

- Cursor 必须满足退出码为 `0`、存在明确成功文本且不存在否定认证文本，才能成为 `logged_in`。
- `Not logged in`、`Logged out`、`Not authenticated`、`Authentication required` 和非零退出码全部 fail closed。
- 页面分别显示 CLI 版本、账号和认证探测详情，不再用版本号遮住认证证据。
- Windows 本机继续打开认证终端窗口。
- Linux/macOS 服务器返回精确认证命令，页面展示并尝试复制，用户在 CCM 所在服务器的 SSH 终端执行。
- OpenCode 的交互式退出在非 Windows 服务器上使用同一手动命令流程。
- 完成登录后点击“重新检查”，只有新的正向 CLI 证据才会切换为“已登录”。
- 导航栏版本号由发布包版本在构建时注入，不再保留容易过期的硬编码版本。

## 回归证据

- Cursor 正向、否定和失败退出码解析测试通过。
- 开发 Agent 配置、密钥脱敏、五种 Agent 模型路由和项目注册表测试通过。
- TypeScript 检查和 production build 通过。
- 桌面页面回归确认“待认证”、认证详情和服务器命令同时可见，且布局无重叠。
- 发布领域测试 `5/5` 通过；公共 npm 回装的 CLI、登录、核心 API 和持久终端通过。
- 测试不调用付费 Provider。

## 发布结果

- 已于北京时间 `2026-07-23 14:05:20` 发布 `@mumulinya167/cc-web@1.0.18`。
- npm `latest` 已指向 `1.0.18`。
- 公共 tarball：`https://registry.npmjs.org/@mumulinya167/cc-web/-/cc-web-1.0.18.tgz`。
- SHA-1：`fa6f680691766e0c56267aa17cf95ffea69a34f1`。
