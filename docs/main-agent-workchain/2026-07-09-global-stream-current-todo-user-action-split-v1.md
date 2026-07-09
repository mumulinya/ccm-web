# 全局流式当前 Todo 与用户动作分流 v1

## 背景

参考 `D:\claude-code` 的 Plan Mode 与任务状态展示：任务进展应区分“系统正在做/下一步会做什么”和“需要用户审批或补充什么”。

此前全局主 agent 的流式当前 Todo 会把 `next_action` 或步骤详情兜底到 `needs_action`，导致“继续执行计划，并在完成后给出总结”这类系统动作被显示成“需要：继续执行计划”。这会让用户误以为任务正在等待自己操作。

## 本次改动

- 全局流式当前 Todo 新增用户动作识别。
- 只有包含“等待你确认、请确认、补充、授权、回复、上传、选择”等真实用户动作时，才显示“需要”。
- 普通系统推进动作继续显示在“下一步”。
- 截图回归同步移除旧断言，避免再次把“系统动作显示成用户需要”固定回来。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:frontend`
- `npm run test:render-regression`
- `git diff --check`

