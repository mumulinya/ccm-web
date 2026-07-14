# 全局主 Agent 完成态兜底文案收紧 v1

## 背景

用户可见文本里不能把“结果已返回”或“本轮流结束”误写成“需求已完成”。真正完成必须以任务卡验收、TestAgent/独立复核、最终交付总结为准。

## 本次调整

- 前端 `GlobalAgent.vue` 新增统一兜底文案：
  - `GLOBAL_RESULT_VISIBLE_FALLBACK`
  - `GLOBAL_STREAM_COMPLETED_FALLBACK`
- SSE `completed` 事件的无回复兜底从“本轮处理完成”改为“处理结果已整理，最终是否交付以总结和验收结果为准”。
- 全局运行结果、飞书桥接回复、历史同步兜底不再默认显示“已处理/已完成”。
- 后端 `global-agent.ts` 同步新增安全兜底，覆盖事件 UI、宠物状态、桥接保存和 public run 序列化。
- 静态自检增加约束：新安全兜底必须存在，旧乐观完成兜底不能回归。

## 不变点

- 已有 `delivery_report` 或全局 mission 已通过全部交付验收时，仍可展示真实完成总结。
- 技术内容仍放入技术详情，用户主文本保持可读、克制。

## 验收

- `scripts/main-agent-decision-ui-selftest.mjs` 已加入回归断言，防止后续重新出现“本轮处理完成/全局 Agent 已完成本轮处理”等无证据完成兜底。
