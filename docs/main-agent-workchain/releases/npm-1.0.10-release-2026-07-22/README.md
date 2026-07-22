# npm 1.0.10 发布记录

## 结果

- 包名：`@mumulinya167/cc-web`
- 版本：`1.0.10`
- npm dist-tag：`latest`
- 发布时间：`2026-07-22`（Asia/Shanghai）
- npm 页面：<https://www.npmjs.com/package/@mumulinya167/cc-web>
- 包体：`55,993,715` bytes，解包后 `85,824,966` bytes，共 `1,129` 个文件
- SHA-1：`2cff6f1d7c3df1f6cccb43f4b33c00777165383c`
- Integrity：`sha512-hBdi3Umg3PkWrNq7z3Mll70gX7uVyN+em4uQiq2+iTUXk7Y5wN073MrkyRtYXZSLeYu41c73YX05Qqz0N4W9FQ==`

安装与启动：

```powershell
npm install -g @mumulinya167/cc-web@1.0.10
ccm start
```

指定端口：

```powershell
ccm start --port 31902
```

## 发布修复

1. 发布包补齐 `pdf-parse` 与 `playwright` 运行时依赖，解决干净环境启动时报模块缺失的问题。
2. `ccm start --port <端口>` 正确识别为 Web 控制台启动，不再把 `--port` 当作项目名。
3. CLI Agent 列表补齐 OpenCode，当前包含 Claude Code、Cursor、Gemini CLI、Codex、OpenCode 和 Qoder CLI。
4. npm 包只发布 `dist` JavaScript，不发布 `.map` 与 `.d.ts`；桌面宠物复用 `public/pets`，不再重复发布 `pet/assets`。
5. TestAgent 登录条件阻塞统一为 `needs_environment`，全局 UI 显示为等待补条件；环境阻塞优先于普通人工确认。
6. 项目永久删除回归改为验证 SQLite 正式任务存储，确保项目配置与会话删除后，历史任务和 TestAgent 证据仍保留。
7. 全局记忆长会话测试按 10K～40K token 动态近期窗口构造真实压缩负载，验证多轮边界、归档、授权召回和原始 transcript 保留。

## 包内容审计

- 不包含用户会话、数据库、凭据、私有 `.env`、npm token 或密钥文件。
- 不包含 `dist/**/*.map`、`dist/**/*.d.ts` 和重复的 `pet/assets`。
- 保留前端生产资源、后端服务、内部记忆 MCP、角色 Skills、桌面宠物和全部宠物动作资源。
- `mcp-feishu/.env.example` 仅为无凭据模板。

## 验证证据

以下测试均通过，付费 Provider 调用为 `0`：

- `npm run build`
- `npm run check`
- `npm run test:coordinator`
- `npm run test:all-session-cc-compaction`：51 项
- `npm run test:session-memory-dynamic-window`：23 项
- `npm run test:third-party-memory-mcp-hydration`：49 项
- `npm run test:project-management`：6 条生产流程
- `npm run test:gemini-opencode-agent-integration`：15 项
- `npm run test:agent-provider-settings`：8 项
- `npm run test:memory-center-scope-hierarchy`：27 项
- `npm run test:music-production`：搜索、下载任务、上传、Range、收藏、队列和歌单
- `npm run test:cron-reliability`
- `npm run test:cleanup`
- `npm run test:pet-workspace-companion`
- `npm run test:test-agent:ci`
- `npm run test:page-load-performance`

## 安装冒烟

发布前从本地 tarball 正常安装，并使用隔离 HOME 启动 `ccm start --port 31901`。发布后重新从 npm registry 安装 `@mumulinya167/cc-web@1.0.10`，使用隔离 HOME 启动 `ccm start --port 31902`，以下接口均返回 HTTP 200：

- `/api/projects`
- `/api/groups`
- `/api/memory-center/overview`
- `/api/cleanup/summary`
- `/api/pets/agents`
- `/api/music/list`
- `/api/cron`

同时确认首屏静态加载遮罩存在，`pdf-parse`、Playwright 与 `better-sqlite3` 能从 registry 安装结果中解析。

## 外部条件

第三方 Agent 的真实登录、付费模型调用、飞书真实租户和外部音乐服务仍依赖用户自己的安装、账号、网络与密钥配置。发布验证覆盖配置、凭据隔离、Provider 选择、MCP 注入和 mock 执行链，没有使用用户凭据发起付费调用。
