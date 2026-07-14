# Work Item Dependency Summary V1

日期：2026-07-08

## 背景

参考 `D:\claude-code\docs\tools\task-management.mdx` 里的 Tasks V2 设计，CC 的任务系统会通过 `blockedBy`、`blocks` 和认领状态让团队按拓扑顺序推进。当前项目已经有执行队列、`blockedBy` 和“下一步可派发”，但用户主文本还缺少一句清楚解释：为什么某个子 Agent 还在等、哪个前置任务完成后它才会解锁。

## 本次升级

- 后端 `buildMainAgentWorkItemSummary(...)` 增加 `dependency_summary`：
  - schema: `ccm-main-agent-work-item-dependency-summary-v1`
  - 说明哪些工作项等待前置任务；
  - 说明哪些工作项的前置依赖已经完成，可以派发；
  - 保留 `blockedBy` 原始结构在技术数据里，不把字段名暴露给用户主文本。
- 前端任务卡在“执行队列”内展示“依赖与派发”摘要：
  - 例如：`web 的前置依赖已完成，可以进入下一步`
  - 例如：`web 等待 api 完成后继续`
- 普通问话不生成执行队列，因此不会显示这块。
- “下一步可派发”按钮继续复用原有 `continue_work_item` action，不改动派发协议。

## 用户可见边界

用户主文本能看到：

- “依赖与派发”
- “还有 N 个工作项需要等前置任务完成”
- “N 个工作项已经解锁，可以继续派发”

用户主文本不展示：

- `blockedBy`
- `blocks`
- 原始 work item JSON
- trace/session/run 等技术字段

## 验证

- 静态自测新增 `taskCardRendersWorkItemDependencySummary`。
- 渲染回归新增 `case-work-item-next` 断言：
  - 显示“依赖与派发”
  - 显示“web 的前置依赖已完成”
  - 不显示 `blockedBy`
