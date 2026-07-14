# Group Main Agent Completion Summary V1

日期：2026-07-07

## 背景

长期目标要求群聊主 Agent 像 `D:\claude-code` 的任务链路一样，在完成后给用户一个明确、友好的总结，而不是让用户自己从任务卡、回执和技术详情里拼结论。

本轮发现一个实际体验问题：如果最新任务已经完成，但任务卡没有额外的 `phase_label`，群聊顶部状态可能仍显示“正在处理”。另外，状态卡之前只展示文件数和验证数，没有直接给用户一句“这件事完成了什么”。

## 改动

- `buildGroupMainAgentStatus()` 新增终态识别：
  - 完成：`已完成`
  - 失败：`未完成`
  - 取消：`已取消`
  - 待用户确认：`等待你确认`
- 新增 `ccm-group-main-agent-completion-summary-v1`。
- 完成态会自动生成 `completion_summary`：
  - `headline`：用户可读的一句话总结
  - `file_change_count`：文件变更数量
  - `verification_count`：验证数量
  - `risk_count`：待关注数量
  - `next_action`：下一步建议
- 完成态会自动补一个最终 checkpoint，例如“任务交付完成”，避免状态停留在较早的“已派发给子 Agent”。
- 终态任务不再显示执行中的子 Agent。
- `GroupMainAgentStatusCard.vue` 新增“交付总结”用户可见区块。
- 技术字段、执行器、session、门禁细节仍放在折叠的“技术详情”中。
- Playwright fixture 改为完成态场景，并断言：
  - 状态卡显示“任务交付完成”
  - 状态卡显示“交付总结”
  - 任务卡显示统一交付报告
  - 技术详情默认折叠

## 用户体验

- 用户看到群聊主 Agent 已完成时，顶部状态会直接显示“已完成”。
- 用户不用展开技术详情，就能看到完成了什么、涉及多少文件、跑了多少验证，以及下一步可以做什么。
- 如果任务失败或取消，状态卡会用“未完成 / 已取消”表达，不会把失败包装成完成。
- 普通问话仍不会展示 Todo 或交付总结。

## 验证

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`

渲染截图输出：

- `scratch/render-regression/03-technical-details-folded.png`

该截图现在覆盖完成态主 Agent 状态卡、交付总结、任务卡交付报告，以及折叠技术详情。

## 后续

下一步可以把“终态时弱化旧决策”做成独立优化：任务已经完成后，状态卡里的旧计划决策可以降级成历史上下文，避免用户误读为仍在派发子 Agent。
