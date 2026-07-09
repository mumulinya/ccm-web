# 执行事件结果回传文案 v1

日期：2026-07-09

## 背景

前端执行事件摘要会把执行成员的 `done` 事件压缩展示给用户。这个 `done` 表示执行成员已有结果事件，不等于整项需求已经通过主 Agent 验收。

此前摘要里会出现“已完成”或“执行成员已完成执行”，容易和最终交付完成混淆。

## 改动

- `frontend/src/utils/agentDisplay.js`
  - 将内部 `done/receipt` 文本清洗为“执行成员已提交结构化结果说明，我正在汇总验收。”
  - 将执行事件计数里的 `done` 展示为“已回传结果”。
  - 将默认摘要从“执行成员已完成执行，等待我汇总。”改为“执行成员已回传结果，等待我汇总验收。”

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加 `frontendWorkEventDoneCopyStaysReviewing` 静态守卫。
  - 防止前端执行事件摘要重新使用“已完成执行”或 `parts.push('已完成')`。

## 用户可见效果

- 用户看到执行事件时会理解为“执行成员已经回传，主 Agent 正在汇总验收”。
- 最终“已完成”仍然只应该出现在主 Agent 验收通过后的交付总结里。

## 自测覆盖

- `frontendWorkEventDoneCopyStaysReviewing`
  - 确认前端摘要包含“已回传结果”和“等待我汇总验收”。
  - 确认不再包含“执行成员已完成执行”。
  - 确认不再把 done 事件计数压缩成“已完成”。
