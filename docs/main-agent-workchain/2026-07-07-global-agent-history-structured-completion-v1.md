# Global Agent History Structured Completion V1

日期：2026-07-07

## 背景

长期目标要求全局主 Agent 和群聊主 Agent 都能形成“计划 -> 执行 -> 验收 -> 总结”的完整链路，并且完成后用户能继续在历史记录里看到友好的交付结果。

本轮检查发现一个实际缺口：全局 Agent 前端消息里已经有 `agenticRun.final_delivery_report`、`display_stream`、`progress_checkpoints` 等结构化字段，但后端 `/api/global-agent/history` 保存时只保留 `role/content/timestamp`。刷新页面或跨端同步后，历史消息可能只剩文本，任务卡、交付报告、技术详情和完成 checkpoint 都会丢失。

## 改动

- 后端 `normalizeGlobalAgentMessages()` 保留安全的结构化历史字段：
  - `type`
  - `agenticRun`
  - `globalMission`
  - `globalMissionChildren`
  - `globalMissionSupervisor`
  - `progress_checkpoints`
  - `final_delivery_report`
  - `delivery_report`
  - `display_stream`
  - `workchain`
  - `technical`
  - `trace_id / mission_id / run_id`
- 后端历史合并从“同 key 直接跳过”改为“同 key 合并元数据”，避免纯文本版本挡掉更完整的结构化版本。
- 大型结构化字段会被截断为 `{ truncated, preview, original_chars }`，避免历史文件无限膨胀。
- 前端 `useGlobalAgentSessions` 同步合并也改为保留更完整的消息元数据。
- 前端变更检测从只比较 `role/content/timestamp` 改为比较完整消息签名，确保结构化字段补齐后会持久化到本地历史。
- 新增后端自测 `runGlobalAgentHistorySyncSelfTest()`。
- `unified-chat-task-experience-selftest` 新增用例：纯文本历史消息与结构化完成消息合并后，仍能恢复全局任务卡和交付报告。
- Playwright 主 Agent 展示 fixture 新增“全局历史完成态”任务卡，覆盖刷新后结构化交付报告的真实渲染。

## 用户体验

- 用户刷新页面后，全局主 Agent 完成态仍能显示任务卡、交付总结、改动文件、验证结果和技术详情。
- 普通问答仍不会被强制变成任务卡。
- 技术字段不直接出现在普通文本里，只作为结构化数据供任务卡和折叠技术详情使用。

## 验证

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `node scripts/unified-chat-task-experience-selftest.mjs`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `node -e "const m=require('./ccm-package/dist/modules/global/global-agent.js'); const r=m.runGlobalAgentHistorySyncSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1);"`

渲染截图输出：

- `scratch/render-regression/03-technical-details-folded.png`

该截图现在同时覆盖群聊主 Agent 完成态、全局主 Agent 历史完成态、交付总结真实渲染和技术详情默认折叠。

## 后续

下一步可以继续补全局主 Agent 的“失败/取消完成态”历史展示，让用户刷新后也能清楚看到未完成原因、风险和下一步。
