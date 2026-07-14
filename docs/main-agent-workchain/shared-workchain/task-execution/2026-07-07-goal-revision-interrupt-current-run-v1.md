# 目标变更时停止当前执行轮 v1

## 背景

参考 `D:\claude-code\src\coordinator\coordinatorMode.ts` 的 TaskStop / SendMessage 思路，用户在任务执行中改变目标时，如果当前子 Agent 可能继续沿旧方向执行，主 Agent 应该能先停止当前执行轮，再把新目标作为同一任务的重规划输入。

上一版已经能展示“目标调整已接收”和“重新核对计划”，但真实执行仍偏向等待当前轮自然结束。本次补齐真实中断链路。

## 改动

- `continueTaskWithMessage` 在运行中收到 `revise_goal` 时会：
  - 标记 `interrupt_current_run`。
  - 写入 `goal_revision_interruption`。
  - 调用 `requestTaskCancellation` 停止当前执行轮。
  - 追加 `task_goal_revision_interrupt` 时间线事件。
- 执行队列识别“目标调整触发的取消”，不会把任务误标记为用户取消。
- 如果 Agent 正常返回后发现目标调整中断，任务会转为 `pending`，保留同一任务上下文并重新入队。
- 如果 Agent 进程直接抛出取消错误，也会转为“已按目标调整停止当前执行轮；主 Agent 会重新核对计划并继续”。
- 用户可见任务卡显示：
  - 状态：正在停止当前轮。
  - 处理方式：先停止当前轮再重核计划。
  - 步骤：停止当前轮并重核计划。
- 普通补充说明仍然只排队到当前轮后继续，不会过度中断。

## 用户可见原则

- 用户看到的是“当前轮已停止/正在停止、接下来会重核计划并继续”。
- 技术细节如 cancellation record、execution id、runner request、trace id 继续放在技术详情或内部结构里。
- 不把 `CCM_AGENT_RECEIPT`、raw payload、session id 之类内部协议放到主文本。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run test:render-regression`
- `node -e "import('./ccm-package/dist/modules/collaboration/collaboration.js').then(m=>{ const r=m.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:r.pass, failed:Object.entries(r.checks||{}).filter(([k,v])=>!v).map(([k])=>k)}, null, 2)); if(!r.pass) process.exit(1); })"`

截图回归覆盖：

- 目标调整接续显示“目标调整已接收”。
- 处理方式显示“先停止当前轮再重核计划”。
- 接续步骤显示“停止当前轮并重核计划”。
- 下一步显示“主 Agent 正在停止当前执行轮”。
