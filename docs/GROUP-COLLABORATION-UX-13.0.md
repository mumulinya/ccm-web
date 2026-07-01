# CCM 群聊协作体验 13.0

## 目标

把群聊主 Agent 与多个项目 Agent 的内部编排，收敛为类似 Codex/Cursor 的单任务 AI 编程体验：用户只需要描述目标、查看一个持续更新的任务卡，并在完成后查看改动或继续操作。调度协议、回执、Trace、原生会话和恢复过程仍保留用于审计，但默认不进入用户正文。

## 用户交互约定

1. 普通问答继续直接回答，不因为出现项目名或“知识库”等词就创建任务。
2. 项目任务先用一句自然语言确认理解，并说明预计涉及的项目。
3. 一个任务在群聊里只显示一张持续更新的卡片。阶段统一为：正在分析、准备开始、正在修改、正在运行测试、正在修复问题、需要你确认、正在恢复、已完成、已取消、已安全撤销。
4. 多 Agent 默认作为一个整体任务呈现。子 Agent 仅显示用户可理解的角色进度，例如“前端正在处理”“后端工作已完成”。
5. `CCM_AGENT_RECEIPT`、任务通知、Agent 问答、冲突计划、沙盘演练、Trace、session、scratchpad 和门禁信息默认隐藏；需要排障时从“技术详情”展开。
6. 完成报告固定为：完成内容、变更文件、验证结果、风险与待确认。
7. 用户操作固定为：查看改动、追加要求/继续修改、停止、重新执行、安全撤销；按钮随任务状态出现。
8. 用户追加要求时，主 Agent 区分补充要求、修改目标和独立新任务。补充或改目标沿用原 Task、Trace 和项目 Agent 会话；明显的新任务不会混入当前任务。
9. 执行器失败、普通返工、native session 恢复和执行器切换优先在后台完成。只有业务选择、高风险动作或所有执行器不可用时才打断用户。

## 实现摘要

- `backend/modules/collaboration.ts`
  - 新增统一用户任务卡模型、自然阶段、角色化进度、精简交付与用户操作。
  - 新增追加要求分类和运行中 deferred follow-up；当前执行轮结束后，使用相同 Task/Trace 重新入队，不重复建任务。
  - 群聊持久任务模式可自动把“再加、补充、改成、继续”等消息关联到最近任务。
  - 新增任务级安全撤销接口 `POST /api/tasks/rollback`，按检查点逆序恢复全部任务执行改动。
  - 新任务识别通过 `new_task_suggested` 返回，不污染旧任务。
  - 精简用户报告；结构化文件对象使用文件格式化器，避免出现 `[object Object]`。
  - 新增 `group-collaboration-ux` 诊断自检，并更新协作协议自检，使“协议留在内部”成为回归约束。
- `backend/task-agent-sessions.ts`
  - 完成任务再次继续时可重新打开最近关闭的项目 Agent 会话，并保留 native session ID 与轮次。
- `frontend/src/components/GroupChat.vue`
  - 同一任务只渲染一张任务卡，任务相关内部消息不再逐条铺满群聊。
  - 技术详情默认折叠；提供查看改动、追加要求、停止、重试和安全撤销入口。
  - 已安全撤销具有独立终态和文案。

## 真实 E2E 证据

测试群：`Agent 协作 E2E 实验室`（`gmr02wpbv`）。

### 成功交付与运行中追加

- Task：`mr1suuh9d7kz`
- Trace：`group_mr1suual_ecc5b5127435`
- 初始目标：创建 `frontend/ux-13-e2e.md` 并运行 `npm test`、`npm run check`。
- 执行中追加：“再补充一行：执行中追加要求已复用原任务。”
- 接口返回 `deferred: true`、`same_task_trace: true`、`continuation_kind: supplement`。
- `followup_revision=1`、`consumed_followup_revision=1`，没有创建第二个任务。
- Cursor 项目会话与恢复后的执行轮保留在同一任务证据链中。
- 最终捕获 2 个实际文件变更、9 条验证记录，验收门禁通过；报告仅保留四个用户段落。

### 失败恢复

- 同一任务实际经历 Codex、Claude、Cursor 执行通道切换。
- 失败切换在后台完成，最终由可用执行器继续现有工作区和任务会话并交付；用户无需重新描述任务。

### 修改目标与新任务识别

- Task：`mr22r36srdii`
- “目标调整为只验证取消流程”返回 `continuation_kind: revise_goal`，沿用原 Trace。
- “这是一个新任务：部署测试环境”返回 `new_task_suggested: true`、`continuation_kind: new_task`，未混入旧任务。

### 取消与重试

- 取消后任务进入 `cancelled`，不会继续执行。
- 对同一 Task 调用重试后状态回到 `pending`，`retry_count=1`，Task ID 与 Trace 不变。
- 相同幂等键的第二次重试返回 `duplicate: true`，不会重复入队。

### 安全撤销

- 对已完成 Task `mr1suuh9d7kz` 调用任务级撤销。
- 系统按逆序恢复 2 个执行检查点，两个回滚结果均为 `success: true`。
- `frontend/ux-13-e2e.md` 和 `shared/ux-13-e2e-backend-verification.md` 在撤销前存在、撤销后均不存在。
- 任务保存 `rolled_back_at`、撤销原因和检查点结果；用户卡片显示“已安全撤销”。

## 验证记录

- `npm run check`：通过。
- `npm run build:backend`：通过。
- `npm run build:frontend`：通过。
- `npm run test:coordinator`：通过；覆盖协调协议、任务会话、原生续跑、执行内核回滚、故障恢复、生命周期与本轮用户体验约束。
- `/api/orchestrator/diagnostics` 中 `group-collaboration-ux`：`status=ok`，任务卡、精简报告、协议隐藏、追加分类、干净标点和结构化文件输出检查全部通过。
- 浏览器真实页面：群聊卡片展示自然阶段、总体进度、前端/后端角色进度、文件/检查数量和“查看改动/追加要求/停止”等操作；“技术详情”默认折叠，正文未暴露回执、Trace 或 session。

## 后续方向

13.0 已完成群聊协作的用户层收敛。后续增强应优先基于真实使用反馈调整卡片信息密度和失败提示，不再把内部协议重新铺回群聊正文；复杂诊断继续放在技术详情、任务管理页和 Trace 中。
