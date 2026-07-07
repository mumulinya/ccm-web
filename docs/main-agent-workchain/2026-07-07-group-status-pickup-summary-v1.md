# Group Status Pickup Summary V1

日期：2026-07-07

## 背景

参考 `D:\claude-code\src\hooks\useAwaySummary.ts` 和 `D:\claude-code\src\utils\sessionState.ts` 后，本轮继续补齐“用户回来之后第一眼看哪里”的体验。Claude Code 会把 mid-turn / post-turn / away summary 作为用户可读元数据，而不是让用户翻原始事件流。

本项目已经有统一交付报告里的 `pickup_summary`，任务卡和全局历史卡能展示“回来继续看这里”。缺口是群聊顶部 `主 Agent 状态` 仍主要展示“交付总结”，用户回到群聊时不一定第一眼知道完成了什么、该继续做什么。

## 本次升级

- `buildGroupMainAgentStatus()` 新增 `ccm-group-main-agent-pickup-summary-v1`。
- 状态接口会从统一交付报告里的 `pickup_summary` 提取并清洗：
  - 当前状态
  - 回看要点
  - 下一步动作
  - 技术详情提示
- `GroupMainAgentStatusCard.vue` 新增“回来继续看这里”区块。
- 前端对旧历史数据里的 `pickup_summary` 再做一次用户可见文本清洗，避免 trace、session、raw payload 等内部字段跑到主文本。
- 普通问话不产生任务状态卡，因此不会展示 Todo 或 pickup summary。
- 技术细节、执行器会话、推理闭环仍默认放在折叠的“技术详情”里。

## 用户可见效果

- 用户回到群聊顶部时，能直接看到“回来继续看这里”。
- 用户不用展开技术详情，就能知道当前任务已完成什么、看哪些要点、下一步可以做什么。
- 状态卡和任务卡共用同一份交付摘要，不额外发明一套不一致的文案来源。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- `git diff --check`：仅保留现有 LF/CRLF 提示，无空白错误。

截图回归覆盖：

- `scratch/render-regression/03-technical-details-folded.png`：群聊状态卡显示“回来继续看这里”，技术详情默认折叠。
- `scratch/render-regression/01-simple-conversation-no-todo.png`：普通问话仍不显示 Todo / 任务状态摘要。
