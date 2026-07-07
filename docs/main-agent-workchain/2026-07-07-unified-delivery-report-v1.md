# Unified Final Delivery Report V1

本轮目标：让群聊主 Agent 和全局主 Agent 在真正执行、派发、验收或失败后，都用同一套用户可读的最终交付报告；普通问答仍保持自然回复，不展示 Todo 或交付报告。

## 参考 CC 源码

参考 `D:\claude-code` 的几个关键点：

- `src/coordinator/coordinatorMode.ts`：主线程是 coordinator，worker 结果是内部信号，最终由主线程综合后告诉用户。
- `src/tools/TodoWriteTool/TodoWriteTool.ts`：Todo 是运行时进度账本，完成前会提醒验证步骤，避免只写总结不验收。
- `src/tools/ExitPlanModeTool/prompt.ts`：计划只在需要实施变更时展示，普通研究或问答不应强制进入计划审批。

落到本项目后，交付链路变为：

`用户需求 -> 主 Agent 判断普通问答/执行任务 -> 计划/Todo -> 工具或子 Agent 执行 -> 验证/验收 -> 统一交付总结 -> 技术详情折叠排障`

## 已实现

### 共享交付报告模块

新增 `backend/agents/delivery-report.ts`：

- `buildMainAgentDeliveryReport()`
- `formatMainAgentDeliveryReply()`
- `shouldShowMainAgentDeliveryReport()`
- `runMainAgentDeliveryReportSelfTest()`

统一结构：

- `schema: ccm-main-agent-delivery-report-v1`
- `surface: group | global`
- `status/status_label`
- `headline`
- `sections`
  - 完成内容
  - 涉及范围
  - 验证结果
  - 风险与待确认
  - 下一步
- `display_policy`
  - 用户可读优先
  - 技术详情默认折叠
  - 普通问答不展示交付报告

### 群聊主 Agent 接入

更新 `backend/modules/collaboration/task-delivery-report.ts` 和 `backend/modules/collaboration/collaboration.ts`：

- 原 `buildUserDeliveryReport()` 和 `buildTaskGroupReportMessage()` 继续保留接口，但内部使用统一报告。
- `delivery_summary.delivery_report` 持久保存结构化报告。
- 群聊最终消息携带 `delivery_report`，正文展示用户可读总结。

### 全局主 Agent 接入

更新 `backend/agents/global/loop.ts`：

- 执行类完成、失败、取消、异步监工最终完成都会生成 `final_delivery_report`。
- `final_report.delivery_report` 和 `display_stream.delivery_report` 同步透传。
- 普通问答仍然走自然回复，不设置 `final_delivery_report`。
- 自测新增：
  - 执行类 run 有统一交付报告。
  - 普通 answer 不展示交付报告。

### 前端展示接入

更新：

- `frontend/src/utils/agentDisplay.js`
- `frontend/src/utils/taskExperience.js`
- `frontend/src/components/tasks/TaskExperienceCard.vue`
- `frontend/src/components/global/GlobalAgent.vue`

效果：

- 任务卡优先读取 `delivery_report`。
- 卡片显示简洁交付总结章节。
- 技术字段仍放在“技术详情”。
- 全局 mission 完成通知优先展示后端统一报告。

### 自测覆盖

更新 `scripts/main-agent-decision-ui-selftest.mjs`：

- 检查统一报告模块存在。
- 检查群聊和全局后端都接入统一报告。
- 检查任务卡能渲染统一报告。
- 检查普通问答隐藏报告策略存在。

## 用户体验约束

- 用户看到的是“做了什么、改了哪里、验证了什么、还有什么风险、下一步怎么办”。
- 不在普通正文暴露 `CCM_AGENT_RECEIPT`、Trace、session、runtime kernel 等内部词。
- 技术内容继续放进折叠的“技术详情”。
- 普通聊天、知识问答、原理说明不展示 Todo、执行队列或最终交付报告。

## 待验证

本轮代码完成后需要执行：

- `npm run check`
- `npm run build`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `node -e "const m=require('./ccm-package/dist/agents/delivery-report.js'); console.log(JSON.stringify(m.runMainAgentDeliveryReportSelfTest(), null, 2))"`
- `node -e "const m=require('./ccm-package/dist/agents/global/loop.js'); m.runGlobalAgentLoopSelfTest().then(r=>console.log(JSON.stringify({pass:r.pass, deliveryReport:r.deliveryReport}, null, 2)))"`
- `npm run test:render-regression`
- `npm run test:chat-experience`
