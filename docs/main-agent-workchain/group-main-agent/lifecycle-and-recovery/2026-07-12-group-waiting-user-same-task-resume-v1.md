# 群聊等待用户补充后同任务接续 v1

日期：2026-07-12

## 目标

补齐群聊主 Agent 的等待用户链路：当任务执行或 TestAgent 复核缺少业务条件时，用户从任务卡进入群聊主输入框补充信息；系统必须继续原任务、原 Trace、原执行成员上下文和原验收标准，不得把补充误判成新任务，也不得因“最近任务”猜测而串单。

本轮只负责主 Agent 与 TestAgent 的连接、等待解除、接续和用户展示，不修改 `backend/test-agent/**` 的 TestAgent 内部业务流程。

## Claude Code 对照

参考 `D:\claude-code\src\coordinator\coordinatorMode.ts`：

- `SEND_MESSAGE` 优先向已有 worker 发送补充信息。
- 已有 worker 已加载任务上下文时继续使用原 worker。
- 只有真正独立的新任务才创建新 worker。
- 只有目标方向改变时才停止旧执行轮并重新规划。

本项目对应实现：

- 等待补充固定使用 `continuation_kind: supplement`。
- 固定 `interrupt_current_run: false`，不会因补充测试地址、账号或业务条件而停止当前执行轮。
- 使用 `continuation_task_id` 精确选择原任务，不依赖文本分类或最近任务排序。
- 继续调用现有 `continueTaskWithMessage`，保留 task、trace、pending follow-up、执行成员会话和验收上下文。

## 用户流程

1. 群聊任务卡进入“需要你确认”，主 Agent 说明缺少的信息。
2. 用户点击“补充确认”或等待卡上的追加入口。
3. 群聊主输入框进入任务补充模式：
   - 显示正在补充的任务名称。
   - placeholder 说明发送后会沿用原任务继续执行和验收。
   - 发送按钮显示“提交并继续”。
   - 输入框自动获得焦点。
4. 用户提交文本或附件。
5. 用户原文作为用户消息写入群聊历史，并关联原 `task_id`。
6. 原任务清除 `needs_user` 和恢复等待标记，进入 `reworking`/继续执行状态。
7. 旧的“受阻、等待条件”执行成员行变为“等待重新复核”，避免与已解除等待状态冲突。
8. 主 Agent 继续执行、TestAgent 复验、主 Agent 抽查和最终总结链路。

## 接续请求契约

群聊 Web 端提交以下字段：

```json
{
  "continuation_task_id": "原任务 ID",
  "continuation_kind": "supplement",
  "resolve_waiting_user": true,
  "interrupt_current_run": false,
  "source": "group_web_waiting_user_resolution",
  "force_task": true,
  "message_mode": "project_task",
  "auto_execute": true
}
```

文本和带附件的 multipart 请求使用同一契约；multipart 字符串布尔值由服务端统一解析。

## 服务端保护

- 显式任务 ID 必须存在并属于当前群聊。
- 已取消、归档或删除的任务不能继续。
- 显式接续只接受 `supplement` 或 `revise_goal`。
- 等待补充入口固定发送 `supplement`，因此地址、账号、验证码等短文本不会触发新任务分类。
- `client_message_id` 同时用于群聊消息幂等和任务接续幂等。
- SSE 路由已经写入用户消息时，底层接续函数不再追加第二条“任务补充说明”，避免重复显示。
- 群聊切换会清除当前补充目标，防止跨群误投。
- 建立提交连接失败时会恢复输入内容和附件，保留补充模式供用户重试。

## 展示与隐私

- 用户输入的测试地址、账号等只保留在用户消息和执行上下文。
- 任务卡、接续摘要和时间线统一显示“用户已补充任务所需条件”，不复制具体敏感值。
- 恢复卡显示“任务条件已补充”“并入同一任务”，不显示“重新规划中”。
- 技术详情默认折叠，Trace、session 和底层协议字段不进入主文本。
- 普通问话的 Todo 展示守门保持不变。

## 主要改动

- `frontend/src/composables/useGroupTaskCardActions.js`
  - 等待卡操作改为主输入框回调。
  - 新增统一的等待解除请求字段构造器。
- `frontend/src/components/collaboration/GroupChat.vue`
  - 新增任务补充输入状态、任务名称提示、自动聚焦、取消和失败恢复。
  - 文本与附件请求都携带精确接续契约。
  - 处理 `task_updated` SSE，并在完成后刷新原任务卡。
- `backend/modules/collaboration/group-live-routes.ts`
  - 新增显式任务解析和跨群/终态校验。
  - 显式接续绕过文本意图猜测和最近任务选择。
  - 新增精确路由纯函数自测。
- `backend/modules/collaboration/collaboration.ts`
  - 记录等待解除元数据并清除 `recovery_pending`。
  - 生成用户友好的“任务条件已补充”接续摘要。
  - 防止 SSE 路由与底层函数重复写用户消息。
  - 已解除等待的旧执行成员阻塞行转为等待重新复核。

## 验证结果

已通过：

- 后端 TypeScript `--noEmit`。
- 前端生产构建。
- `runGroupExplicitContinuationRoutingSelfTest()`：
  - 精确选择指定任务而不是最近任务。
  - 拒绝跨群任务。
  - 拒绝已取消任务。
  - 正确解析 multipart 布尔值。
- `node scripts/main-agent-decision-ui-selftest.mjs`。
- `npm run test:chat-experience`。
- `npm run test:replay-regression`：4 张历史回放截图。
- `npm run test:render-regression`：35 张真实浏览器截图。
- `git diff --check`。

新增截图：

- `scratch/render-regression/05a-group-waiting-user-input-mobile.png`
  - 390px 移动端等待卡、主输入框补充模式、任务上下文和“提交并继续”。
- `scratch/render-regression/05b-group-waiting-user-resumed.png`
  - 用户补充消息、原任务恢复、等待重新复核、技术详情折叠和敏感值不复制。

## 边界

- 本轮没有修改或回退 `backend/test-agent/**`。
- 没有提交 Git；按长期目标要求保留工作区，后续统一提交。
- `backend/modules/collaboration/collaboration.ts` 存在其他并行修改，本轮只在任务接续和用户任务卡展示相关位置做窄范围增量。
