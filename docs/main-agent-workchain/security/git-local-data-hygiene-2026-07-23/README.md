# Git 本地数据与敏感产物隔离

## 目标

避免测试、运行和安装过程中产生的本地数据被提交到 Git，同时保留 npm 发布所需的源码、编译产物和前端静态资源。

## 已屏蔽

- `scratch/` 下的测试数据库、截图、报告、临时 Home 和浏览器状态。
- 任意层级的 `.cc-connect/`，包括账户会话、会话 transcript、任务、记忆、SQLite、WAL 和运行锁。
- `.claude/ccm-runtime/` 中按任务生成的 MCP 配置。
- `.runtime-logs`、`logs`、`pids`、`run`、`sessions`、`temp` 和 `.tmp*`。
- `*.db`、`*.db-shm`、`*.db-wal`、`*.key`、加密凭据文件和运行时 secret。
- `.env` 与环境变体，但保留所有 `.env.example`。
- npm tarball、`.tgz.raw`、覆盖率和 Playwright 临时报告。
- Windows PowerShell 模块缓存和误生成的绝对临时路径目录。

## 继续跟踪

- `backend/`、`frontend/src/`、`integrations/` 和 `scripts/` 源码。
- `docs/` 中正式保存的说明与验收证据。
- `ccm-package/dist/` 和 `ccm-package/public/`，因为当前 npm 包直接从这些目录发布。
- `configs/slash-commands.example.json` 和 MCP 的 `.env.example`。

## 索引处理

已经进入 Git 索引的 `scratch`、临时运行目录、生成的 MCP 配置、系统缓存和 `.tgz.raw` 使用 `git rm --cached` 解除跟踪。该操作只修改 Git 索引，不删除本机文件。

`git-local-data-ignore-selftest.mjs` 同时验证应忽略样例和必须保留的发布文件，防止后续规则过宽。
