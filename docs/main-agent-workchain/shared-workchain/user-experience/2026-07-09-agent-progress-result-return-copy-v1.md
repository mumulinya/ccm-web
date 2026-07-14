# 执行成员进展回传文案 v1

日期：2026-07-09

## 背景

任务卡里的“执行成员进展”和全局状态回看会展示下游执行成员的状态。这里的 `done/completed` 表示执行成员已经回传结果或阶段性输出，不代表整项用户需求已经完成。

此前部分路径仍会显示“已完成”“已完成：web”“项目工作已完成”，容易让用户把成员级回传误解成主 Agent 已完成最终验收。

## 改动

- `frontend/src/components/tasks/TaskExperienceCard.vue`
  - 执行成员进展行的 `completed/done/succeeded` 状态改为“已回传结果”。
  - 旧数据自带 `status_label: "已完成"` 时，展示层会映射成“已回传结果”。
  - 旧结果证据 `结果：已完成` 会映射成“结果：已回传结果”。
  - 执行队列旧的 `已完成 xxx` 当前动作会展示为“已处理：xxx”，避免看起来像整项任务完成。

- `frontend/src/utils/taskExperience.js`
  - 新生成的执行成员进展摘要使用“已回传结果”。
  - 成员默认摘要从“已完成：当前重点”改为“已回传结果：当前重点”。

- `backend/modules/collaboration/collaboration.ts`
  - 后端任务卡构造的执行成员进展行改为“已回传结果”。
  - 后端自测补充成员行状态与证据值检查，避免只靠前端遮挡旧文案。

- `backend/modules/global/global-agent.ts`
  - 全局状态回看的执行成员等待情况从“已完成：web”改为“已回传：web”。

- `scripts/main-agent-render-regression.mjs`
  - Playwright 断言覆盖任务卡、执行队列和全局历史卡中的“执行成员进展”。
  - 断言成员状态标签展示“已回传结果”，不再展示精确的“已完成”状态标签。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 静态守卫覆盖前端展示层、前端生成器、后端生成器、全局状态回看和渲染回归。

## 用户可见效果

- 用户看到“执行成员已回传结果”，能理解主 Agent 还会继续做验收和最终总结。
- 最终“已完成”仍然保留给任务交付总结、验收通过后的任务状态和归档摘要。
- 历史卡片里的旧成员状态会被兼容展示，不需要迁移旧数据。

## 自测覆盖

- `taskCardRendersAgentProgressSummary`
  - 静态检查成员进展生成和展示都使用“已回传结果”。
  - 静态检查全局状态回看不再包含“已完成：web”。

- `main-agent-render-regression`
  - 真实渲染任务卡、执行队列和全局历史卡。
  - 检查执行成员状态标签为“已回传结果”。
  - 检查旧的成员级“已完成”标签不会出现在执行成员进展行里。
