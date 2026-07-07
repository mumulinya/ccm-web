# 群聊主 Agent 团队收尾门禁 V1

## 参考来源

- `D:\claude-code\src\cli\print.ts` 的 `SHUTDOWN_TEAM_PROMPT` 要求：最终回复用户前，必须先让团队成员关闭、等待确认并清理团队。
- 对 CCM 来说，对应的风险是：群聊主 Agent 已给用户最终总结，但子 Agent 会话或执行队列工作项仍未收尾。

## 本次升级

- 新增 `buildTeamShutdownGate()`，在交付摘要里记录：
  - 是否要求团队收尾
  - 仍开放的任务级 Agent 会话
  - 未完成的工作项
  - 已关闭会话数量
- 验收门禁新增两项：
  - `执行队列收敛`：所有工作项必须完成。
  - `团队收尾`：最终交付前不能还有开放的任务级 Agent 会话。
- 任务完成流程改为两阶段：
  1. 先用 `waiting` 状态检查交付证据，确保不会因为还没关闭会话而误挡主验收。
  2. 证据通过后关闭任务级 Agent 会话，再用 `done` 状态做最终收尾门禁。
- 持久化交付证据复核的自动完成入口也接入同一套收尾门禁。
- 手动标记 daily_dev 完成时，如果工作项未完成或团队未收尾，会被拒绝。

## 用户体验

- 用户看到“已完成/最终总结”时，背后的子 Agent 会话已经完成收尾。
- 如果团队仍未收尾，任务会保持进行中，并在技术详情里显示未通过的门禁。
- 普通可见文本仍保持用户能看懂；会话 ID、工作项 ID 等细节继续放在技术详情。

## 自测覆盖

- `runCollaborationUxSelfTest()` 增加：
  - `teamShutdownGateBlocksOpenSession`
  - `teamShutdownGatePassesAfterClose`
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态链路检查 `backendBuildsTeamShutdownGate`。

