# Final Summary Quality Gate V1

日期：2026-07-07

## 背景

参考 `D:\claude-code\src\coordinator\coordinatorMode.ts` 后，当前主 Agent 链路还需要更稳定地做到一件事：子 Agent 或工具返回的是内部信号，主 Agent 必须先理解、验收、合成，再用用户能看懂的话总结。

之前系统已经有统一交付报告，但仍存在一些逃逸口：模型或旧数据可能只给出“任务已建立”“已完成”这类短句。对实际使用来说，这不够，用户需要看到完成内容、验证/验收、风险和下一步。

## 本次升级

- `backend/agents/workchain.ts`
  - 新增 `ccm-main-agent-final-summary-quality-v1`。
  - 有执行证据的终态任务必须补齐：
    - 完成内容
    - 交付证据
    - 验证或验收说明
    - 风险说明
    - 下一步
  - 即使原始回复是“任务已建立”，也会被整理成完整总结。
  - 普通问答仍保持纯文本，不会被包装成 Todo 或任务交付总结。
  - 扩展内部协议词清洗：`task-notification`、`receipt-status`、`raw payload`、`WorkerContextPacket` 等默认不出现在用户可见文本里。
- `backend/agents/delivery-report.ts`
  - 统一交付报告也挂载 `final_summary_quality` / `summary_quality`。
  - 自测断言交付报告包含完成内容、验证结果、验收结论和下一步。
  - 旧协议词会被改写成“结果说明”等友好说法。
- `backend/modules/collaboration/group-routes.ts`
  - 群聊顶部 `completion_summary` 复用统一交付报告清洗逻辑，避免状态卡和任务卡说法不一致。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加静态守护，防止最终总结质量门被后续改动绕开。

## 用户可见效果

- 用户发的是普通问话：只显示普通回答，不显示 Todo、交付卡或任务总结。
- 用户发的是执行任务：完成后主 Agent 会总结“做了什么、怎么验、是否有风险、接下来建议”。
- 技术字段、底层通知、trace、session、原始 payload 继续默认收在“技术详情”。
- 群聊主 Agent 和全局主 Agent 共用同一套完成总结规则。

## 验收方式

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build`
- `npm run test:chat-experience`
- `npm run test:render-regression`
- `npm run test:replay-regression`

## 后续

后续可以继续把真实 Playwright 截图断言扩展到更多“旧数据脏输入”场景，例如历史消息里出现旧协议词、旧任务卡复用旧字段名、全局会话从历史记录恢复时的最终总结展示。
