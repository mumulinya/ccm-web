# 主 Agent 计划验收提醒 v1

日期：2026-07-07

## 背景

对照 `D:\claude-code` 的 TodoWrite 验证推动机制后，发现本项目已经能展示 Todo/计划，但缺少一个稳定的用户可见提醒：当复杂任务计划有 3 项以上步骤、却没有明确的验证或验收步骤时，用户不容易判断主 Agent 是否会在完成前做真实检查。

## 本次升级

- 后端新增 `ccm-main-agent-plan-verification-reminder-v1` 结构，群聊主 Agent 的计划链路和实时任务 Todo 都会携带 `verification_reminder`。
- 普通问话、只读项目分析不会显示该提醒，避免把闲聊任务化。
- 前端 `MainAgentDecisionCard` 在任务计划中展示友好提醒：“还缺验收步骤”，技术字段仍默认放在“技术详情”里。
- 全局主 Agent 的流式当前步骤也支持同一提醒字段，并在缺少验收步骤时做前端兜底。
- Playwright 渲染 fixture 新增“任务计划缺验收提醒”案例，截图回归覆盖普通问话、正常任务计划和缺验收任务计划三种边界。

## 用户可见规则

- 普通问话：不显示 Todo，也不显示验收提醒。
- 已包含验证/验收步骤的任务：不重复提醒。
- 缺少验证/验收步骤的复杂任务：显示一条短提醒，告诉用户完成前需要补真实验证或说明无法验证原因。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run test:render-regression`
- `npm run test:replay-regression`

