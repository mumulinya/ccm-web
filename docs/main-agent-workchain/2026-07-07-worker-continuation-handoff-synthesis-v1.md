# 子 Agent 接续工作包合成 v1

## 背景

参考 `D:\claude-code\src\coordinator\coordinatorMode.ts` 的 worker prompt 规则：当用户中途改变需求，主 Agent 不能只说“基于前面的内容继续”，而要把最新目标、旧方向停止原因、需要保留的证据和禁止继续的方向合成为一个自包含工作包。

上一轮已经能在目标调整时停止当前执行轮。本次补齐停止后重新派发给子 Agent 的上下文。

## 改动

- `backend/agents/worker-handoff.ts`
  - 新增 `renderContinuationForWorker`。
  - self-contained worker handoff 会渲染“接续/目标调整说明”。
  - 工作包明确包含：
    - 最新用户要求。
    - 当前目标。
    - 旧目标仅作背景，不得继续旧方向。
    - 是否需要重核计划。
    - 当前执行轮是否已停止。
    - 要保留的已有文件、验证和结果说明证据。
- `backend/modules/collaboration/collaboration.ts`
  - 新增 `buildWorkerContinuationHandoff`。
  - 群聊子 Agent 派发、直接项目 Agent 派发、自动派发都传入同一份 continuation handoff。
  - 目标调整后重派时，子 Agent 能看到“先停止当前轮再重核计划”，而不是只看到累加后的任务描述。

## 用户体验

用户主文本仍只看到友好的接续状态，例如“主 Agent 正在停止当前执行轮，停止后会重新核对计划并继续”。

技术细节如 worker handoff、runner cancellation、trace id、session id 仍在技术详情和内部结构里。子 Agent 工作包可以包含内部执行约束，但不会直接暴露在用户主文本。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `node -e "import('./ccm-package/dist/modules/collaboration/collaboration.js').then(m=>{ const r=m.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:r.pass, failed:Object.entries(r.checks||{}).filter(([k,v])=>!v).map(([k])=>k)}, null, 2)); if(!r.pass) process.exit(1); })"`

自测覆盖：

- worker handoff 渲染“接续/目标调整说明”。
- worker handoff 包含“先停止当前轮再重核计划”。
- worker handoff 包含“不要继续已停止执行轮中的旧方向”。
- 协作后端三条派发路径都传入 continuation handoff。
