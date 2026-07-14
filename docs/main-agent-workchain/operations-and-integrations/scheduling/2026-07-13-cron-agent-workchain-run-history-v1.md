# 定时任务与主 Agent 执行链运行记录闭环 v1

日期：2026-07-13

## 目标

让定时任务页面不仅能配置和触发任务，还能查看每次触发后的完整业务进度：任务创建、群聊主 Agent Todo、项目子 Agent 执行、TestAgent 验收、截图证据和最终回放。

## 已实现

- 每次手动或计划触发都会持久化独立 `run_history` 记录，默认保留最近 40 次。
- 单任务、批量需求和交付缺口续跑均绑定到本次运行，不再只依赖 `last_task_id`。
- 批量运行按整批任务状态聚合：失败优先；仍有执行中、等待或排队任务时不会提前显示完成。
- 旧定时任务会从最后一次运行信息生成兼容历史记录，升级后仍可查看原有结果。
- `/api/cron` 返回轻量用户摘要，包括任务状态、Todo、群聊主 Agent 进展、TestAgent 结论、截图数和证据数，不暴露本机路径或内部协议。
- 定时任务页面新增“运行记录”抽屉，最新一轮默认展开，历史轮次按时间倒序显示。
- 每个关联任务可直接进入任务详情或完整回放；“查看验证证据”会以 TestAgent 筛选打开回放。
- 技术标识和精确时间默认收在折叠的“技术详情”中。
- 没有持久化 Todo 的旧任务会根据真实任务状态、主 Agent 交付状态和 TestAgent 结论生成兼容进度，不影响普通聊天展示逻辑。

## 状态模型

每条运行记录包含：

- `trigger`：手动、计划或历史兼容记录。
- `status`：触发中、排队、执行中、等待、完成、失败、跳过或取消。
- `task_ids` / `primary_task_id`：本轮关联任务。
- `task_states`：每个任务在本轮中的状态、结果和更新时间。
- `meta`：共享文档导入、需求认领和缺口续跑摘要。
- `started_at` / `dispatched_at` / `completed_at`：运行关键时间点。

任务状态回写会先更新对应运行批次，再同步定时任务列表中的最后状态。`cron_run_id` 同时写入任务与 `workflow_meta`，历史任务则按最近包含该任务的运行记录兼容匹配。

## 用户界面

运行记录抽屉只展示用户需要判断进度的信息：

- 本轮何时触发、当前状态、关联多少任务。
- Todo 已完成数量和当前步骤。
- 群聊主 Agent 当前复盘或验收摘要。
- TestAgent 结论、验证次数、截图数和证据数。
- 任务详情、完整回放和验证证据入口。

逐行代码变更、原始执行事件、TestAgent 截图大图和技术字段继续由现有任务回放页面统一承载。

## 验证

- `npm run check`：通过。
- `npm run build:backend`：通过。
- `npm --prefix frontend run build`：通过。
- `node scripts/cron-run-history-selftest.mjs`：通过批量状态、失败优先、等待状态、旧记录兼容和 40 条保留上限检查。
- `node scripts/cron-run-history-api-selftest.mjs`：在隔离用户目录启动真实 HTTP 服务，验证 `/api/cron` 的 Todo、TestAgent 截图/证据摘要和路径脱敏。
- `npm run test:cron-run-history-render`：真实浏览器桌面和手机回归通过，断言技术详情默认折叠及 TestAgent 回放导航。

截图：

- `scratch/cron-run-history-regression/01-cron-run-history-desktop.png`
- `scratch/cron-run-history-regression/02-cron-todo-expanded-desktop.png`
- `scratch/cron-run-history-regression/03-cron-run-history-mobile.png`

## 主要文件

- `backend/modules/scheduling/cron-job-store.ts`
- `backend/modules/scheduling/cron.ts`
- `frontend/src/components/tools/CronJobs.vue`
- `frontend/src/components/tools/CronRunHistoryDrawer.vue`
- `frontend/src/components/system/TraceReplay.vue`
- `frontend/src/App.vue`
- `scripts/cron-run-history-selftest.mjs`
- `scripts/cron-run-history-api-selftest.mjs`
- `scripts/cron-run-history-render-regression.mjs`
