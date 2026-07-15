# 聊天体验统一 14.0

目标：把群聊协作、项目管理聊天、全局 Agent 三个入口的“AI 编程任务体验”统一成用户能看懂的一张任务卡，同时保留各自职责差异。

## 这次完成的内容

### 1. 统一任务卡组件

新增 `frontend/src/components/TaskExperienceCard.vue`，作为三个入口共用的任务展示组件。

统一展示：

- 任务标题、目标、自然语言阶段和进度。
- 正在工作的 Agent。
- 已完成事项、阻塞/风险、下一步。
- 交付摘要、改动文件数量、验证数量。
- 用户动作：查看改动、继续修改、停止、重新执行、安全撤销。
- 技术详情折叠展示，默认不打扰用户。

默认隐藏的信息：

- receipt 原始结构。
- Trace ID。
- native session / run ID。
- scratchpad、门禁、模型调用、工具调用等内部协议细节。

这些信息仍保留在 `card.technical`，需要排障时可以展开。

### 2. 统一 card 数据契约

新增 `frontend/src/utils/taskExperience.js`，负责把不同入口的运行数据适配成统一结构：

- `globalMissionTaskCard(message)`：全局跨项目任务。
- `globalAgentRunTaskCard(message)`：全局 Agent 单次 agentic run。
- `projectExecutionTaskCard(message, project)`：项目管理聊天里的项目 Agent 执行。
- `taskPhasePresentation(status)`：把内部状态转换成用户可读阶段。

普通问答不会强行显示任务卡：

- 全局 Agent 普通问答：无工具调用、无 mission 的 conversation/question/analysis 直接显示文本。
- 项目聊天普通问答：结束后没有文件改动、失败或明确 `requires_card` 时，直接显示文本。

### 3. 群聊入口

`frontend/src/components/TaskCollaborationCard.vue` 已改成 `TaskExperienceCard` 的轻包装：

- 群聊继续显示“AI 编程任务”。
- 多 Agent 状态、完成项、阻塞、交付仍从原有协作 runtime/card 输入。
- 内部协议折叠到技术详情。

### 4. 项目管理聊天入口

`frontend/src/components/ProjectManager.vue` 已接入统一任务卡：

- 项目 Agent 流式执行时显示“项目 Agent 任务”卡。
- 普通问答结束后不保留任务卡。
- 改动文件和工作事件在有任务卡时默认折叠，不再刷屏。
- 支持动作映射：
  - 查看改动：打开首个变更文件 diff。
  - 继续修改：把用户补充要求作为新一轮项目聊天发送。
  - 停止：`/api/project-runs/cancel` 或 `/api/tasks/cancel`。
  - 重新执行：项目直连 run 复用原请求重新发送；正式 task 走 `/api/tasks/retry`。
  - 安全撤销：`/api/project-runs/rollback` 或 `/api/tasks/rollback`。

后端 `backend/server.ts` 为项目直连聊天补了临时运行身份：

- `pchat_*` run id。
- `project_chat_*` trace id。
- 执行前 checkpoint。
- `project-chat-runs.json` 持久化 run 元数据。
- 继续修改/重新执行时记录 `parent_run_id`，让后续执行能追溯上一轮。
- 项目直连聊天接入 `task-agent-sessions`；后续 `pchat_*` 会复用同一 `task_agent_session_id`，并把 Claude/Codex/Cursor 的 native session 参数传给底层执行器。
- SSE `task_runtime` 事件。
- `/api/project-runs/get`。
- `/api/project-runs/cancel`。
- `/api/project-runs/rollback`。
- `/api/project-runs/self-test`。

### 5. 全局 Agent 入口

`frontend/src/components/GlobalAgent.vue` 已接入统一任务卡：

- 全局 mission 显示为“跨项目 AI 任务”卡。
- agentic run 如果是任务型运行，显示统一任务卡。
- 普通问答仍直接显示文本。
- 原来外露的步骤数、模型调用数、工具调用数、决策置信度等内部信息不再默认展示。
- 按钮优先复用已有 run 控制：
  - 确认/取消确认。
  - 停止。
  - 恢复/继续。
  - 重新执行。
  - 查看改动。
