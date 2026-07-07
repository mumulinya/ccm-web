# Global Agent Terminal Failure Summary v1

## 背景

全局主 Agent 的历史完成态已经能保留结构化交付总结，但失败和取消态还容易退回成普通文本或原始错误。实际使用时，用户需要看到“任务有没有完成、为什么没完成、下一步怎么继续”，而不是 trace、session、stack 这类技术信息。

## 本次升级

- 全局主 Agent 的失败态会自动生成统一交付报告兜底结构。
- 取消态会生成“停止说明”，避免被误读成已完成。
- 失败原因支持字符串或数组，不会把字符串拆散。
- 失败和取消卡片继续保留“技术详情”折叠区，用户默认先看到友好总结。
- Playwright 真实渲染回归加入全局历史失败/取消卡片断言。

## 用户可见效果

- 失败：显示“处理结果”“涉及范围”“验证结果”“未完成原因”“下一步”。
- 取消：显示“停止说明”“涉及范围”“验证结果”“风险与待确认”“下一步”。
- 下一步会提示重新执行或重新发起需求。
- 普通问话仍不会展示 Todo 或任务交付卡。

## 验收覆盖

- `scripts/unified-chat-task-experience-selftest.mjs`
  - 验证全局失败态有 `failed` 交付报告、完整失败原因、重新执行动作。
  - 验证全局取消态有 `cancelled` 交付报告、停止说明、重新发起提示。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 静态守护失败/取消兜底报告入口和字符串风险归一化。
- `scripts/main-agent-render-regression.mjs`
  - 截图回归验证失败/取消卡片真实渲染、关键文案可见、技术详情默认折叠。
- `backend/agents/delivery-report.ts`
  - 后端交付报告自测补充失败/取消栏目断言。
