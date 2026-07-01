# CCM Slash Command 命令中心 7.0

## 目标

让全局助手、项目 Agent 和群聊主 Agent 都具备统一的 `/` 命令发现与执行体验，同时保证命令不会绕过 CCM 已有的语义判断、授权确认、任务状态机、会话生命周期和交付门禁。

## 参考 Claude Code 的部分

本次直接审阅了 `D:\claude-code` 中与命令相关的实现，主要包括：

- `src/types/command.ts`：统一命令类型、别名、参数提示、来源、可用性、隐藏/敏感标志。
- `src/commands.ts`：内置命令注册表与 Skill、Plugin、MCP 等动态命令来源。
- `src/utils/slashCommandParsing.ts`：命令名与参数的集中解析。
- `src/utils/suggestions/commandSuggestions.ts`、`src/hooks/useTypeahead.tsx`：候选发现、排序与键盘选择。
- `src/utils/processUserInput/processSlashCommand.tsx`：命令解析后的分流与执行。

CCM 对齐这些设计思想，但没有复制 Claude Code 的 React/Ink UI 或直接调用其私有 coordinator。CCM 的命令最终仍进入自己的全局 Agent、项目 Agent、群聊协调器和安全门禁。

## 当前实现

### 统一注册表

后端注册表位于 `backend/modules/slash-commands.ts`，每条命令公开：

- `name`、`aliases`、`description`、`category`、`icon`
- `scopes`：`global`、`project`、`group`
- `argumentHint` 与 `parameterSchema`
- `risk`：`safe`、`guarded`、`high`
- `permission`：`read`、`agent`、`manage`
- `source`：`builtin`、`ccm`、`custom`、`skill`
- `availability`：当前上下文是否可用以及不可用原因
- `actionType`：`navigate` 或 `prompt`

### 三个输入入口

以下入口使用同一个 `SlashCommandMenu.vue` 和 `useSlashCommands.js`，不再各自维护一份斜杠模板逻辑：

- 全局助手
- 项目 Agent 聊天
- 群聊主 Agent

支持输入 `/` 自动出现、中文/英文别名、名称/描述/分类模糊检索、最近使用排序、作用域相关排序、上下键、Enter、Tab、Esc、参数提示、风险徽标和不可用原因。

原来的对话模板按钮继续保留；模板负责格式化长提示词，斜杠命令负责明确调用系统能力，两者不再争抢 `/`。

### 安全边界

- `navigate` 只允许切换 CCM 页面，不触发项目变更。
- `prompt` 命令只生成明确、结构化的用户意图，再交给现有 Agent 执行。
- `/project-start`、`/project-stop` 标为 `high/manage`，前端先确认，进入 Agent 后仍必须通过原有确认和审计。
- `/retry`、`/resume`、`/recover` 明确要求读取真实回执、Trace 与检查点，不能把“重新发一句话”伪装成原生恢复。
- 未知命令不会作为普通消息悄悄发送给模型。
- 审计只记录命令名、作用域、风险、动作类型、上下文标识和是否有参数，不记录参数正文，避免敏感内容进入命令日志。

审计文件：`C:\Users\admin\.cc-connect\logs\slash-command-audit.jsonl`。

## CCM 专属命令

当前包含：

- 基础：`/help`、`/status`、`/plan`
- 开发：`/review`、`/verify`
- 导航：`/projects`、`/groups`、`/tasks`、`/memory`、`/quality`、`/doctor`、`/templates`、`/tools`
- 记忆：`/compact`、`/remember`
- 执行恢复：`/resume`、`/retry`、`/executor`、`/recover`
- 治理：`/shadow`
- 项目操作：`/project-start`、`/project-stop`

此外，`C:\Users\admin\.cc-connect\skills\*.json` 中启用的 Skill 会自动成为 `/skill:<name>` 命令。例如现有 Skill 会显示为 `/skill:code-safety-auditor`。Skill 仍作为提示与约束注入现有 Agent，不直接执行系统操作。

## 自定义命令

运行时配置位于：

`C:\Users\admin\.cc-connect\configs\slash-commands.json`

仓库示例：`configs/slash-commands.example.json`。

也可通过 API 管理：

- `GET /api/slash-commands/custom`
- `PUT /api/slash-commands/custom`

PUT 会校验名称、作用域、动作类型、重复项和内置命令冲突，并使用同目录临时文件原子替换。自定义命令默认按 `guarded` 处理。

## API

- `GET /api/slash-commands?scope=global|project|group`：获取当前作用域候选。
- `POST /api/slash-commands/resolve`：解析完整命令，检查参数与可用性，返回受控导航或 Agent 提示。
- `GET/PUT /api/slash-commands/custom`：读取或更新自定义注册表。

## 验收要求

- 后端 `runSlashCommandSelfTest()` 覆盖解析、作用域隔离、高风险不直执、导航、参数展开、别名、参数 schema、权限推导和 Skill 动态命令。
- coordinator smoke 必须包含 Slash Command 自测。
- 完成 TypeScript 检查、前后端完整构建、真实 HTTP API 验收和三个入口的浏览器交互验收。
- 生产运行使用隐藏 Node 进程，不新增可见控制台窗口。

## 2026-06-30 验收记录

- `npm run check`：通过。
- `npm run test:coordinator`：通过，`slashCommandCenter.pass=true`，10 项命令中心检查全部通过，且原有 coordinator/记忆/会话/恢复/安全测试无回归。
- `npm run build`：前端、飞书 MCP、后端完整构建通过。
- 生产 HTTP E2E：全局 20 条、项目 20 条、群聊 21 条候选；2 个现有 Skill 动态出现。参数 schema、权限、缺参提示、受控导航、高风险保持 prompt、自定义注册表原子更新、审计参数脱敏全部通过。
- 项目 Agent 页面：输入 `/` 显示命令中心；可见 `/plan`、`/verify`、`/skill:code-safety-auditor`；`/mem` 能模糊命中 `/memory`；上下键与 Esc 正常。
- 全局助手页面：可见 `/project-start`、`/project-stop` 和“需确认”；选择缺参的 `/plan` 后输入框变为 `/plan `，没有误发送。
- 群聊主 Agent 页面：可见 `/resume` 等受控恢复命令；执行 `/memory` 后真实跳转到记忆控制中心。
- 浏览器控制台错误：0。
- 服务 PID `18588` 使用 `D:\nodejs\node.exe ccm-package/dist/server.js`，监听 3080，并由 `Start-Process -WindowStyle Hidden` 隐藏启动。
- 已知无关告警：现有 `filesystem-mcp` 仍引用不存在的 `C:\Users\admin\Desktop`，服务会记录 MCP 连接失败；不影响 Slash Command API 和页面功能。
