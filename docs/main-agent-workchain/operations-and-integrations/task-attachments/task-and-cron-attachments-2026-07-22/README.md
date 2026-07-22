# 任务派发与定时任务附件闭环

## 目标

任务派发和定时任务创建/编辑现在都支持图片与附件。附件不是只保存文件名，而是进入统一的需求资料解析链，并成为群聊主 Agent 或项目 Agent 的真实模型可见任务上下文。

## 用户流程

### 普通任务派发

1. 用户打开“任务派发 -> 新建任务”。
2. 可通过选择文件、拖放，或在弹窗内粘贴图片/文件添加附件。
3. 提交时前端使用 `multipart/form-data`，文本任务数据保存在 `payload` 字段，文件使用 `files` 字段。
4. 后端保存原文件、校验安全限制并解析正文；图片由已配置的群聊主 Agent 视觉模型识别，文本、PDF 和 Office 文件使用现有资料解析器。
5. 附件元数据写入任务 `source_attachments`，逐附件解析上下文写入 `source_attachment_contexts`，合并后的 Agent 上下文写入 `source_attachment_context`。
6. 群聊任务由群聊主 Agent 读取任务附件上下文后拆分；项目直派任务把同一附件上下文写入第三方项目 Agent 的最终工作单。

### 业务开发任务

1. “任务派发 -> 新建任务 -> 业务开发任务”使用相同的附件选择器，支持选择、拖放和弹窗内直接粘贴。
2. 附件会参与需求质量判断，可作为业务/接口文档来源。
3. `/api/tasks/create-daily-dev` 同时兼容 JSON 和 multipart；multipart 的 `payload` 保存表单数据，`files` 保存原文件。
4. 解析结果写入 `daily_dev` 任务的正式附件字段，并通过任务级资料上下文交给当前精确群聊的主 Agent。
5. 开启“写入群聊需求池”时，解析后的附件上下文也写入该需求池条目，后续主 Agent 或定时任务重新认领时仍能读取需求依据。

### 定时任务

1. 用户在“定时任务 -> 新建/编辑”中以相同方式管理附件。
2. 附件归属于定时任务配置，可保留、增加或移除。
3. 每次触发时，`buildTaskFromCronJob()` 深拷贝当时的附件清单和上下文到新任务。
4. 后续编辑定时任务不会改变已经创建的运行任务，实现运行级不可变附件快照。
5. 群聊目标进入群聊主 Agent 上下文；项目目标直接进入项目 Agent 工作单。

## 数据结构

任务和定时任务统一使用以下字段：

- `source_attachments`：附件 ID、名称、类型、大小、受控路径、checksum、解析器、可读状态和错误。
- `source_attachment_contexts`：按附件 ID 保存的模型可见上下文块，用于精确保留或移除附件。
- `source_attachment_context`：当前附件上下文块的合并结果。
- `source_attachment_warnings`：未读取、格式不支持、视觉模型不可用等真实警告。

原文件仍是事实来源。解析失败时，上下文明确标记“未读取正文”并保留受控本地路径，Agent 不得根据文件名猜测内容。

## 兼容性与安全

- `/api/tasks/create`、`/api/tasks/update`、`/api/cron/create`、`/api/cron/update` 同时支持旧 JSON 与新的 multipart 请求。
- 每个任务最多 10 个附件，单文件最多 25 MB，总上传最多 60 MB。
- 拒绝脚本和可执行文件扩展名。
- 所有上传路径必须位于 CCM 受控上传目录。
- PNG、JPEG、GIF、WebP 和 BMP 校验文件签名，拒绝伪装图片。
- 保存 SHA-256 checksum，供后续核验附件是否变化。
- 原文件解析失败不会伪装为成功，也不会只把文件名当作模型已读取内容。

## 执行注入

群聊主 Agent 使用 `buildTaskSourceDocumentsContext()` 接收任务业务资料和附件上下文。项目 Agent 使用 `buildChildAgentTaskText()` 接收同一正式上下文；普通项目直派和 `daily_dev` 都覆盖，不再只支持特定工作流。

定时任务触发记录 `attachment_snapshot`，包含附件数量、附件 ID 和快照时间。创建出的任务持有独立数组和上下文字符串，因此后续配置更新不会覆盖已触发运行。

## 验证证据

已完成以下验证，全部使用本地或 mock 数据，付费 Provider 调用为 0：

- `npm run build`：frontend、MCP Feishu、backend production build 通过。
- `node scripts/task-attachments-production-selftest.mjs`：文本解析、checksum、项目 Agent 注入、定时快照、移除全部附件、伪图片拒绝通过。
- `node scripts/task-dispatch-selftest.mjs`：任务派发结构回归通过。
- `node scripts/cron-run-history-selftest.mjs`：定时运行历史和时区回归通过。
- `node scripts/project-management-production-selftest.mjs`：项目管理生产回归通过。
- `node scripts/cron-run-history-render-regression.mjs`：真实本地 API、旧 JSON 兼容、multipart 上传、登录后桌面/移动端页面回归通过。
- 真实 API 额外验证 `/api/tasks/create-daily-dev` 上传附件后，`workflow_type=daily_dev`、附件可读且主 Agent 上下文包含附件正文。

浏览器证据：

- `docs/main-agent-workchain/operations-and-integrations/scheduling/evidence/cron-reliability-v2/04-attachment-form-desktop.png`
- `docs/main-agent-workchain/operations-and-integrations/scheduling/evidence/cron-reliability-v2/05-task-attachment-form-desktop.png`
- `docs/main-agent-workchain/operations-and-integrations/scheduling/evidence/cron-reliability-v2/06-daily-dev-attachment-form-desktop.png`

## 关键文件

- `backend/system/task-attachments.ts`
- `backend/modules/collaboration/collaboration-routes-part-02-part-02.ts`
- `backend/modules/collaboration/collaboration-routes-part-03.ts`
- `backend/modules/collaboration/collaboration-runtime-plan-tools-part-02.ts`
- `backend/modules/collaboration/collaboration-runtime-task-queue-part-02.ts`
- `backend/modules/scheduling/cron-job-store.ts`
- `backend/modules/scheduling/cron-part-01.ts`
- `backend/modules/scheduling/cron-part-02.ts`
- `frontend/src/components/common/TaskAttachmentPicker.vue`
- `frontend/src/components/tasks/TaskManager.template.html`
- `frontend/src/components/tools/CronJobs.template.html`
