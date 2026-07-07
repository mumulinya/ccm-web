# 全局直派完成总结记忆回写 V1

## 背景

全局 Agent 直接派发任务给群聊主 Agent 后，上一版已经能在群聊任务通过验收时，把最终总结回写到全局 Agent 的会话历史。

但这份总结如果只存在会话历史里，全局 Agent 的长期记忆不一定立即知道“这个任务已经完成、通过了什么验证、还有没有风险”。用户后续追问历史任务时，Agent 可能需要等前端历史再次同步才有机会沉淀记忆。

## 本次升级

- 新增 `recordGlobalDirectDispatchMemory()`，专门记录全局直派到群聊主 Agent 的最终交付结论。
- 群聊任务通过验收并回写全局会话时，同步写入全局 Agent 长期记忆。
- 写入内容包括：
  - 全局直派任务 ID
  - 用户目标
  - 群聊与主执行方
  - 修改文件
  - 验证结果
  - 风险与遗留项
- 任务元数据会记录 `memory_writeback_at`、`memory_writeback_item_id` 和失败原因，便于技术详情排查。
- 记忆写入失败不会阻断用户可见的最终总结，只会进入 Trace。

## 用户体验

- 用户后续问“刚才群聊主 Agent 那个任务完成了吗”，全局 Agent 可以从长期记忆里召回最终交付结论。
- 普通可见回复仍保持友好中文；记忆 ID、Trace、内部回执和排障信息继续留在技术详情。

## 自测覆盖

- `runGlobalAgentMemorySelfTest()` 增加 `globalDirectDispatchCompletionIsRemembered`。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加后端静态链路检查，确保协作完成回写会调用全局记忆写入。

