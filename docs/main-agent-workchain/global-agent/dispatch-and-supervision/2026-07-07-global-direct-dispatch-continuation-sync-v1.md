# 全局直派任务接续状态同步 v1

## 背景

全局主 Agent 直接把任务派发给群聊主 Agent 后，系统已经能在任务通过验收时同步最终总结，也能在安全撤销后同步撤销结果。

但实际使用里还有一个重要中间态：用户在全局入口派发任务后，又在群聊任务里补充或调整目标。群聊主 Agent 会停止旧执行轮、重新核对计划并继续派发子 Agent；如果全局会话没有同步这个状态，用户可能误以为任务只是“已派发后没动静”。

## 改动

- `backend/modules/collaboration/collaboration.ts`
  - 新增 `shouldNotifyGlobalDirectDispatchContinuation()`。
  - 新增 `buildGlobalDirectDispatchContinuationMessage()`。
  - 新增 `appendGlobalDirectDispatchContinuationToHistory()`。
  - `updateTask()` 统一出口会在全局直派任务出现目标调整/重核计划状态时，把友好接续状态写回全局 Agent 会话。
  - 同一个接续 key 只同步一次；用户再次调整目标时，会基于 revision、时间和原因生成新 key。
  - 任务 timeline 新增 `global_direct_dispatch_continuation_synced`，用户可见标签为“全局会话已同步接续状态”。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 静态自测新增全局直派接续同步能力检查。
- `runCollaborationUxSelfTest()`
  - 新增全局直派目标调整样本。
  - 断言接续状态会同步、已同步 key 不重复同步、完成态不会误触发接续同步。
  - 断言用户文案包含最新要求、停止旧执行轮、不是完成结果，并隐藏内部协议字段。

## 用户体验

全局会话中会出现类似：

- 任务收到新的补充要求。
- 当前正在停止旧执行轮或重新核对计划。
- 这还不是完成结果，最终以群聊任务卡的计划、执行、验收和最终总结为准。

技术细节、子 Agent 工作包、trace/session 和结构化结果说明协议仍保留在群聊任务卡技术详情里。

## 验证

计划执行：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `node -e "import('./ccm-package/dist/modules/collaboration/collaboration.js').then(m=>{ const r=m.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:r.pass, failed:Object.entries(r.checks||{}).filter(([k,v])=>!v).map(([k])=>k)}, null, 2)); if(!r.pass) process.exit(1); })"`

