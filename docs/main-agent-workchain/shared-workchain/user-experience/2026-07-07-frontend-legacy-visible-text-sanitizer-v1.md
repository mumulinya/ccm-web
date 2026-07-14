# 前端历史可见文本兜底清洗 v1

本轮目标：继续对齐 `D:\claude-code` 的展示原则。主 Agent 和子 Agent 内部仍然可以用 receipt、ACK、trace 等结构化协议完成验收，但用户可见区域不应该因为旧历史数据、第三方写代码 Agent 的输出或旧任务卡字段而露出这些内部词。

## 改动

- `frontend/src/utils/agentDisplay.js` 新增统一的用户可见文本清洗：
  - 中文旧词统一从“回执”改成“结果说明”。
  - `receipt-status` / `receipt_status` / `receipt status` 显示为“结果状态”。
  - `ACK` 显示为“接单确认”。
  - `CCM_AGENT_RECEIPT`、raw payload、trace/session 等内部串继续折成友好说明。
- `getDeliveryReport()` 现在返回用户可见清洗后的交付报告副本，不改变原始技术数据。
- `TaskExperienceCard.vue` 对标题、目标、已完成、阻塞、进展、工作队列、交付报告、结果复检、子 Agent 摘要、计划核对、接下来建议等可见字段做显示前清洗。
- `taskExperience.js` 对旧的 `receipt_rework_summary` 结构做兜底清洗，避免历史卡片继续展示旧协议词。
- Playwright fixture 增加历史脏数据：中文“回执”、英文 `receipt-status`、`CCM_AGENT_RECEIPT raw payload` 和 `trace_id`。

## 用户效果

- 普通问话仍不会展示 Todo 或任务卡。
- 任务卡里可以继续看到计划、结果复检、子 Agent 进展、交付总结。
- 用户主视图不再看到旧的“回执 / receipt-status / CCM_AGENT_RECEIPT / trace_id”。
- 技术详情仍保留 Trace、会话、执行记录等排障信息，默认折叠。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:chat-experience`
- `npm run check`
- `npm run build`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- 打包产物协议自测通过。
- `git diff --check` 仅有既有 LF/CRLF 提示。
