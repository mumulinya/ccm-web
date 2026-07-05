# CCM Mini Kanban E2E Demo

## 项目信息

- 项目名：`ccm-e2e-mini-kanban`
- 项目目录：`C:\Users\admin\.cc-connect\ccm-e2e-mini-kanban`
- CCM 配置：`C:\Users\admin\.cc-connect\configs\config-ccm-e2e-mini-kanban.toml`
- 默认执行器：`claudecode`

## 用途

这个 demo 用来验证 CCM 是否真的能像 AI 编程软件一样完成小型 Web 开发任务：

- 项目 Agent 修改真实代码。
- 任务卡展示进度。
- 代码改动抽屉展示 diff。
- `npm run build` 和 `npm test` 验证。
- 项目记忆和任务会话续跑。
- 失败后返工。

## 推荐测试指令

项目会话里可以对 `ccm-e2e-mini-kanban` 发送：

```text
给看板增加一个“只看高优先级”的筛选按钮，完成后运行 npm run build 和 npm test。
```

继续同一任务测试续跑：

```text
刚才的筛选按钮再加一个“显示全部”的按钮，继续修改并运行验证。
```

Bugfix 测试：

```text
修复新增任务后输入框没有清空的问题，完成后运行验证。
```

UI 测试：

```text
把任务卡片样式改得更像 Linear，注意不要破坏移动任务功能，完成后运行 npm run build。
```

## 本地验证命令

```bash
cd C:\Users\admin\.cc-connect\ccm-e2e-mini-kanban
npm run build
npm test
npm run dev
```

开发服务默认：

```text
http://localhost:5179
```

## 2026-07-03 真实 E2E 记录

### 测试任务

```text
给看板增加一个“只看高优先级”的筛选按钮，完成后运行 npm run build 和 npm test。
```

### 结果

- 第一轮使用 `codex` 执行器：底层 Codex 返回模型不可用错误：`gpt-5.3-codex` 不支持当前 ChatGPT 账号。
- 同轮暴露 CCM 问题：项目直连执行链把 Codex JSON `turn.failed` 误标为 `done`。
- 已修复：`backend/agent-runtime.ts` 增加 Codex/Cursor JSON 失败检测，`backend/server.ts` 在 `/api/send-stream` 项目执行链里写入真实 `failed` 状态、错误原因和 native session id。
- 第二轮切换到 `cursor` 执行器后，CCM 真实创建 task run、task agent session、native session，并完成代码修改。
- SSE 返回了任务状态、工具同步事件、执行输出、文件 diff、`run.status=done` 和 `taskExperience.status=done`。

### 修改产物

- `src/main.js`：新增 `highPriorityOnly` 状态、筛选切换函数、可见任务过滤逻辑和筛选按钮渲染。
- `src/styles.css`：新增筛选工具栏和按钮样式。
- `dist/src/main.js`、`dist/src/styles.css`：由 `npm run build` 生成的构建产物。

### 验证

```bash
npm run build
npm test
```

结果：两条命令均通过，`npm test` 的 8 项 smoke check 全部为 `true`。

### 后续观察点

- Cursor 工具同步曾会在项目目录生成 `.cursor/mcp.json`。已改为写入 CCM 隔离 runtime 目录，避免污染业务仓库；Cursor 原生 MCP 暂按 CCM 平台代理兜底。
- 当前 Codex 账号/模型配置不可用时，系统现在会正确失败。
- 2026-07-03 已将 demo 默认执行器切为 `claudecode`，后续真实 E2E 压测优先使用 Claude Code。

## 连续真实任务压测

可以通过 CCM 项目执行主链连续发送真实小开发任务：

```bash
cd C:\Users\admin\.cc-connect\ccm
npm run test:project-agent-soak -- --project ccm-e2e-mini-kanban --count 3
```

脚本会读取 `/api/send-stream` 的 SSE 输出，并汇总每轮：

- `done/error`
- `runId`
- `traceId`
- `nativeSessionId`
- 文件变更数量
- 错误原因

长期稳定性压测可以把 `--count` 调大，或由外部计划任务定时触发。当前安全策略是：请求开始前优先选择可用执行器，候选链为 `claudecode → cursor → codex`；运行中如果已经发生失败，不会半路接管同一工作区，避免在未知改动状态下换 Agent 继续写代码。下一步可在“无文件变更且有 checkpoint”时增加自动回滚后换执行器重试。

### 2026-07-03 CC 主执行器压测

命令：

```bash
npm run test:project-agent-soak -- --project ccm-e2e-mini-kanban --count 1 --prefix cc-main-agent
```

结果：

- `passed: 1`
- `failed: 0`
- `runId: pchat_mr4yie6v_u0foad`
- `nativeSessionId: 8cb92f36-bed4-4636-8eee-e0cb2c7213a3`
- 文件变更数：`2`
- 独立复验：`npm run build` 通过，`npm test` 通过。
- 项目目录未再生成 `.cursor/` 或 `.claude/` 工具配置目录。
