# npm 1.0.14 Linux CLI 权限修复

## 问题

Linux 全局安装后执行 `ccm` 可能返回：

```text
bash: /usr/bin/ccm: Permission denied
```

`/usr/bin/ccm` 是 npm 创建的软链接，目标为包内 `bin/ccm.js`。`1.0.13` 的 Windows 打包产物中该文件模式为 `0644`，缺少 Unix execute 位，因此部分 Linux/npm 安装环境无法直接执行。

## 修复

- 版本升级为 `1.0.14`。
- 新增 `postinstall` 权限修复，将 `ccm.js`、legacy CLI、setup 和权限修复脚本设置为 `0755`。
- 新增发布 tarball 模式规范化工具，发布前直接把四个 CLI 文件写成 `0755`。
- 发布使用规范化后的 tarball，避免 Windows 重新打包时恢复为 `0644`。
- 保留 `#!/usr/bin/env node` shebang。

## npm 状态

- 包：`@mumulinya167/cc-web@1.0.14`
- dist-tag：`latest -> 1.0.14`
- 发布时间：`2026-07-22T10:24:42.849Z`
- SHA-1：`0d5b8970fd6d8fbbeede93d4b9f396c4a19998cd`
- Integrity：`sha512-7/O+4JkuXpwK1hb1v8VrizVdMC46XgDhGyJGHsVbMwbkPxQJZFsaeOce37+lQRMJleyxwaViYw8Bj3pqLmSRhA==`

从 npm registry 重新下载的 tarball 权限：

```text
-rwxr-xr-x package/bin/ccm.js
-rwxr-xr-x package/bin/legacy-project-cli.js
-rwxr-xr-x package/bin/postinstall.js
-rwxr-xr-x package/bin/setup.js
```

## 验证

- production frontend、MCP Feishu、backend build 通过。
- CLI 发布回归 `7/7` 通过。
- Linux/macOS/Windows PTY 预构建清单通过。
- 规范化 tarball 全新安装 `194` 个包成功。
- 安装版版本、doctor、后台启停、首次注册、认证后 `8` 个核心 API 和持久 PTY 通过。
- npm registry tarball 已重新下载并验证四个文件均为 `0755`。
- 付费 Provider 调用为 `0`。

## 服务器升级

```bash
npm uninstall -g @mumulinya167/cc-web
npm cache verify
npm install -g @mumulinya167/cc-web@1.0.14 --registry=https://registry.npmjs.org
hash -r
ccm --version
ccm doctor
```

预期版本为 `@mumulinya167/cc-web 1.0.14`。

旧安装需要立即恢复时可执行：

```bash
sudo chmod +x "$(npm root -g)/@mumulinya167/cc-web/bin/ccm.js"
hash -r
ccm --version
```
