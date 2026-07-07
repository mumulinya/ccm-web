# Plan Confirmation Feedback v1

## 背景

参考 `D:\claude-code\src\components\permissions\ExitPlanModePermissionRequest\ExitPlanModePermissionRequest.tsx`，Claude Code 在用户同意计划时支持顺手补充一句执行要求，例如“同时更新 README”，并把这条反馈随同同一次执行继续传递，避免先拒绝计划再重新调整。

## 本次升级

- 群聊任务卡在“执行前计划待确认”时显示一个可选补充输入框。
- 点击“确认执行”时，前端会把补充内容作为 `accept_feedback` 提交到 `/api/usability/intake/confirm`。
- 后端确认接口会把补充要求写入同一个 Task/Trace：
  - `workflow_meta.plan_mode.accepted_feedback`
  - `workflow_meta.intake.accepted_feedback`
  - `plan_accept_feedback`
  - `source_documents`
  - `acceptance_criteria`
- 子 Agent 工作单会继续读取任务验收标准和关联文档，因此能看到用户确认计划时追加的要求。
- 任务时间线和 Trace 会记录“用户确认执行，并补充执行要求”，但用户主视图保持友好文案，底层字段仍放在技术详情或原始记录中。

## 验证

- 静态自测新增：
  - 任务卡渲染确认补充输入框。
  - 群聊动作处理提交 `accept_feedback`。
  - 后端确认计划会携带并展示 `accepted_feedback`。
- Playwright 渲染回归新增真实交互：
  - 在计划确认输入框填写补充要求。
  - 点击“确认执行”。
  - 断言发出的 action 携带 `accept_feedback`。
- 验证时发现 `backend/tools/tool-authorization.ts` 的公开函数返回值推断到了 `tool-manager` 的内部 `McpServerStatus`，已补显式返回类型，避免阻塞 `npm run check` / `npm run build`。
- 后端 emit 还暴露出 `group-memory-index.ts` 外部 include approval 自测对象的 `{}` 窄类型推断，已补显式 `any`，只影响类型声明生成，不改变运行逻辑。
