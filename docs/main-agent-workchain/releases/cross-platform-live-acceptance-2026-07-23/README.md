# 跨平台安装与真实链路发布验收

## 范围

本次升级完成生产化优化项 2 和 3：

1. Windows、Ubuntu、Node.js 20/22 的安装和运行发布矩阵。
2. `node-pty` 缺少预编译模块或本地编译失败时的明确降级。
3. Codex、Claude Code、Cursor、Gemini CLI、OpenCode 的统一发布预检和有限真实调用。
4. 飞书真实入站、出站和权限决定的时间窗口证据门禁。

## node-pty 降级

`node-pty` 从硬依赖迁移为 `optionalDependencies`。后端不再静态导入原生模块，而是在创建持久终端时加载：

```text
node-pty 可用 -> 持久交互 Shell、ANSI、resize、会话重连
node-pty 不可用 -> CCM 正常启动 -> /api/terminal/shells 报告 command_fallback
                  -> 持久会话返回明确 503
                  -> 终端页面使用 /api/terminal/exec 逐条执行命令
```

`ccm doctor` 将 PTY 标为可选降级项，不会因为单个原生扩展阻止登录、Agent、记忆、任务、飞书和其他页面启动。

## 发布矩阵

`.github/workflows/release-matrix.yml` 使用四组环境：

- Windows + Node.js 20
- Windows + Node.js 22
- Ubuntu + Node.js 20
- Ubuntu + Node.js 22

每组运行类型检查、生产构建、原生预编译检查、无 PTY 启动、CLI 生命周期、真实 tarball 安装和发布验收框架自检。CI 不配置用户 Provider 凭据，因此付费调用为 0。

## 真实 Agent 验收

`release-live-acceptance.mjs` 先读取每种 Provider 的：

- CLI 是否安装及实际版本。
- 登录或 API 配置是否有效。
- CCM 当前选择的模型。
- 当前 Provider 是否达到可调用状态。

默认预检不调用模型：

```powershell
npm run release:preflight
```

预检命令本身可以成功完成，但只有五种 Provider 全部安装并登录时 `releaseReady` 才为 `true`，不会把“检查完成”伪装成“正式发布已经就绪”。

显式 live 模式会为每个 Provider 建立独立临时目录，要求只返回一次随机 marker，并验证目录 checksum 前后不变。报告只保存 marker 是否出现、输出字节数、输出 checksum、退出码和目录 checksum 结果，不保存模型原始回复。

```powershell
npm run release:acceptance:live
```

该命令要求五种 Provider 全部通过，并检查最近 30 分钟内的飞书 API 健康、真实入站、真实出站和一次全局来源权限决定。缺少安装、登录、模型配置或飞书证据时 fail closed。

## 证据与边界

- `node-pty-cross-platform-release-selftest.mjs` 核验六种平台/架构预编译文件和当前平台加载。
- `node-pty-degraded-runtime-selftest.mjs` 在强制无 PTY 环境中验证服务启动、503 能力边界和命令降级。
- `npm-package-install-release-selftest.mjs` 在系统临时目录真实安装打包产物。
- `release-acceptance-framework-selftest.mjs` 核验五 Provider、飞书证据、敏感输出边界和 CI 矩阵。
- 当前机器无法代替 GitHub Runner 证明 Ubuntu 结果；只有四个矩阵任务实际通过后，才能把跨平台状态标记为发布通过。
- live 命令可能产生最多五次付费模型调用，绝不由普通构建、CI 或快速测试自动触发。
