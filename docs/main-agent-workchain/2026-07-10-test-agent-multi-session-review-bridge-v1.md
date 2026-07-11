# 主 Agent 与 TestAgent 多人会话浏览器验收桥接 v1

日期：2026-07-10

## 本轮目标

在不修改 `backend/test-agent/**` 业务实现的前提下，补齐群聊主 Agent、全局主 Agent与 TestAgent 多人会话浏览器验收结果之间的完整连接：

- 项目配置包含两个以上浏览器会话和跨会话步骤时，主 Agent 自动要求 `browser_multi_session` 验收。
- 主 Agent 消费 `browserMultiSessionSummary`，向用户说明场景数、会话角色、并行动作和跨会话核对结果。
- 发送方通过但接收方、操作方或观察方失败时，旧版顶层 `passed/accept` 不能覆盖真实失败。
- 失败进入返工，受阻或未执行进入待确认，最终总结不得误报完成。
- 用户主视图只显示业务角色和可执行结论；原始 session、locator、失败步骤、报告字段和路径留在默认折叠的技术详情。

## 实现

### 共享摘要转换

`backend/agents/test-agent-review-bridge.ts` 新增多人会话摘要转换：

- 递归读取报告、裁决、回执和技术数据中的 `browserMultiSessionSummary` / `browser_multi_session_summary`。
- 汇总通过、失败、受阻、未执行、会话角色、并行动作组和跨会话比较数量。
- 将 `sender`、`receiver`、`author/operator`、`observer` 转换为发送方、接收方、操作方、观察方。
- 失败主文本只说明哪个业务角色未通过，原始步骤与定位器不进入用户文本。
- 单会话 `browserFlowSummary` 与多人会话摘要相互排除，避免重复识别。

### 群聊主 Agent

`backend/modules/collaboration/collaboration.ts` 完成：

- 多人会话浏览器配置自动加入 `browser_multi_session` 必检项。
- TestAgent 计划摘要显示跨会话步骤数和并行动作组数。
- 原生 TestAgent 回执、独立复核卡和用户回复加入多人会话摘要。
- 裁决强化层把多人会话失败写回有效裁决：
  - 失败角色、失败步骤或跨会话比较失败：`needsRework`。
  - 受阻或未执行：`needsHuman`。
  - 旧裁决的 `canAccept: true` 不再覆盖真实多人会话失败。
- 返工回执保留用户可读失败角色，原始步骤仍只保留在结构化技术数据中。

### 全局主 Agent

`backend/modules/global/global-agent.ts` 完成：

- 全局 TestAgent relay 同步消费多人会话摘要。
- 多人会话失败纳入 blockers、`canAccept` 和 `needsRework`。
- 多人会话受阻或未执行纳入 `needsHuman`。
- 全局过程卡显示用户可读的多人协作验收结论。
- 自测覆盖“旧 verdict 通过，但观察方失败”的反例。

### 最终工作链

`backend/agents/workchain.ts` 完成：

- 多人会话摘要进入独立复核证据。
- 失败角色阻止最终总结质量门禁通过。
- 受阻或未执行会保持待确认状态。
- 返工摘要包含失败业务角色和重新运行 TestAgent 的下一步，不泄漏原始 session 或 locator。

### 用户展示

共享任务卡调整复核证据优先级：

- 优先展示 TestAgent 状态、多人会话结论、失败角色、真实浏览器流程、验收缺口和返工动作。
- 可见复核行上限从 7 调整为 9，避免关键多人会话结论被旧证据行截断。
- 技术详情继续默认折叠。
- 普通问话仍不显示 Todo 或 TestAgent 复核卡。

## 验证

已通过：

- `runTestAgentReviewBridgeSelfTest()`
- `runMainAgentWorkchainSelfTest()`
- `runCoordinatorReworkProtocolSelfTest()`
- `runCollaborationUxSelfTest()`
- `runCollaborationProtocolSelfTest()`
- `runGlobalAgentIntentSelfTest()`
- `npx tsc -p backend/tsconfig.json --noEmit --declaration false`
- `npx tsc -p backend/tsconfig.json --declaration false`
  - 完整后端运行代码类型检查通过。
  - 新连接已发射到 `ccm-package/dist`。
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run build:frontend`
- `npm run test:chat-experience`
- `npm run test:render-regression`
  - 24 张真实浏览器截图。
  - 失败卡可见“多人协作浏览器验收”和“观察方未通过”。
  - 群聊通过卡可见场景、会话角色、并行动作和跨会话核对数量。
  - `session:observer`、locator、`browserMultiSessionSummary` 不出现在用户可见区域。
  - 技术详情默认折叠，页面无重叠。
- `npm run test:replay-regression`
  - 4 张历史回放截图。
- `git diff --check`

重点截图：

- `scratch/render-regression/02d-test-agent-failed-review-rework.png`
- `scratch/render-regression/02e-group-live-test-agent-review-merged.png`
- `scratch/render-regression/07d-global-test-agent-coverage-relay.png`

## 边界与并行工作区

- 本轮没有修改 `backend/test-agent/**`，只消费 TestAgent 已提供的报告和裁决字段。
- 标准 `npm run check` 当前被 TestAgent 并行工作线的 `backend/test-agent/contract/schema.ts:470` 阻塞。
- TypeScript 错误为 `TS7056`：契约节点推断类型过长，需要 TestAgent 所有者补充显式类型。
- 主 Agent 修改文件已通过完整后端运行代码类型检查、运行包发射、运行级自测、前端构建、聊天体验、真实截图和回放验证。
