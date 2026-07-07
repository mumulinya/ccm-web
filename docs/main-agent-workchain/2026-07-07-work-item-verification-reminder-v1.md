# 执行队列验收提醒 v1

日期：2026-07-07

## 背景

继续对照 `D:\claude-code` 的 TaskUpdate 验证推动机制：当 3 个以上任务都完成，但没有任何验证任务时，CC 会给主线程 Agent 一个验证提醒，避免直接写最终总结。

本项目已经有 Todo/计划层面的验收提醒，但执行队列 `work_items` 也需要同样的闭环保护。否则用户可能看到多个子工作项都完成，却不知道最终总结前还缺一次真实验收。

## 本次升级

- `backend/agents/work-items.ts` 的 `buildMainAgentWorkItemSummary()` 新增 `verification_reminder` / `verification_nudge`。
- 当 3 个以上工作项全部完成，且没有验证/验收工作项或验证证据时，生成 `ccm-main-agent-work-item-verification-reminder-v1`。
- `TaskExperienceCard.vue` 在“执行队列”区域展示“执行队列还缺验收”的用户可见提醒。
- `frontend/src/utils/taskExperience.js` 增加前端兜底推导，历史卡片或全局恢复卡片没有后端新字段时也能补出提醒。
- Playwright fixture 新增“执行队列验收提醒”真实渲染案例，并截图回归。

## 用户可见规则

- 普通问话不受影响，不展示执行队列或验收提醒。
- 已有验证/验收工作项，或工作项携带验证证据时，不重复提醒。
- 工作项都完成但缺验收时，任务卡明确提示：最终总结前需要补真实验收或说明无法验证原因。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run test:render-regression`
- `npm run test:replay-regression`