- 纯 mission 卡直接接入 `/api/global-agent/supervisors/control`：
  - 取消：`operation=cancel`。
  - 恢复/重试：`operation=resume`。
  - 非终态继续补充要求：`operation=update_goal`。
- 全局任务卡阶段优先参考 supervisor 状态；暂停、等待用户、人工接管会显示为需要用户处理，并提供恢复按钮。

已完成的全局任务继续修改会作为新输入发起，避免修改已终态的 supervisor 记录。

## 当前交互约定

三个入口的用户心智保持一致：

| 入口 | 用户看到的角色 | 默认展示 |
| --- | --- | --- |
| 群聊协作 | 多 Agent 协调任务 | 一张持续更新的 AI 编程任务卡 |
| 项目管理聊天 | 单项目 Agent | 一张项目 Agent 执行卡 |
| 全局 Agent | 跨项目监工/路由 | 一张跨项目 AI 任务卡 |

任务卡只回答用户关心的四件事：

1. 正在做什么。
2. 做到哪一步。
3. 改了什么、验证了什么。
4. 用户现在能点什么。

内部实现细节不再作为主内容刷给用户。

## 已验证项

新增轻量自测脚本：

```powershell
node scripts/unified-chat-task-experience-selftest.mjs
```

覆盖：

- 全局普通问答不显示任务卡。
- 全局 mission 可转换为统一任务卡。
- mission 的技术身份只保留在折叠 technical 字段。
- 全局 mission 运行中提供取消动作；暂停时显示恢复动作。
- 项目普通问答不显示任务卡。
- 项目执行任务有查看改动、继续、安全撤销等动作。
- 内部状态可转换成自然语言阶段。

新增三入口体验 E2E 合同测试：

```powershell
npm run test:chat-experience
```

覆盖：

- 群聊协作：多 Agent 整体任务卡、继续/取消/重试/撤销路由合同、协议细节默认隐藏。
- 项目管理聊天：普通问答直接文本、单项目执行卡、`parent_run_id + task_agent_session_id` 连续性、安全撤销路由。
- 全局 Agent：普通问答直接文本、跨项目 mission 卡、supervisor control 路由、写操作确认按钮。
- 三入口都不在默认可见内容中暴露 receipt、Trace、session、scratchpad、门禁、模型/工具调用等协议词。

项目直连 run 自测：

```powershell
Invoke-RestMethod -Uri 'http://localhost:3080/api/project-runs/self-test'
```

覆盖：

- 项目聊天 run 有稳定 id。
- run 有 trace。
- 执行前生成 checkpoint。
- run 元数据会持久化。
- 第二轮项目聊天会复用第一轮的 task-agent-session。
- 安全撤销能恢复文件内容。

全局 mission supervisor 自测：

```powershell
Invoke-RestMethod -Uri 'http://localhost:3080/api/global-agent/supervisors/self-test'
```

覆盖：

- supervisor 暂停/恢复控制。
- restart reload 后仍保留 supervisor 身份。
- 最终验收门禁完成后才生成交付报告。

## 目标完成审计矩阵

