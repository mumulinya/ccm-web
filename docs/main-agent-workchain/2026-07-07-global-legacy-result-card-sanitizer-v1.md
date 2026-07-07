# 全局历史结果卡片可见文本清洗 v1

本轮目标：继续完善全局主 Agent 的用户可见链路。群聊任务卡、全局任务卡和任务管理页已经能把内部协议默认收进技术详情，但全局聊天历史里还有两类旧入口：`[处理结果] / [系统回执]` 高阶卡片，以及项目 Agent 运行报告折叠卡片。旧消息或第三方 Agent 输出如果带 `CCM_AGENT_RECEIPT`、`trace_id`、raw payload 等内部词，仍可能在这些入口里直接显示。

## 改动

- `GlobalAgent.vue` 新增 `visibleGlobalText()`，统一复用前端用户可见清洗规则。
- `parseReceipt()` 输出详情前会清洗 `detail.value`：
  - 保留任务标题、业务目标、目标群聊等用户需要看的信息。
  - 内部协议词、trace、raw payload 会变成友好说明。
- `parseProjectReport()` 会清洗项目名和运行报告正文：
  - 成功报告显示为可读运行摘要。
  - 失败报告显示为用户可理解的失败说明，排障细节留给技术详情。
- `formatMissionDeliveryReport()` 的 fallback 拼接段也会清洗 summary、验证、风险、遗留项。
- 静态自测新增 `globalAgentSanitizesLegacyResultCards` 护栏，防止这些旧入口重新直出原始文本。

## 用户效果

- 全局主 Agent 历史消息里的旧处理结果卡片继续可读。
- 用户不会在普通正文或旧报告卡里看到 `CCM_AGENT_RECEIPT`、`trace_id`、raw payload。
- 技术追踪、Trace 回放和任务卡技术详情不受影响。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`

后续继续运行构建和主 Agent 回归，确保全局组件生产构建正常。
