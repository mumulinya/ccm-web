# Group Status Followup Pickup Summary V1

日期：2026-07-07

## 背景

上一轮已把 `pickup_summary` 放到群聊顶部 `主 Agent 状态` 卡片里。继续对照 Claude Code 的 `task_summary/post_turn_summary/away_summary` 思路后，还需要补齐另一个入口：用户不一定会去看卡片，也可能直接问“现在怎么样了”“完成了吗”。

## 本次升级

- `buildGroupStatusFollowupSummary()` 现在会复用状态对象里的 `pickup_summary`。
- 状态追问文本新增：
  - “回来继续看这里”：当前任务状态
  - “回看要点”：改动、验证、验收等短要点
  - 下一步优先使用 `pickup_summary.resume_action`
- 仍然只在状态追问命中时使用，不会让普通闲聊显示 Todo 或任务摘要。
- 子 Agent 未返回的结果继续明确“不猜测”，底层记录仍提示在技术详情里。

## 验证

- `runGroupStatusFollowupSelfTest()` 新增 `groupStatusFollowupUsesPickupSummary`。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态覆盖，确保后端状态追问包含 pickup summary 链路。
