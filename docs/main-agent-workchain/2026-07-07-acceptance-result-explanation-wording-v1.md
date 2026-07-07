# 验收与返工结果说明文案硬化 v1

## 背景

参考 Claude Code 的 coordinator 模式，worker / 子 Agent 的原始结果是内部信号，主 Agent 需要把它整理成用户能理解的状态、缺口和最终总结。

项目里已经把大部分用户可见文本从“回执”改成“结果说明”，但验收门禁、定向返工建议、timeline、能力诊断和截图 fixture 中仍有少量用户会看到的旧术语。它们会让用户感觉自己在看底层协议，而不是在看任务是否完成。

## 本次升级

- 后端任务卡缺口和验收门禁改为展示：
  - `子 Agent 结果说明`
  - `结果说明质量`
  - `记忆使用声明`
  - `压缩重注入声明`
- 工作项 timeline、任务日志、执行状态、继续执行 next action 改为“提交结果说明 / 验收结果说明”。
- 定向返工建议兼容旧缺口名，但新展示统一为“补结果说明 / 补消费说明”。
- 系统诊断和能力证明中的“子 Agent 执行与回执”改为“子 Agent 执行与结果说明”。
- 渲染回归 fixture 的用户可见字段不再出现中文“回执”，仍保留内部 `receipt` 字段和 `CCM_AGENT_RECEIPT` 技术协议用于折叠详情验证。

## 保留边界

- 内部字段名、`receipt_status`、`receipt_quality`、`CCM_AGENT_RECEIPT` 不改，避免破坏第三方写代码 Agent 的结构化协议。
- 发给子 Agent 的工作单仍可明确要求结构化 receipt，因为这是机器可解析契约；用户界面和主 Agent 总结使用“结果说明”。

## 守护

`scripts/main-agent-decision-ui-selftest.mjs` 增加：

- 后端用户可见状态不再包含“子 Agent 执行与回执”“完成回执验收”“工作项回执”等旧短语。
- `frontend/visual-regression/main-agent-display-fixture.js` 不再包含中文“回执”，并确认渲染 fixture 中出现“结果说明质量”“补充结果说明后继续验收”。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`：通过。
- `git diff --check -- backend/modules/collaboration/collaboration.ts frontend/visual-regression/main-agent-display-fixture.js scripts/main-agent-decision-ui-selftest.mjs docs/main-agent-workchain/2026-07-07-acceptance-result-explanation-wording-v1.md`：通过，仅提示 Windows 换行转换。
- `npm run check`：通过。
- `npm run test:chat-experience`：通过，普通问话仍保持直接回复，任务链路仍隐藏内部协议。
- `npm run test:render-regression`：通过，生成真实渲染截图：
  - `scratch/render-regression/01-simple-conversation-no-todo.png`
  - `scratch/render-regression/02-task-plan-visible.png`
  - `scratch/render-regression/03-technical-details-folded.png`
  - `scratch/render-regression/04-global-stream-dispatch-panel.png`
  - `scratch/render-regression/05-code-change-drawer-open.png`
  - `scratch/render-regression/06-child-agent-summary-expanded.png`
- `npm --prefix frontend run build`：通过。
- `npm run build`：通过，前端、飞书 MCP 集成、后端均完成构建。
