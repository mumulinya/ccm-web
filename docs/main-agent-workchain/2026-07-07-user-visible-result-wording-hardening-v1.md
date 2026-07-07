# User Visible Result Wording Hardening v1

## 背景

群聊主 Agent 和全局主 Agent 的内部协议仍然需要 `receipt` / `CCM_AGENT_RECEIPT` 这类字段，方便主 Agent 判断子 Agent 是否完成、是否缺文件或验证证据。但这些词不应该直接出现在用户主视图里。

## 本次升级

- 任务卡结果复检区块的可见文案从“回执”统一调整为“结果说明”。
- 协作事件流里的 `ACK` 可见表达改为“接单确认”。
- 定向补充建议里的“补回执 / 高质量回执 / 回执评分”统一改为“补结果说明 / 高质量结果说明 / 结果说明评分”。
- 工作单 fallback 验收项从“返回结构化回执”改为“返回结构化结果说明”。
- 子 Agent 完成通知的用户可见文本会把中文“回执”改写成“结果说明”。
- 保留内部协议字段和子 Agent 契约中的 `CCM_AGENT_RECEIPT`，只改变用户可见层。

## 验证

- 后端 UX 自测新增可见文案抽取：
  - `receiptReworkVisibleTextHidesProtocol`
  - `agentCoordinationVisibleTextHidesProtocol`
- 任务通知自测新增中文“回执”泄漏检查。
- 静态自测新增对应接线检查。
- 回归重点：用户主视图只看到“结果说明/结果复检/接单确认”，技术协议仍可在技术详情和内部执行链路中保留。
