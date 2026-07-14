# Workchain Quality Followup Action v1

## 背景

质量补齐场景已经能显示“最终交付总结还在补齐”、Todo 和关键进展，但用户在卡片上还缺少一个明确动作入口。实际使用中，用户看到“还需补齐”后应该能直接点“继续补齐总结”，而不是再手动输入同一句要求。

## 实现

- `frontend/src/components/tasks/TaskExperienceCard.vue`
  - 新增 `qualityFollowupAction`。
  - 质量补齐卡片展示“继续补齐总结”按钮。
  - 按钮发出 `kind: "continue"`、`source: "quality_followup"`，并携带默认补齐消息。

- `frontend/src/composables/useGroupTaskCardActions.js`
  - `continue` 动作支持读取 `action.message` / `action.prompt`。
  - 有预设消息时直接继续，不再要求用户重新输入。

- `frontend/src/components/global/GlobalAgent.vue`
  - 全局任务卡 `continue` 动作同样支持 `action.message` / `action.prompt`。

- `scripts/main-agent-render-regression.mjs`
  - 截图回归断言按钮可见。
  - 真实点击按钮并确认 action 载荷包含 `kind: "continue"`、`source: "quality_followup"` 和补齐总结消息。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加源码级检查，防止按钮和 preset message 支持被删除。

## 预期效果

当群聊主 Agent 或全局主 Agent 的最终总结缺证据时，用户能直接点“继续补齐总结”，系统复用当前任务上下文继续补齐，而技术细节仍默认折叠。

## 验证

已通过：

- `npm run check`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`

回归说明：

- render regression 确认“继续补齐总结”按钮可见。
- render regression 真实点击按钮，并确认 action 载荷为 `kind: "continue"`、`source: "quality_followup"`，且默认消息包含补齐交付证据。
