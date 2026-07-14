# 全局助手普通对话轻量呈现 v1

日期：2026-07-12

## 目标

普通问候和普通问答在意图尚未判定或确认无需执行时，只展示轻量回复状态，不向用户暴露 Todo、跨项目任务卡、执行阶段或技术过程。只有确认需要执行操作后，才升级为完整工作卡，并允许用户中途补充要求。

## 用户可见行为

- 普通问话处理中只显示状态点和“正在回复...”。
- 普通问话期间输入框显示“正在回复...”，发送按钮显示“回复中”且不接受任务补充。
- 普通问话完成后直接展示自然语言答案，不展示 Todo 或交付总结模板。
- 真正任务收到 `execute`、确认请求、工具调用、计划、派发或持续跟进事件后，原地升级为完整任务卡。
- 任务升级后输入框恢复“补充要求或调整当前目标...”，继续支持中途调整。
- 历史工具事件和真实任务仍按任务卡展示；历史普通流消息收敛为一行“回复已完成”。

## 实现

- `frontend/src/components/global/GlobalAgent.vue`
  - 增加执行意图确认门控和独立的活动执行态。
  - 将未确认执行意图的 `global_stream` 渲染为轻量回复状态。
  - 输入框、发送按钮和中途补充能力改为依赖已确认执行意图，而不是仅依赖运行 ID。
  - 保留工具、计划、派发、确认、TestAgent 和持续监督事件的任务卡升级能力。
- `backend/modules/global/global-agent.ts`
  - 增加寒暄和简短身份问答的本地普通对话兜底。
  - 模型不可用时为普通对话返回明确的 `conversation` 意图，不触发执行或 Todo。
- `backend/agents/global/loop.ts`
  - 无工具、无任务、无执行意图的完成结果使用 `conversation` 工作链模式。
  - 普通对话的显示流明确关闭 Todo。

## 回归覆盖

- Playwright 新增真实 SSE 普通问候用例：
  - 处理中不出现 `.global-stream-card`。
  - 处理中显示 `.global-stream-replying`。
  - 不出现“补充要求”。
  - 完成后显示纯文本答复。
  - 随后的真实任务仍会升级任务卡并开放中途补充。
- 新增截图：`scratch/render-regression/07m-global-ordinary-replying.png`。
- 截图总数由 36 增加到 37。
- 后端自测覆盖模型不可用时“你好”仍保持普通对话。
- 运行时端到端测试继续验证 `ordinaryGlobalHasNoTodoCard`。

## 验证结果

- `npm run check`：通过。
- `npm run build`：通过。
- `npm run test:render-regression`：通过，37 张截图全部生成。
- `npm run test:main-agent-runtime-e2e`：通过。
- `node scripts/main-agent-decision-ui-selftest.mjs`：通过。

## 边界

本次只调整全局助手普通问话的展示门控和后端普通对话兜底，没有修改 `backend/test-agent/**`，也没有改动群聊任务执行、TestAgent 业务流程或既有任务卡能力。
