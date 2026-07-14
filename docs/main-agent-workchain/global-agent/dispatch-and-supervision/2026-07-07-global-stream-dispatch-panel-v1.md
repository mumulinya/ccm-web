# 全局流式派发进度块 v1

## 背景

全局主 Agent 已经会在派发群聊主 Agent、项目 Agent 或创建任务后产生 `dispatch_launch_summary`，但流式处理中原来只展示一行状态。用户无法在当前对话里直接看到“派给谁、做什么、现在是什么状态”，需要等任务卡或技术详情。

## 本次升级

- 在全局主 Agent 的流式消息卡内新增可折叠的“已派发的工作”进度块。
- 进度块展示每个执行目标的角色、名称、任务、原因、依赖和状态。
- 普通问话没有 `dispatch_launch_summary` 时不渲染进度块，也不展示 Todo。
- 进度块复用用户可见文本清洗逻辑，`CCM_AGENT_RECEIPT`、`raw payload`、`trace_id` 等内部协议词不会出现在主文本。
- 视觉回归 fixture 接入真实 `GlobalAgent` 组件，并 mock 全局历史、质量快照和桥接轮询接口，覆盖真实页面渲染。

## 用户体验约定

- 默认展开，让用户第一眼知道主 Agent 已经把工作派给谁。
- 用户可以折叠，只保留“已派发的工作”和目标数量。
- 技术细节、底层工作单、Trace 和内部协议仍放在技术详情或底层记录里。

## 验证

- 通过：`node scripts/main-agent-decision-ui-selftest.mjs`
- 通过：`npm run check`
- 通过：`npm run build`
- 通过：`npm run test:render-regression`
- 通过：`npm run test:chat-experience`
- 通过：`npm run test:replay-regression`
- 通过：后端 dist 主 Agent workchain / delivery / global loop 自测
- 通过：协作协议 dist 自测
- 通过：`git diff --check`，仅有既有 CRLF 提示

截图回归新增：

- `scratch/render-regression/04-global-stream-dispatch-panel.png`
