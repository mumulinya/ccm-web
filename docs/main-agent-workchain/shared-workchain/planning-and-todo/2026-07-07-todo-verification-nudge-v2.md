# Todo 真实验证提醒 v2

## 背景

对照 `D:\claude-code\src\tools\TodoWriteTool\TodoWriteTool.ts` 与 `D:\claude-code\src\tools\TaskUpdateTool\TaskUpdateTool.ts`，CC 在主线程 Todo/Task 列表一次性关闭 3 项以上、但没有 verification 任务时，会在最终总结前提醒模型先补验证。

本项目已有“还缺验收步骤”提醒，但原先的识别规则把“验收”“复核”等泛词也算作验证步骤。这样会出现一个问题：计划里有“主 Agent 验收子 Agent 结果”“生成最终交付报告”，但没有真实测试、验证命令或检查结果时，提醒可能被错误压掉。

## 本次改动

- 收紧后端 `MAIN_AGENT_VERIFICATION_STEP_PATTERN`：
  - 计入真实验证：验证、测试、运行检查、执行检查、检查命令/结果/通过/失败、`verify`、`test`、`typecheck`、`lint`、`build`、`check`。
  - 不再把普通“验收”“复核”单独当成真实验证。
- `buildMainAgentPlanVerificationReminder()` 的原因文案改为“缺少真实验证、测试或检查步骤”。
- 新增自测：
  - 计划包含“主 Agent 验收子 Agent 结果”和“生成最终交付报告”。
  - 没有真实验证/测试/检查步骤。
  - 仍应生成 `ccm-main-agent-plan-verification-reminder-v1`。
- 同步前端 fallback：
  - 全局主 Agent 流式 Todo 的 `GLOBAL_TODO_VERIFICATION_PATTERN`。
  - 执行队列工作项的 `WORK_ITEM_VERIFICATION_PATTERN`。
- 静态自测防退化：
  - 确认 review-only 步骤不会压掉提醒。
  - 确认前端 fallback 不再用“验收”泛词开头作为验证识别。

## 用户可见策略

用户看到的是“还缺验收步骤：完成前需要补一项真实验证，或者说明为什么当前不能验证”。这保持了友好的产品语言，但内部判断会更严格：主 Agent 的最终验收/总结不等同于真实验证证据。

## 预期效果

群聊主 Agent 和全局主 Agent 在复杂任务中关闭多个 Todo 后，如果没有真实验证步骤，会继续提醒补验证，而不是因为出现“验收/总结”字样就进入最终交付。这能减少空口完成，让用户更容易相信最终总结里的交付结论。
