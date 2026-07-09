# Global Quality Followup Resume Message v1

## 背景

质量补齐按钮会发出 `kind: "continue"` 和预设补齐消息。群聊任务卡已经会把该消息传给继续接口，但全局 `agenticRun` 卡片存在一条更早的分支：只要看到 `continue` 就直接调用 `resume`，没有把 `action.message` 带过去。

这会导致全局主 Agent 用户点击“继续补齐总结”后，只恢复运行，却丢掉“请补齐交付证据/验证结果/验收结论”这条明确要求。

## 实现

- `frontend/src/components/global/GlobalAgent.vue`
  - 全局 `agenticRun` 的 `continue` 分支读取 `action.message || action.prompt`。
  - 调用 `controlAgenticRun(msg, "resume", true, preset)`，把预设补齐消息作为 resume feedback 传给后端。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 新增源码级检查，防止全局运行态继续动作再次吞掉 preset message。

## 预期效果

全局主 Agent 的质量补齐卡片点击“继续补齐总结”后，会带着明确补齐消息续跑；群聊主 Agent 与全局主 Agent 的质量补齐动作入口语义一致。

## 验证

已通过：

- `npm run check`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`
