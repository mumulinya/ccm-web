# CCM Slash Command 本地开发控制 7.1

## 目标

在 7.0 命令发现与安全路由基础上，让常用查询命令直接读取 CCM 的真实 API，并在全局助手、项目 Agent、群聊主 Agent 中显示统一结果卡片。查询过程不调用 Claude、Codex、Cursor 或其他大模型。

## 新增命令

| 命令 | 作用 | 执行类型 | 风险 |
|---|---|---|---|
| `/new` | 新建全局或项目 Agent 会话 | 本地客户端 | safe |
| `/clear` | 清空当前会话 | 本地客户端 | high，执行前确认 |
| `/context` | 当前消息、角色数量、估算 Token 和近期上下文 | 本地客户端 | safe |
| `/diff` | 当前项目 Git 分支与未提交文件 | GET `/api/git/status` | safe |
| `/trace <id>` | Trace 事件链 | GET `/api/reliability/traces` | safe |
| `/task <id>` | 任务状态、回执、门禁和日志 | GET `/api/tasks` 后本地精确筛选 | safe |
| `/agents` | Agent 执行器可用性与原生续跑能力 | GET `/api/orchestrator/resilience` | safe |
| `/checkpoint <execution>` | 为执行工作区创建 Git 检查点 | 受控 POST | guarded，执行前确认 |
| `/rollback <checkpoint>` | 恢复隔离 worktree 检查点 | 受控 POST | high，执行前确认 |
| `/logs [task]` | 群聊日志或任务近期日志 | 本地 GET | safe |
| `/knowledge <query>` | 本地 RAG 检索 | POST `/api/rag/query` | safe |
| `/files` | 共享文件列表 | 本地 GET | safe |
| `/cron` | 定时任务和调度器状态 | GET `/api/cron` | safe |
| `/soak` | 24 小时稳定性状态和报告 | GET `/api/reliability/soak/status` | safe |
| `/permissions` | 全局 Agent 管理能力与破坏性标记 | GET `/api/global-agent/capabilities` | safe |
| `/model` | 执行器、可用性和原生续跑能力 | GET `/api/orchestrator/resilience` | safe |
| `/export` | 导出当前上下文 JSON | 本地客户端下载 | safe |

## 执行分层

命令注册表现在明确区分五种动作：

1. `navigate`：只切换 CCM 页面。
2. `query`：读取现有 JSON API，显示“未调用模型”结果卡片。
3. `client`：新建会话、统计上下文、导出等浏览器本地动作。
4. `mutation`：检查点、回滚等状态变更；即使是 guarded 也必须确认。
5. `prompt`：只有确实需要 Agent 理解或规划时才交给模型。

查询命令不会被改写成自然语言再发给 Agent，因此不会出现“查一次状态却误创建任务”的问题。

## 安全边界

- endpoint 模板由内置注册表控制，自定义命令仍只允许 `prompt` 或 `navigate`，不能配置任意 HTTP 写入。
- `$ARGS`、`$PROJECT`、`$GROUP_ID` 等 URL 参数统一编码，避免路径和查询参数注入。
- `/clear`、`/rollback` 是 high 风险；`/checkpoint` 虽是 guarded mutation，也会在动作发生前确认。
- `/rollback` 默认 `allow_shared=false`，禁止自动回滚共享工作目录，只允许执行内核的隔离 worktree 检查点。
- 检查点和回滚继续写入任务 Trace；Slash 审计只记录是否带参数，不保存参数正文。
- 项目、群聊或会话缺失时，命令会显示不可用原因或返回明确错误。

## 结果卡片

`CommandResultCard.vue` 在三个聊天入口复用，固定展示：

- 命令名和“未调用模型”标记；
- 人类可读摘要；
- 关键指标；
- 最多 30 条结构化明细；
- 本地耗时和执行时间；
- 可展开但有长度上限的原始 JSON。

结果卡片不会被重新发送给模型。项目和群聊中的查询结果默认只保留在当前页面，避免把大量诊断 JSON 写入长期对话记忆；全局助手沿用现有本地会话保存机制。

## 新增后端入口

- `POST /api/tasks/execution/checkpoint`
- `POST /api/sessions/clear`

前者只接受已有 Execution ID，并从执行记录解析工作目录；后者只清空指定项目会话的消息，不删除会话身份。

## 验收范围

- 注册表自测覆盖本地 query 不调用模型、client 会话动作、mutation 权限、回滚风险、URL 编码和最长占位符优先。
- Coordinator 全套测试不能回归。
- 对生产服务执行命令发现、resolve、真实 query、缺参、上下文隔离、审计脱敏与受控 mutation 错误路径测试。
- 在三个真实页面执行 `/context`、`/diff` 或等价只读命令，确认统一结果卡片出现且浏览器无错误。

## 2026-06-30 验收记录

- `npm run check`：通过。
- `npm run test:coordinator`：通过；Slash Command 自测扩展为 16 项，新增 query/client/mutation、权限、URL 编码和占位符优先级检查。
- `npm run build`：前端、飞书 MCP、后端完整构建通过。
- 生产 API E2E：全局 34 条、项目 35 条命令；`/diff`、`/agents`、`/knowledge`、`/cron`、`/soak`、`/permissions` 均直接读取真实 API；知识库实测命中 1 条，执行器实测 5 个。
- `/trace` 已用真实 Trace 验证，并兼容后端标准字段 `trace_id` 及旧字段 `traceId`/`id`。
- 检查点不存在时返回 404，没有创建伪检查点；`/checkpoint` 的公开权限为 `manage`，动作类型为 `mutation`。
- 创建临时项目会话、写入 1 条消息、`/api/sessions/clear` 清空并删除临时会话的完整往返通过，没有遗留测试会话。
- 项目 Agent：执行 `/diff` 后出现本地结果卡片，显示“未调用模型”和真实变更数量。
- 全局助手：执行 `/context` 后出现消息统计和估算 Token；连续快速输入并按 Enter 时，用户消息数量不增加、结果卡片增加 1。
- 群聊主 Agent：执行 `/context` 后出现群聊 ID、成员、消息和估算 Token。
- `/checkpoint no-such-execution` 在请求发出前显示确认框，取消后没有副作用。
- 首轮页面测试发现“命令列表初次加载时立即 Enter 可能穿透为普通消息”的竞态；已改为先阻止默认发送、最多等待 3 秒加载候选，超时明确报错。修复后重复验证不再产生用户消息。
- 浏览器控制台错误：0；测试产生的临时全局会话已删除。
- 生产服务由隐藏 Node 进程 PID `10460` 监听 3080。
