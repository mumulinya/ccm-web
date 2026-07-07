# Global Agent Friendly Visible Stream v1

## 背景

参考 cc 的 `SendUserMessage`/Brief 约束：用户真正会读到的内容必须是友好、明确、可行动的文本；原始错误、trace、运行细节只应进入技术详情。全局主 Agent 的任务卡已经有交付总结，但实时状态流和宠物状态在失败时仍可能优先展示 `event.error`。

## 本次升级

- 后端全局 Agent SSE `ui` 失败态改为优先展示 `reply`。
- 如果没有友好回复，失败态显示“任务没有完成，主 Agent 已整理未完成原因和下一步”。
- 工具失败的可见流改为“正在重新判断下一步”，不直接把原始错误作为主文案。
- 桌面宠物状态同步使用工具中文名和友好失败文案。
- 前端旧事件 fallback 同步改为友好文案，避免历史事件或缺少 `ui` 的事件泄漏 raw error。

## 用户可见效果

- 运行中出错时，用户看到的是“执行遇到问题，主 Agent 正在重新判断下一步”。
- 任务失败时，用户看到的是失败总结或可继续操作的下一步。
- 原始错误仍保留在运行数据、trace 和技术详情里，方便排障。

## 验收覆盖

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 守护前端失败流不再使用 `event.error || event.reply` 作为主文案。
  - 守护后端 SSE 失败流走 `sanitizeMainAgentUserText` 和 `globalVisibleText`。
  - 守护原始错误净化能力仍在技术详情/排障路径可用。
