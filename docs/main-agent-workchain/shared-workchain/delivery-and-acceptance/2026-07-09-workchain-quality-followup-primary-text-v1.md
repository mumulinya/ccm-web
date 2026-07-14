# Workchain Quality Followup Primary Text v1

## 背景

`quality_followup` 已经能展示补齐卡片，也能进入 Todo，但后端自测暴露出一个用户体验问题：质量失败场景的主文案仍可能是“任务已处理。”，下面才显示“先补齐交付证据”。这会让用户误以为任务已经最终完成。

对照 `D:\claude-code` 的 Todo/TaskUpdate 验证提醒，主线程在发现缺验证或缺证据时，用户看到的主状态应该是“还在补齐”，而不是“已完成”。

## 实现

- `backend/agents/workchain.ts`
  - 新增 `buildWorkchainQualityFollowupUserVisibleText`。
  - 当最终总结质量失败时，`user_visible_text` 与 `completion_summary.headline` 改写为“任务已有处理结果，但最终交付总结还在补齐...”。
  - `formatMainAgentCompletionReply` 因读取 `completion_summary.headline`，最终回复开头也同步该状态。
  - 自测新增 `workchainQualityFailureUserTextAvoidsFalseDone`。

- `frontend/visual-regression/main-agent-display-fixture.js`
  - 质量补齐场景的 primary text 改成“最终交付总结还在补齐”。

- `scripts/main-agent-render-regression.mjs`
  - 截图回归断言质量补齐场景主文本不再误报已完成。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加源码级检查，防止主文案改写逻辑被误删。

## 预期效果

当群聊主 Agent 或全局主 Agent 已经有处理结果，但最终交付总结缺少交付证据、验证结果或验收结论时，用户第一眼看到的是“最终交付总结还在补齐”，而不是“已完成”。

## 验证

已通过：

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `node --input-type=module -e "import('./ccm-package/dist/agents/workchain.js').then(({runMainAgentWorkchainSelfTest})=>{const result=runMainAgentWorkchainSelfTest(); console.log(JSON.stringify({pass:result.pass, falseDoneFixed:result.checks.workchainQualityFailureUserTextAvoidsFalseDone, userVisibleText:result.incompleteQuality.user_visible_text, replyStart:result.incompleteQualityReply.split('\n')[0]}, null, 2)); if(!result.pass) process.exit(1);})"`
- `npm run test:render-regression`
- `npm run test:replay-regression`

回归说明：

- workchain 自测确认质量失败场景的 `user_visible_text` 与最终回复开头都是“最终交付总结还在补齐”。
- render regression 继续确认质量补齐场景的主文本、Todo、关键进展和技术详情折叠状态。
