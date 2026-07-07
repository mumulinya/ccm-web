# 交付报告独立复核结论 v1

## 背景

长期目标要求群聊主 Agent 和全局主 Agent 像 Claude Code 一样，对复杂任务形成计划、执行、验收和总结的完整链路。`D:\claude-code\src\constants\prompts.ts` 对非平凡实现有独立验证要求：主 Agent 最终对用户汇报负责，不能只依赖执行 Agent 自己的结果。

本项目此前已有复杂变更独立复核门禁，会阻止缺复核的复杂代码任务被宣布完成。但统一交付报告主要展示完成内容、验证、验收和风险，用户不一定能直接看到“这次复杂变更是否经过另一个 Agent 复核”。

## 本次升级

- `ccm-main-agent-delivery-report-v1` 增加 `independent_review` / `independentReview` 字段。
- 当任务触发独立复核或已有复核证据时，交付报告新增“复核结论”section。
- 后端从 `independent_review_gate`、`independent_review_evidence`、`independentReview`、`codeReview` 等现有字段整理用户可读摘要。
- Pickup 摘要增加“复核：...”复看项，且仍保持风险/停止原因优先。
- 前端任务卡交付报告展示上限从 8 个 section 扩到 9 个 section，避免“复核结论”挤掉“接下来建议”。
- 历史恢复 fallback 的用户交接证据会补充复核摘要。

## 用户可见规则

- 普通小任务不展示“复核结论”，避免给用户增加噪音。
- 复杂任务展示“独立复核：已通过 / 待补齐 / 未通过”等自然语言结论。
- reviewer、verdict 和摘要会被压缩成可读证据；原始回执、trace、session、runtime 仍放入技术详情。
- 如果复核缺失或未通过，它仍作为风险/待处理项优先提示。

## 验收点

- 统一交付报告 markdown 能出现“复核结论”。
- 全局历史保留 `independent_review`。
- 任务卡真实渲染能看到“复核结论”。
- Pickup summary 同时保留风险提示和复核提示。
- 普通问话仍不展示 Todo、任务卡或交付报告。
