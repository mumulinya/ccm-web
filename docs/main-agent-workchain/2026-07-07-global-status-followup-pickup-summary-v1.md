# Global Status Followup Pickup Summary V1

日期：2026-07-07

## 背景

全局主 Agent 已经能识别“现在进展怎么样 / 完成了吗”这类状态追问，并且会展示全局任务、直派任务和子 Agent 等待情况。继续参考 Claude Code 的 `task_summary/post_turn_summary/away_summary` 思路后，还需要让全局状态追问复用最终交付里的 `pickup_summary`，让用户回来后得到一致的“看这里”摘要。

## 本次升级

- `formatMissionStatus()` 新增 `getGlobalStatusPickupSummary()`。
- 全局任务和全局直派任务的状态摘要会优先展示：
  - “回来继续看这里”：当前状态
  - “回看要点”：改动、验证、接续或验收要点
  - 下一步：优先使用 `pickup_summary.resume_action`
- 对旧数据继续做用户可见文本清洗，`CCM_AGENT_RECEIPT`、`trace_id`、`session_id`、raw payload 等不进入可见摘要。
- 普通问话不走状态追问逻辑，因此不会显示 Todo 或任务摘要。

## 验证

- `runGlobalAgentDisplaySelfTest()` 新增 `globalStatusShowsPickupSummary`。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加 `getGlobalStatusPickupSummary` 和 `回看要点` 的静态覆盖。
