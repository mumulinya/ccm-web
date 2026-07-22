# npm 1.0.12 Linux PTY 安装修复

## 事故结论

`@mumulinya167/cc-web@1.0.11` 在未安装 C++ 编译工具的 Linux x64 服务器上可能安装失败。

失败链路：

1. `1.0.11` 依赖稳定版 `node-pty@1.1.0`。
2. 该 npm 包包含 Windows 和 macOS 预构建文件，但不包含 Linux 预构建文件。
3. Linux 安装时自动回退到 `node-gyp rebuild`。
4. 目标服务器存在 Node.js、Python 和 make，但不存在 `g++`。
5. `pty/src/unix/pty.o` 无法编译，npm 以状态码 `1` 退出。

`npm warn deprecated boolean@3.2.0` 不是安装失败原因。它来自 Electron -> `@electron/get` -> `global-agent` 的间接依赖，只是弃用提示。

## 修复内容

- CCM 版本升级为 `1.0.12`。
- `node-pty` 固定为 `1.2.0-beta.14`，不使用浮动 beta 范围。
- 该版本包含以下官方预构建文件：
  - `linux-x64/pty.node`
  - `linux-arm64/pty.node`
  - `darwin-x64/pty.node`
  - `darwin-arm64/pty.node`
  - `win32-x64/conpty.node`
  - `win32-arm64/conpty.node`
- Linux x64/arm64 安装脚本命中对应目录后直接使用预构建文件，不再进入 `node-gyp rebuild`。
- 适配新版 Windows ConPTY 异步就绪行为：创建终端会话时等待真实 PID 后再向前端提交会话。
- 超时或启动后立即退出时返回明确错误，不提交半初始化终端会话。

## npm 发布状态

- 包：`@mumulinya167/cc-web`
- 版本：`1.0.12`
- dist-tag：`latest -> 1.0.12`
- 发布时间：`2026-07-22T09:25:29.248Z`
- SHA-1：`f4c82ee09d45a25fc63d3a36652f0b336cb120d2`
- Integrity：`sha512-2TaVxeQYqSbUeCd7xpUGG6vgd8Rc4nq7dKh+jcvzaJDuzYuth7brbk4adXL1uLqB0ggfh+qgROuA4T9OZel8XA==`
- Tarball：`https://registry.npmjs.org/@mumulinya167/cc-web/-/cc-web-1.0.12.tgz`

## 验证证据

- TypeScript backend/MCP 检查通过。
- frontend、MCP Feishu、backend production build 通过。
- 跨平台预构建清单 `6/6` 存在且文件非空。
- Windows x64 当前平台模块加载通过。
- 持久 PTY 输出、ANSI、resize、HTTP 生命周期、危险命令 challenge 通过。
- 本地 tarball 全新安装 `194` 个包成功。
- 安装版 CLI、doctor、后台启停、首次注册、认证后的 `8` 个核心 API 和持久 PTY 通过。
- 所有验证的付费 Provider 调用为 `0`。

当前工作环境没有 Docker 或 WSL，因此没有在本机执行 Linux 二进制。Linux 安装免编译结论来自实际发布依赖包的 Linux x64/arm64 文件清单及其安装脚本分支；目标 Linux 服务器应执行下面的 registry 重装作为最终环境验证。

## 服务器处理

直接安装修正版：

```bash
npm uninstall -g @mumulinya167/cc-web
npm cache clean --force
npm install -g @mumulinya167/cc-web@1.0.12
ccm doctor
ccm start --background
ccm status
```

若服务器因镜像缓存仍解析到旧依赖，可先验证：

```bash
npm view @mumulinya167/cc-web version
npm view @mumulinya167/cc-web@1.0.12 dependencies.node-pty
```

预期分别返回 `1.0.12` 和 `1.2.0-beta.14`。

## 旧版本临时方案

必须继续使用 `1.0.11` 时，Ubuntu/Debian 可以先安装编译工具：

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
npm install -g @mumulinya167/cc-web@1.0.11
```

推荐直接使用 `1.0.12`，避免把系统编译工具作为 CCM 的安装前提。