| 目标项 | 当前实现 | 验证证据 |
| --- | --- | --- |
| 1. 可复用任务卡与统一数据契约 | `TaskExperienceCard.vue` 作为统一组件；`taskExperience.js` 提供 global/project 适配器；群聊通过 `TaskCollaborationCard.vue` 兼容旧入口。 | `npm run test:chat-experience`；前端构建通过。 |
| 2. 三入口分别呈现 group/project/global 任务卡 | 群聊卡为 `context=group`，项目聊天为 `context=project`，全局任务为 `context=global`；E2E 合同固定三种职责差异。 | `scripts/unified-chat-task-experience-e2e.mjs` 的 `roleSeparationPreserved`、`groupCardNaturalAndMultiAgent`、`projectCardSingleProject`、`globalMissionCrossProject`。 |
| 3. 自然语言阶段、精简进度、隐藏内部协议 | `taskPhasePresentation()` 统一阶段；`TaskExperienceCard` 默认只显示用户向摘要，技术字段放入折叠 `<details>`。 | `globalMissionTechnicalCollapsedDataOnly`、`groupCardHidesProtocolByDefault`、`projectCardHidesProtocolByDefault`、`globalMissionHidesProtocolByDefault`、`noProtocolTermsAcrossVisibleCards`。 |
| 4. 查看改动、继续、停止/取消、重试、撤销动作 | 群聊动作映射到 `/api/tasks/*`；项目动作映射到 `/api/project-runs/*` 或 `/api/tasks/*`；全局 mission 映射到 `/api/global-agent/supervisors/control`；全局 run 确认映射到 `/api/global-agent/runs/confirm`。 | `groupCardActionsMapped`、`projectCardActionsMapped`、`globalMissionActionsMapped`、`globalConfirmationActions`。 |
| 5. 普通问答直接对话 | 全局普通 question/conversation/analysis 且无工具调用时不生成任务卡；项目聊天完成后无文件变更/失败/强制卡时不保留任务卡。 | `globalOrdinaryQuestionStaysDirect`、`projectOrdinaryQuestionStaysDirect`、`globalQaDirect`、`projectQaDirect`。 |
| 6. 同一任务复用 Task/Trace/native session | 项目直连 `pchat_*` 持久化 run 元数据、trace、checkpoint；继续/重试传 `parent_run_id`；项目直连接入 `task-agent-sessions` 并复用 `task_agent_session_id/native_session_id`。群聊正式任务继续复用原 task pipeline；全局 mission control 复用 supervisor/mission。 | `/api/project-runs/self-test` 的 `continuationReusesTaskAgentSession=true`；`taskAgentSession` smoke；`globalMissionSupervisorAsyncE2E`；`projectCardIdentityContinuation`。 |
| 7. 保留三种职责差异 | 全局 Agent 只做跨项目监工/路由；群聊主 Agent 展示多 Agent 编排；项目 Agent 展示单项目执行。 | `roleSeparationPreserved`；浏览器检查群聊任务卡 `context-group`；全局普通欢迎无任务卡。 |
| 8. 三入口 E2E 与文档记录 | 新增 `npm run test:chat-experience`；继续保留项目 run/self-test、全局 supervisor/self-test、coordinator smoke；本文档记录实现、交互约定、验证证据。 | `npm run test:chat-experience`、`npm run test:coordinator`、`/api/project-runs/self-test`、`/api/global-agent/supervisors/self-test`。 |

## 仍需继续增强的地方

这些不是这次 UI 统一的阻塞项，但关系到“像 Codex/Cursor 一样稳定可用”：

1. 项目直连 `pchat_*` run 已持久化元数据和 checkpoint id；但正在运行的子进程本身无法跨服务重启恢复，重启后的取消只能更新 run 状态，不能杀掉已不存在的进程句柄。
2. 项目聊天已接入 `task-agent-sessions`，但正在运行的子进程本身仍无法跨服务重启恢复。
3. 普通问答是否临时显示项目任务卡，现在依赖执行结果判断；如果要完全不闪卡，需要在发送前增加轻量语义预判。
4. 还需要真实浏览器 E2E：群聊、项目聊天、全局 Agent 三个入口各跑一条“问答 + 执行 + 继续 + 取消/撤销”的完整路径。

## 下一步建议

优先补“任务身份持久化 + native session 续跑”：

- 把项目直连聊天从临时 `pchat_*` 升级为可持久恢复的 run。
- 继续补强项目聊天在服务重启后的运行中恢复能力。
- 让全局 mission control 在前端提供更完整的暂停/人工接管入口。

这样统一任务卡不只是看起来一致，底层执行身份也会真正一致。
