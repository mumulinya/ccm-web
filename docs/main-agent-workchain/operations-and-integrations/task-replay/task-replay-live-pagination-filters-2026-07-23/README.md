# 任务回放实时化、分页与分类筛选

日期：2026-07-23

## 目标

解决任务多、单个任务事件多以及运行中回放不能及时更新的问题，同时保持已有任务卡跳转、旧 Trace 兼容、证据预览和逐行代码变更能力不变。

## 当前业务流程

1. 任务列表只向服务端请求当前页，每页 24 条。
2. 搜索、项目、群聊、状态和时间范围由服务端过滤，返回真实总数及可用筛选项。
3. 打开任务时默认读取最近 120 条模型外部执行记录，而不是一次下载完整时间线。
4. 用户点击“加载更早记录”时按完整时间顺序向前分页，并按事件 ID 去重合并。
5. 阶段、参与者、状态、父子任务、关键词和快捷分类均由服务端在完整事件集合上筛选，再返回当前窗口。
6. 页面复用统一 `/api/runtime/events` SSE。当前任务或其子任务变化时，使用最后事件的时间与 ID 游标增量读取。
7. SSE 断线或漏事件时保留 60 秒低频兜底刷新，不新增轮询通道。

## API

### 任务索引

`GET /api/tasks/replay`

新增兼容参数：

- `page`、`limit`
- `q`
- `project`
- `group_id`
- `status`
- `date_from`、`date_to`

响应新增 `total_all`、分页状态及 `facets.projects/groups/statuses`。

### 事件窗口

`GET /api/tasks/replay?task_id=<id>`

新增兼容参数：

- `event_limit`、`event_offset`、`event_tail`
- `after_event_at`、`after_event_id`
- `stage`、`event_status`、`actor`、`event_task_id`
- `event_query`、`preset`、`include_system_events`

响应新增 `event_page`，包含总量、偏移、前后页状态和首尾增量游标。旧调用不传分页参数时仍返回完整事件，避免破坏既有集成。

## 实时更新

- 只订阅现有统一运行事件总线的 `task` 与 `agent` topic。
- 具有精确 `taskId` 的事件只刷新当前父子任务链。
- 批量任务变更会触发防抖刷新。
- 浏览器只保留一个共享 EventSource；任务回放不会创建第二条 SSE。
- 增量结果按事件 ID 合并，连续超过 200 条时继续拉取下一段。

## 性能与一致性

- 默认页面负载由“完整任务全部事件”下降为最多 120 条事件。
- 服务端摘要、阶段计数、问题数和证据数始终按完整事件计算，不使用当前页冒充总量。
- 筛选发生在完整服务端事件集合上，不会漏掉尚未加载的历史问题。
- 原始任务、回放日志和 TestAgent 证据的保留策略没有变化。

## 验证

- `npm run check`：通过。
- `npm run build:frontend`、`npm run build:backend`：通过。
- `node scripts/task-replay-selftest.mjs`：通过；覆盖尾页、向前分页、增量游标、问题筛选、任务索引分页和项目/群聊/状态组合筛选。
- `node scripts/task-replay-render-regression.mjs`：通过；6 张 Playwright 截图，覆盖 SSE 增量、筛选工作区、证据、逐行 Diff 和 390px 移动端。
- 自动化测试没有调用付费 Provider。

## 视觉证据

- [桌面任务回放](evidence/desktop-live-replay.png)
- [任务分类筛选](evidence/desktop-filter-index.png)
- [移动端任务回放](evidence/mobile-replay.png)
