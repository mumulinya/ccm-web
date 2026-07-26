# npm 1.0.16 生产化收口发布

## 发布范围

`@mumulinya167/cc-web@1.0.16` 收录当前 CCM 的生产化收口版本，重点包括：

- 统一运行时 SSE，任务、权限、Agent 和飞书状态使用事件驱动刷新。
- 测试领域收口、稳定入口、旧命令兼容和当前文档入口。
- Windows/Ubuntu、Node.js 20/22 发布矩阵与真实 npm 安装验收。
- `node-pty` 可选依赖和无原生模块时的命令终端降级。
- Codex、Claude Code、Cursor、Gemini CLI、OpenCode 的发布预检和显式 live 验收框架。
- 本地数据库、会话、凭据、日志、测试目录和临时安装包的 Git/npm 隔离。

## 发布前验证

- 本地包、lock 根版本均为 `1.0.16`。
- npm 登录账号为 `mumulinya167`，发布前 registry `latest` 为 `1.0.15`。
- frontend、backend 和飞书 MCP 生产构建通过。
- 发布领域回归 `5/5` 通过，付费 Provider 调用为 `0`。
- tarball 在系统临时目录真实安装成功，首次注册、8 个核心 API 和持久终端通过。
- tarball 共 `1141` 个文件，压缩后约 `57.9 MB`；数据库、会话、凭据、`scratch` 和 `.tgz.raw` 命中为 `0`。

## 发布结果

- 已于北京时间 `2026-07-23 11:20:14` 发布 `@mumulinya167/cc-web@1.0.16`。
- npm `latest` 已指向 `1.0.16`。
- 包校验值：`sha1 615cac8c94179fe9dcfde9c3d0ad04fb62737037`。
- 公共仓库 tarball：`https://registry.npmjs.org/@mumulinya167/cc-web/-/cc-web-1.0.16.tgz`。
- 从 npm 公共仓库重新安装后，CLI/doctor、后台生命周期、首次注册、8 个鉴权核心 API 和持久 PTY 均通过。
- 公共仓库回装验收的付费 Provider 调用为 `0`。

## 安装与升级

```bash
npm install -g @mumulinya167/cc-web@latest
ccm version
ccm doctor
ccm restart --background
```

无法加载 `node-pty` 的平台不会再导致整个 npm 安装失败。`ccm doctor` 会显示 PTY 降级，核心工作区继续可用，终端页面进入逐条命令模式。

## 外部验收边界

CI 和普通发布测试不会调用付费模型。五种 Provider 与飞书的真实 live 验收需要安装、登录、模型和飞书通道均已配置，并由用户显式运行 `npm run release:acceptance:live`。
