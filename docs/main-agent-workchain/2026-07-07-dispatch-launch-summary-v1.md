# Dispatch Launch Summary V1

日期：2026-07-07

## 背景

参考 `D:\claude-code\src\coordinator\coordinatorMode.ts` 后，主 Agent 还需要更明确地做到：启动子 Agent 后，用户应该立刻知道主 Agent 派了谁、各自负责什么、后续如何验收。子 Agent 通知和底层工作单仍是内部信号，不应该让用户去读协议字段。

此前系统已经有 Todo、工作单预览和子 Agent 进展摘要，但主 Agent 决策卡顶部仍主要显示“已派发，等待结果说明”。对真实使用来说，这句话不够具体。

## 本次升级

- `backend/modules/collaboration/collaboration.ts`
  - 新增 `ccm-main-agent-dispatch-launch-summary-v1`。
  - 初始派发和实时任务卡都会生成 `dispatch_launch_summary`。
  - 摘要包含：
    - 派发目标 Agent
    - 子 Agent 工作内容
    - 派发原因
    - 依赖关系
    - 下一步验收方式
  - 用户可见文本会清洗 `CCM_AGENT_RECEIPT`、`task-notification`、`receipt-status`、`raw payload` 等内部协议词。
- `backend/modules/collaboration/display.ts`
  - `display_stream` 透出 `dispatch_launch_summary`，方便群聊文本框、任务卡和后续全局入口共用。
- `frontend/src/components/agents/MainAgentDecisionCard.vue`
  - 新增“已派发的工作”区块。
  - 普通问话不显示该区块。
  - 技术详情仍默认折叠，完整工作单和 Trace 不进入主视图。
- `scripts/main-agent-render-regression.mjs`
  - Playwright 截图断言新增：
    - 普通问话不显示派发摘要；
    - 任务派发显示派发摘要；
    - 派发摘要不泄漏内部协议词。

## 用户可见效果

- 用户提出开发任务后，主 Agent 会显示类似：
  - 已派发给 `web`
  - `web` 负责修复登录状态恢复逻辑
  - 后续等待子 Agent 结果说明，主 Agent 会统一验收
- 用户不用展开技术详情，就能知道当前工作被拆给了谁。
- 普通问答仍只显示普通回复，不出现 Todo 或派发摘要。

## 验收方式

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build`
- `npm run test:render-regression`
- `npm run test:chat-experience`
- `npm run test:replay-regression`

## 后续

后续可以把全局主 Agent 的跨项目直接派发也统一映射到这个结构，让全局会话和群聊会话在“已派发的工作”表达上完全一致。
