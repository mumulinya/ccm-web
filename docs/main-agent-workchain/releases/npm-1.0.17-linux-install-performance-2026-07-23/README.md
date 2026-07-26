# npm 1.0.17 Linux 安装性能修复

## 问题

`@mumulinya167/cc-web@1.0.16` 默认依赖 Electron。Linux 执行全局安装时，npm 在输出 deprecated 警告后会进入 Electron 平台运行时下载；这一阶段通常没有连续输出，容易被误认为安装卡死。

发布包本身约 `57.9 MB`，其中宠物资源是主要组成部分。网络较慢时仍需要正常下载时间，但不应再额外下载服务器不使用的 Electron。

## 修改

- 从 CCM 主包默认 dependencies 移除 `electron`。
- 桌面宠物首次启动时使用 `npx --yes electron@35.7.5` 按需获取，避免等待确认输入。
- 保留 `node-pty@1.2.0-beta.14` 可选依赖；该版本包含 Linux x64、Linux arm64、Windows 和 macOS 预编译文件。
- 保留无 PTY 时的命令终端降级，原生模块不可用不会阻止 CCM 安装或启动。
- 安装回归明确验证默认安装中不存在 Electron，同时验证宠物按需启动入口、持久 PTY、CLI、登录和核心 API。

## 验证证据

- TypeScript 检查通过。
- frontend、backend、飞书 MCP 生产构建通过。
- 发布领域测试 `5/5` 通过。
- 隔离 tarball 安装由 `194` 个依赖包降至 `135` 个。
- 本机隔离安装由约 `66 秒` 降至约 `17 秒`。这不是固定性能承诺，公网速度和机器性能仍会影响实际耗时。
- npm 公共仓库无跳过变量回装为 `135` 个依赖包、约 `43 秒`，完整安装验收通过。
- `boolean@3.2.0` 警告随 Electron 依赖链移除；`prebuild-install` 是 `better-sqlite3` 的间接提示，不影响成功安装。
- 付费 Provider 调用为 `0`。

## 发布结果

- 已于北京时间 `2026-07-23 13:13:22` 发布 `@mumulinya167/cc-web@1.0.17`。
- npm `latest` 已指向 `1.0.17`。
- 公共 tarball：`https://registry.npmjs.org/@mumulinya167/cc-web/-/cc-web-1.0.17.tgz`。
- SHA-1：`29afb5f995628c67c5849b887634e6747853349f`。
- Integrity：`sha512-nrWmzxr1aDU4T+OmG7GIvNqk+Map0S4sqPXewyOZxemGJTP8C6XElqF6nw31Ebb+qXFfhjtNVtr6E1WOx92PlA==`。

## 用户操作

如果旧版本安装仍停留在 Electron 下载阶段，可以终止当前 npm 进程并安装 `1.0.17` 或更新版本：

```bash
npm install -g @mumulinya167/cc-web@latest
ccm version
ccm doctor
```

纯服务器环境无需额外操作。只有实际使用桌面宠物时才会下载 Electron。
