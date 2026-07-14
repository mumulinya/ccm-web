# 子 Agent 交接型结果质量门禁 v1

## 背景

对照 `D:\claude-code\src\tools\AgentTool\agentToolUtils.ts`，CC 在子 Agent 交回控制权时会提醒主 Agent 复核子 Agent 的动作和输出，不能直接把子 Agent 的最终文本当作已完成事实。

本项目此前已经能检查子 Agent 是否提交结构化结果说明、文件变更、验证记录和记忆 gate，但还缺少一类更贴近实际使用的质量门禁：子 Agent 标记 `done`，内容却是“建议主 Agent 修改”“未实际修改文件”“未执行验证”。这种结果不能被主 Agent 当成完成。

## 本次改动

- 在 `scoreChildAgentReceipt()` 中新增 `handoff_quality`，schema 为 `ccm-child-agent-handoff-quality-v1`。
- 识别“只是建议/交接”的完成结果：
  - 子 Agent 声称已完成，但文本包含交给主 Agent、建议后续处理、未实际修改、未执行验证、只提供方案等信号。
  - 对代码变更任务缺少真实文件证据。
  - 对开发任务缺少已执行验证证据。
- 新增结果说明检查项：`完成执行而非仅建议`。
- 若命中该门禁，结果说明评分会硬降为非通过，避免主 Agent 误判完成。
- 在精准返工建议中新增 `handoff_only_receipt`：
  - 用户可见标题：`要求补齐真实执行证据`
  - 用户可见原因：说明子 Agent 的结果更像建议或交接，需要补齐真实修改/验证证据。

## 用户可见策略

- 用户看到的是“需要补齐真实执行证据”“缺少可验收的真实修改/验证证据”。
- 内部协议、trace、session、raw payload、`CCM_AGENT_RECEIPT` 等仍留在技术详情或内部结构中，不进入普通用户文本。
- 普通问话不触发 Todo、任务卡或该质量门禁。

## 自测覆盖

- `runCollaborationUxSelfTest()` 新增 handoff-only fixture：
  - 子 Agent 状态为 `done`。
  - 内容为“建议主 Agent 修改 LoginStore.vue，未实际修改文件，也未执行验证”。
  - 预期 `handoff_quality.pass === false`。
  - 预期生成 `handoff_only_receipt` 定向返工建议。
  - 预期用户可见文本不泄露内部协议词。
- `scripts/main-agent-decision-ui-selftest.mjs` 新增静态防退化检查：
  - `evaluateChildAgentHandoffQuality`
  - `ccm-child-agent-handoff-quality-v1`
  - `handoff_only_receipt`
  - `完成执行而非仅建议`
  - `要求补齐真实执行证据`

## 预期效果

当用户把真实开发任务交给群聊主 Agent 或全局主 Agent 时，子 Agent 不能用“建议/方案/交接”冒充完成。主 Agent 会把这类结果识别为未完成，继续定向要求子 Agent 补真实执行证据，并最终给用户一份可理解的总结。
