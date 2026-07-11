# 主 Agent 与 TestAgent 浏览器验收流程桥接 v1

## 目标

补齐群聊主 Agent、全局主 Agent与 TestAgent 原生执行结果之间的用户可见链路：

- TestAgent 完成后，群聊必须生成可持续查看的独立复核卡片，不能只更新临时状态文字。
- 主 Agent 必须消费 `browserFlowSummary`，识别真实浏览器验收流程的通过、失败、受阻和未执行状态。
- 失败或未完成的浏览器验收流程必须阻止错误完成，并进入返工或待确认链路。
- 用户主视图只展示可理解的验收摘要、返工重点和下一步；原始流程类型、失败步骤、报告路径与协议字段放入技术详情。
- TestAgent 业务执行仍由 `backend/test-agent` 负责，本次只修改主 Agent 的消费、编排和展示。

## 完成内容

### 共享结果转换

新增 `backend/agents/test-agent-review-bridge.ts`：

- 从报告、裁决、回执或技术数据中读取 `browserFlowSummary`。
- 将 `acceptance_form_flow`、`acceptance_popup_flow`、`acceptance_network_state_flow` 等内部类型转换为表单流程、弹窗流程、联网与离线流程等用户可读名称。
- 生成真实浏览器验收总数、通过数、失败数、受阻数、未执行数和验收条件覆盖数。
- 失败步骤只提示“已放入技术详情”，不把定位器、原始步骤或证据路径放进主文本。

### 群聊主 Agent

- 原生 TestAgent 完成事件新增：
  - `test_agent_review_summary`
  - `independent_review_summary`
  - `independent_review`
  - `test_agent_verdict`
- 群聊前端可以直接把事件合并进当前任务卡；没有当前卡时也会创建复核结果卡。
- 是否完成以主 Agent 加固后的回执裁决为准，不再只看 TestAgent 报告顶层 `status`。
- 旧版 `verdict.json` 缺少新摘要字段时，主 Agent 会用同一份报告补齐后再判断。

### 全局主 Agent

- 全局中继会展示真实浏览器验收摘要。
- 浏览器流程失败会进入 `needs_rework`。
- 浏览器流程受阻或未执行会进入 `needs_user`，暂停最终验收。
- 过程卡和最终归档总结都保留用户可读的浏览器验收结论。

### 最终工作链

- `browserFlowSummary` 纳入独立复核门禁。
- 即使旧裁决声称通过，只要真实浏览器流程仍有失败、受阻或未执行，最终总结质量门禁就不会判定完成。
- 复核列表按业务优先级展示，确保失败流程、返工对象和“返工后重新运行 TestAgent”不会被证据明细挤出可见区域。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit --declaration false`
- `npx tsc -p backend/tsconfig.json --declaration false`
- `runTestAgentReviewBridgeSelfTest()`：通过
- `runMainAgentWorkchainSelfTest()`：通过
- `runCoordinatorReworkProtocolSelfTest()`：通过
- `runGlobalAgentIntentSelfTest()`：通过
- `node scripts/main-agent-decision-ui-selftest.mjs`：通过
- `node scripts/unified-chat-task-experience-selftest.mjs`：通过
- `npm run build:frontend`：通过
- `npm run test:render-regression`：23 张截图通过
- `npm run test:replay-regression`：4 张历史回放截图通过
- `npm run test:chat-experience`：源码自测与端到端体验检查通过

重点截图：

- `scratch/render-regression/02e-group-live-test-agent-review-merged.png`
- `scratch/render-regression/02d-test-agent-failed-review-rework.png`
- `scratch/render-regression/07-global-stream-dispatch-panel.png`

## 展示原则

- 普通问话不会显示 TestAgent Todo 或复核卡。
- 任务执行中显示计划、当前状态和真实验收摘要。
- 失败时明确说明由原实现成员返工，主 Agent 继续跟进并重新复核。
- 原始报告、裁决 JSON、证据路径、流程类型、Trace 和失败步骤默认收在技术详情里。

## 并行工作区说明

标准 `npm run check` 当前被另一条 TestAgent 工作线的
`backend/test-agent/contract/schema.ts:381` 阻塞：

- TypeScript 报错：`TS7056`，推断类型过长，需要该契约声明补充显式类型。
- 该文件属于正在独立维护的 TestAgent 业务契约，本轮没有修改或回退。
- 关闭声明生成后的完整后端类型检查与 JavaScript 构建均通过，证明本轮主 Agent 连接代码本身可以编译。
