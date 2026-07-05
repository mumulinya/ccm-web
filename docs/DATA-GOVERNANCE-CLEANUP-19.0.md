# 数据治理与清理中心 19.0

## 目标

让用户能删除以前派发的任务、项目运行记录和聊天会话数据，并明确区分“删除/归档”和“永久清除”。

## 当前能力

### 任务

- `POST /api/tasks/delete`
  - 将任务移入归档。
  - 停止自动执行，释放队列/租约。
- `POST /api/tasks/purge`
  - 永久清除归档任务。
  - 级联清理 task agent sessions 和 execution artifacts。
- `POST /api/tasks/bulk`
  - 支持批量 `archive / restore / purge / pause / resume / cancel`。

### 定时任务

- `POST /api/cron/delete`
  - 停止并归档定时任务。
- `POST /api/cron/purge`
  - 永久清除归档定时任务。
- `POST /api/cron/bulk`
  - 支持批量归档、恢复和永久清除。

### 项目聊天 Project Run

新增：

- `POST /api/project-runs/delete`
  - 将项目聊天执行记录标记为归档/删除。
  - 如果 run 仍在运行，会先终止子进程并转为取消状态。
- `POST /api/project-runs/purge`
  - 从 `project-chat-runs.json` 中移除执行记录。
  - 级联清理对应 task agent sessions 和 execution artifacts。

前端：

- 项目聊天任务卡新增：
  - `删除记录`
  - `永久清除`
- 删除后会从当前项目会话消息里移除对应任务卡。

### 群聊

已有：

- `POST /api/groups/delete`
  - 删除群聊。
  - 同步删除群聊消息文件和群聊记忆文件。

新增：

- `POST /api/groups/messages/clear`
  - 只清空群聊消息，不删除群聊本身。
  - 支持 `clear_memory: true` 同时清空压缩记忆。

前端：

- 群聊顶部新增 `清空聊天`。

### 项目会话

已有：

- `POST /api/sessions/clear`
  - 清空项目会话消息。
- `POST /api/sessions/delete`
  - 删除项目会话文件，并同步移除 CC 会话索引中的引用。

项目聊天任务卡删除时，会调用单条消息删除 API 精确移除当前任务卡消息。

新增优化：

- `POST /api/sessions/message/delete`
  - 支持按 `id / task_id / timestamp / index` 删除单条会话消息。
- `POST /api/sessions/messages/replace`
  - 支持安全替换整个会话消息列表，用于后续批量整理。
- `POST /api/sessions/message`
  - 保存消息时保留任务卡相关安全字段：`taskExperience / fileChanges / workEvents / task_id / requestText` 等。

项目聊天任务卡删除不再依赖“清空后重写”。

### 全局 Agent 会话

已有：

- 全局 Agent 页面可删除单个会话。
- 可清空所有全局 Agent 会话。
- 前端会同步 `/api/global-agent/history`。

注意：当前全局 Agent 会话删除主要清聊天历史，不自动级联清除所有关联任务/trace/run。高风险级联删除应另做确认。

## 安全策略

- 默认“删除”是归档/隐藏，不立即物理删除。
- “永久清除”需要二次确认，并清理关联执行产物。
- 运行中的 project run 执行删除时会先终止子进程。
- 群聊支持“只清消息”和“消息+记忆”两级清理。

## 后续建议

## 清理中心页面

新增页面：`清理中心`。

后端 API：

- `GET /api/cleanup/summary`
  - 汇总任务、定时任务、项目运行、项目会话、群聊消息、全局 Agent 会话和执行产物数量。
- `POST /api/cleanup/preview`
  - 输入 `{ action }`，返回影响数量、风险等级、是否不可撤销。
- `POST /api/cleanup/run`
  - 输入 `{ action, confirm: true }`，执行清理动作。

当前清理中心支持的动作：

- `archive_failed_project_runs`
  - 归档失败项目运行。
- `purge_archived_project_runs`
  - 永久清除已归档项目运行，并级联清理 session/execution artifacts。
- `purge_archived_tasks`
  - 永久清除已归档任务，并级联清理 task agent sessions 和 execution artifacts。
- `purge_archived_cron`
  - 永久清除已归档定时任务。

## 后续建议

- 给清理中心增加更细粒度筛选：7 天前、失败任务、已完成任务、指定项目、指定群聊。
- 给永久清除增加更详细 dry-run 文件列表。
- 支持导出清理报告。
