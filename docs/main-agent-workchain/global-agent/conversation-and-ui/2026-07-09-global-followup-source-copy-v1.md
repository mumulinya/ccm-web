# 全局任务持续跟进源头文案 v1

## 背景

前端清洗器已经能把旧的“全局监工/监工状态/异步监工”替换成用户更容易理解的“全局任务跟进/持续跟进”，但后端工作链路和全局任务推进器仍有少量源头文案直接生成旧词。用户在任务卡、进度 checkpoint、全局控制台或展开技术详情时，仍可能看到偏内部的表达。

## 本次修改

- 后端统一用户文案清洗器新增全局任务跟进相关替换，覆盖“全局监工、监工状态、异步监工、持久监工”。
- 工作链路 checkpoint 源头从“全局 Agent/全局监工”改为“我已制定跨项目计划 / 我已安排子任务返工 / 我已检查子任务进展”。
- 全局 loop 的工具标签、暂停/超时/失败提示、长期任务受理提示改为“持续跟进”口径。
- 群聊全局任务推进器的时间线、状态详情、子任务交接提示改为用户可读表达。
- 全局控制中心和前端技术详情标签从“监工”改为“跟进任务/跟进记录”。

## 用户体验

用户看到的是“我会持续跟进执行与验收”“全局任务跟进已暂停/已恢复”“我已安排子任务返工”。旧的内部称呼仍可通过兼容清洗器处理历史数据，但新生成内容不再依赖前端兜底。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`：通过。
- `npm run check`：通过。
- `npm run build:backend`：通过。
- `runGlobalAgentIntentSelfTest()`：通过。
- `runMainAgentWorkchainSelfTest()`：通过。
- `runGlobalAgentLoopSelfTest()`：通过。
- `runGlobalMissionSupervisorSelfTest()` / async selftest：通过。
- `runCollaborationUxSelfTest()`：通过。
- `npm run test:render-regression`：通过，截图输出到 `scratch/render-regression/`。
- `npm run test:replay-regression`：通过，截图输出到 `scratch/replay-regression/`。
- `npm run test:chat-experience`：通过。
- `npm run build:frontend`：通过。
