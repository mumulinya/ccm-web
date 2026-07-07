# Global Stream Tool Summary v1

## 背景

参考 `D:\claude-code` 的 streamlined tool summary：工具调用不应该把用户主视图刷成一串技术事件，用户更需要看到“当前做了哪些动作、是否还在执行、有没有失败”。本项目任务卡里已有工具摘要，但全局主 Agent 的流式处理卡片还主要依赖事件列表。

## 改动

- 在 `frontend/src/components/global/GlobalAgent.vue` 新增 `ccm-global-main-agent-tool-summary-v1`。
- `tool_started`、`tool_completed`、`tool_failed`、`tool_validation_failed` 会更新全局流式“动作摘要”。
- 历史消息或 fixture 没有结构化摘要时，会从已有流式事件里兜底推导。
- 用户主视图只显示：
  - 动作摘要
  - 进行中 / 完成 / 需处理数量
  - 最近一个用户可读动作
- 工具参数、trace、session、raw payload 和底层排障信息仍不进入主视图，继续放在技术详情链路。

## 用户可见规则

- 普通问话不显示动作摘要。
- 只有真实工具执行事件出现时才显示。
- 摘要使用“发送群聊主 Agent 指令”“读取系统状态”等友好动作名称，不展示内部工具参数。

## 验收

- `scripts/main-agent-decision-ui-selftest.mjs` 增加 `globalStreamToolSummaryVisible`。
- Playwright 渲染回归覆盖：
  - 普通问话不显示动作摘要。
  - 自动执行计划显示动作摘要、最近动作和进行中数量。
