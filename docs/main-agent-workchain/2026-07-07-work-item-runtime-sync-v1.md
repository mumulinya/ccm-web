# 2026-07-07 Work Item Runtime Sync V1

## 背景

上一轮已经把子 Agent 工作抽象为 `work_items`。本轮继续参考 `D:\claude-code` 的 Tasks V2 生命周期，把这些工作项接到真实执行链路里，而不是只在任务卡里展示。

参考点：

- `D:\claude-code\docs\tools\task-management.mdx`：任务可认领，阻塞依赖会阻止或标记执行，异常退出后可释放 owner 并重新分配。
- `D:\claude-code\docs\agent\coordinator-and-swarm.mdx`：子 Agent 完成后通过通知和回执回到主 Agent，由主 Agent 汇总验收。

## 本轮实现

后端运行链路：

- 子 Agent 开始执行时调用 `claimTaskWorkItemForAgent()`，把对应 `work_items` 标记为 `in_progress`。
- 子 Agent 依赖未满足、派发失败或回执返回时调用 `updateTaskWorkItemFromReceipt()`，把工作项同步为 `blocked/failed/completed`。
- 直接项目任务也接入同样的认领和回执同步，不只覆盖群聊协作任务。
- `updateTask()` 每次都会刷新 `work_items` 和 `work_item_summary`，保证任务卡、技术详情和持久任务数据一致。

看门狗：

- `getTaskWatchdogStatus()` 新增 `work_item_stalled`，能发现单个子 Agent 工作项长期 `in_progress`。
- `runTaskWatchdog()` 会调用 `requeueTaskWorkItemsForWatchdog()` 释放卡住的工作项 owner，增加 attempt，并在任务未运行时重新入队。

精准返工：

- `buildTargetedReworkContinuationDraft()` 会附带相关工作项状态、attempt、依赖、现有证据和阻塞点。
- 子 Agent 收到返工指令时能直接看到自己要补哪一块，减少整轮重跑。

## 用户体验约定

- 用户看到“执行队列”里的真实状态变化：等待、执行中、受阻、失败、已完成。
- 工作项 id、claim/requeue 细节仍属于技术详情或内部数据，不直接打扰用户。
- 普通问话仍不生成任务卡、Todo 或执行队列。

## 验证

已通过：

```powershell
npm run check
npm run build
node -e "const m=require('./ccm-package/dist/modules/collaboration/collaboration.js'); const r=m.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:r.pass, workItemsVisible:r.checks.workItemsVisible, targetedReworkIncludesWorkItemContext:r.checks.targetedReworkIncludesWorkItemContext, watchdogSeesStalledWorkItem:r.checks.watchdogSeesStalledWorkItem},null,2)); if(!r.pass) process.exit(1)"
node -e "const m=require('./ccm-package/dist/agents/work-items.js'); const r=m.runMainAgentWorkItemSelfTest(); console.log(JSON.stringify(r.checks,null,2)); if(!r.pass) process.exit(1)"
node scripts/main-agent-decision-ui-selftest.mjs
npm run test:render-regression
npm run test:chat-experience
```

截图回归产物位于 `scratch/render-regression/`。
