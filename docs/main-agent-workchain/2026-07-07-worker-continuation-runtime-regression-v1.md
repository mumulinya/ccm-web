# 子 Agent 接续工作包运行时回归保护 v1

## 背景

上一版已经把“用户调整目标后，重新派发给子 Agent 的工作包必须自包含”接入了派发链路。但只靠静态扫描还不够：未来如果有人改动协作自测或 handoff 拼装逻辑，可能出现代码里仍有函数名，实际运行时却没有把最新目标、旧方向停止说明和保留证据传给子 Agent。

本轮补一条真实构造路径的自测，确保群聊主 Agent 在目标调整后重新派发第三方写代码 Agent 时，工作包符合 Claude Code coordinator 的交接原则。

## 改动

- `backend/modules/collaboration/collaboration.ts`
  - 在 `runCollaborationUxSelfTest()` 中新增目标调整任务样本。
  - 真实调用 `buildWorkerContinuationHandoff()` 构造接续交接。
  - 再通过 `buildChildAgentWorkerHandoff()` 和 `renderSelfContainedWorkerHandoff()` 渲染子 Agent 实际会收到的工作包。
  - 新增断言：
    - 工作包 schema 为 `ccm-worker-continuation-handoff-v1`。
    - 必须标记需要重核计划。
    - 必须标记旧执行轮已停止。
    - 必须包含最新用户要求。
    - 必须包含旧目标仅作背景。
    - 必须包含“不要继续已停止执行轮中的旧方向”。
    - 必须保留已有验证证据，但不能把旧证据直接当成本轮完成结论。
    - 不能出现“基于你的发现 / based on your findings”这类把上下文责任甩给子 Agent 的懒交接。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 静态自测新增对 `workerContinuationHandoffBuildsRuntime` 和 `workerContinuationHandoffRenderedForDispatch` 的存在性检查。

## 用户体验

用户主文本不会展示这份内部工作包。

用户能看到的是友好的接续状态：主 Agent 已收到目标调整、正在停止旧执行轮或重新核对计划。具体 worker prompt、ACK、结构化结果说明协议、trace/session 等仍留在技术详情或内部执行链路。

## 验证

计划执行：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `node -e "import('./ccm-package/dist/modules/collaboration/collaboration.js').then(m=>{ const r=m.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:r.pass, failed:Object.entries(r.checks||{}).filter(([k,v])=>!v).map(([k])=>k)}, null, 2)); if(!r.pass) process.exit(1); })"`
