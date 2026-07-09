# Global/TestAgent Dispatch Visible ID Sanitizer V1

## 背景

TestAgent 侧已经提供了稳定边界：handoff/work order、`--plan-only` 预检、原生 CLI 执行、`report/verdict/artifact` 证据产物。主 Agent 侧只负责连接与展示，不直接改 TestAgent 内部业务流程。

## 本次完成

- 全局/飞书创建全局开发任务后的用户可见回复不再展示 mission/task ID。
- 全局/飞书创建协作任务后的用户可见回复不再展示 task ID。
- 全局直派群聊主 Agent 的接管摘要不再展示 task ID，改为提示“任务记录已同步到任务列表和技术详情”。
- 保留任务记录、审计、任务列表和技术详情作为内部定位入口；普通用户文本只表达“已受理、已派发、会继续跟进、最终以验收总结为准”。

## 自测覆盖

- `runGlobalAgentIntentSelfTest()` 新增：
  - `groupDirectDispatchHidesTaskId`
  - `globalFeishuDevelopmentDispatchHidesIds`
  - `globalFeishuTaskDispatchHidesIds`
- `scripts/main-agent-decision-ui-selftest.mjs` 新增静态回归：
  - `backendGlobalFeishuDispatchVisibleHidesIds`

## 展示原则

- 用户可见区：状态、标题、执行目标数量、下一步和是否代表完成。
- 技术详情/任务列表：mission ID、task ID、原始 API 返回、TestAgent work order、plan/report/verdict/artifact 路径。
- TestAgent 业务流程继续由 TestAgent 模块维护；主 Agent 只消费稳定契约并转换为可读结论。
