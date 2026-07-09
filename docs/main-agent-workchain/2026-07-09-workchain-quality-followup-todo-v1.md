# Workchain Quality Followup Todo v1

## 背景

上一版已经把 `ccm-main-agent-quality-followup-v1` 展示给用户，但它仍主要是“提醒卡片”。对照 `D:\claude-code` 的 Todo 关闭验证提醒，主线程在准备收尾时发现缺验证/证据，应该把补齐动作留在当前任务链路里，而不是只在最后总结里提示。

参考点：

- `D:\claude-code\src\tools\TodoWriteTool\TodoWriteTool.ts`：关闭 3 个以上 Todo 且没有验证步骤时，在工具结果里要求先启动验证再总结。
- `D:\claude-code\src\tools\TaskUpdateTool\TaskUpdateTool.ts`：V2 任务列表同样在任务全部完成但缺验证时追加提醒。

## 实现

- `backend/agents/workchain.ts`
  - 新增 `buildWorkchainQualityFollowupTodoStep`。
  - 当最终总结质量检查失败时，Todo 计划追加 `quality-followup` 当前步骤。
  - 当前步骤文案为“正在补齐交付证据/验证结果/验收结论”，并禁止把 Todo 归档。
  - 关键进展追加 `quality-followup-checkpoint`，状态为 `active`。
  - 自测新增 `workchainQualityFailureKeepsTodoActive`。

- `frontend/src/components/tasks/TaskExperienceCard.vue`
  - 终态卡片如果存在 `qualityFollowup`，仍允许展示 Workchain Todo。

- `frontend/visual-regression/main-agent-display-fixture.js`
  - `case-workchain-quality-followup` 增加质量补齐 Todo 和关键进展。

- `scripts/main-agent-render-regression.mjs`
  - 断言补齐 Todo 卡片可见。
  - 断言当前焦点为“正在补齐交付证据、验证结果、验收结论”。
  - 断言关键进展展示“正在补齐交付总结”。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加源码级回归检查，防止 Todo 桥接和截图断言被删除。

## 预期效果

当群聊主 Agent 或全局主 Agent 已经处理任务，但最终总结缺少交付证据、验证结果或验收结论时，用户会同时看到：

- “交付总结还需补齐”提醒卡片。
- 当前 Todo：正在补齐交付总结。
- 关键进展：正在补齐交付总结。

普通问话仍不会显示 Todo。

## 验证

已通过：

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `node --input-type=module -e "import('./ccm-package/dist/agents/workchain.js').then(({runMainAgentWorkchainSelfTest})=>{const result=runMainAgentWorkchainSelfTest(); console.log(JSON.stringify({pass:result.pass, qualityTodo:result.checks.workchainQualityFailureKeepsTodoActive}, null, 2)); if(!result.pass) process.exit(1);})"`
- `npm run test:render-regression`
- `npm run test:replay-regression`

回归说明：

- render regression 第一次失败是旧断言作用域太宽；新增质量补齐 Todo 后，`.decision-technical pre` 从 1 处变成 2 处。已把断言收窄到主任务卡自身后重跑通过。
- render regression 继续验证普通问话不显示 Todo、任务显示 Todo、技术详情默认折叠、质量补齐 Todo 可见。
