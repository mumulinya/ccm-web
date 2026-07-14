# Workchain Quality Followup UI v1

## 背景

后端已经参考 `D:\claude-code` 的任务链路补了最终总结质量检查：当任务已处理但最终总结缺少交付证据、验证结果或验收结论时，会生成 `ccm-main-agent-quality-followup-v1`。这次补齐前端展示，让用户能直接看到“还差什么”和“我下一步要补什么”，技术字段继续默认收在技术详情里。

参考点：

- `D:\claude-code\src\tools\TodoWriteTool\TodoWriteTool.ts`：关闭多项 Todo 但缺验证步骤时，会提示先补验证再总结。
- `D:\claude-code\src\tools\TaskUpdateTool\TaskUpdateTool.ts`：V2 任务更新也有同类验证提醒。
- `D:\claude-code\src\utils\streamlinedTransform.ts`：工具型消息会被整理成结构化摘要。
- `D:\claude-code\src\server\directConnectManager.ts`：`streamlined_tool_use_summary` 和 `post_turn_summary` 这类技术摘要不直接当普通用户文本展示。

## 实现

- `frontend/src/components/tasks/TaskExperienceCard.vue`
  - 新增 `qualityFollowup` 计算属性，读取卡片、交付报告、display stream、workchain `completion_summary.quality_followup`。
  - 普通聊天模式默认不展示。
  - 用户可见区块标题为“交付总结还需补齐”，展示缺少内容、已有线索和下一步。
  - `trace_id`、`raw payload`、协议标记仍只在折叠技术详情内。

- `frontend/src/utils/taskExperience.js`
  - 群聊任务卡透传 `missionQualityFollowup`。
  - 全局任务卡透传 `runQualityFollowup`。

- `frontend/visual-regression/main-agent-display-fixture.js`
  - 新增 `case-workchain-quality-followup` 场景，覆盖总结缺证据时的真实用户可见展示。

- `scripts/main-agent-render-regression.mjs`
  - Playwright 断言补齐卡片可见。
  - 断言“交付证据”和下一步可见。
  - 断言技术详情默认折叠，`trace-workchain-quality-followup`、`raw payload`、`CCM_AGENT_RECEIPT` 不出现在默认用户视图。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 新增静态自检，防止字段透传、卡片区块或截图断言被误删。

## 预期效果

当群聊主 Agent 或全局主 Agent 已经处理任务但最终总结不完整时，用户会看到一张友好的补齐卡片，而不是看到内部协议或空泛的“已完成”。普通问话仍然不会显示 Todo 或补齐卡片。

## 验证

已通过：

- `npm run check`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`

回归说明：

- 第一次 render regression 因断言范围过宽失败，`交付证据` 同时出现在缺少内容和下一步里；已把断言收窄到 `.quality-followup-grid` 后重跑通过。
- render regression 生成真实截图到 `scratch/render-regression/`。
- replay regression 生成真实截图到 `scratch/replay-regression/`。
