# 群聊执行前澄清同请求接续 v1

日期：2026-07-12

## 目标

补齐群聊主 Agent 在任务创建前的澄清链路：当原始需求信息不足时，主 Agent 先向用户追问；用户只回复“前后端都改”“需要保留旧数据”这类简短答案后，系统必须把答案接回原始请求继续判断、计划或执行，不能把简短答案当成普通问话或独立新任务。

这和“已有任务等待条件后继续”是两个不同阶段：

- 执行前澄清：尚未创建任务，需要保留原始请求并继续同一判断链。
- 执行中等待：已经有 task/trace，需要继续原任务和执行成员会话。

## Claude Code 对照

参考 `D:\claude-code` 的 `AskUserQuestion` 与协调模式：

- 追问是当前请求的一部分，不是结束后另开一次无上下文请求。
- 用户回答后继续使用原始目标、已读取上下文和当前计划状态。
- 只有用户明确开始新任务时才退出当前澄清链。
- 用户可见区域展示问题和下一步，内部恢复标识不进入主文本。

## 审计结论

### 全局主 Agent

全局链路已经完整：

- `waiting_clarification` run 会持久化。
- `findClarifyingGlobalAgentRun` 能找到同一会话中的等待运行。
- `continueGlobalAgentRunWithClarification` 把问题和回答写回同一 run history。
- 原 reasoning loop、effective goal、授权范围、计划版本和 Trace 会继续使用。
- 前端“补充信息”入口继续同一个 run。

本轮没有修改全局实现，只运行现有全局 loop 自测确认该链路仍然通过。

### 群聊主 Agent

此前只完成了澄清卡展示：问题、原因、建议回答和下一步可以持久化，但没有保存可恢复的原始请求；用户下一条“前后端都改”仍会重新经过普通消息分类。

## 本次实现

### 1. 持久化澄清上下文

群聊主 Agent 输出 `ask_user` 时，历史消息新增 `ccm-group-clarification-context-v1`：

- 澄清请求 ID。
- 回答目标消息 ID。
- 原始用户请求。
- 供主 Agent 继续使用的完整原始输入。
- 当前问题。
- 原消息模式和目标成员。
- 原 Trace ID。
- pending/resolved 状态和回答消息 ID。

该对象不直接渲染到用户主文本。

### 2. 主输入框回答模式

前端收到带 pending 澄清上下文的回复后：

- 主输入框自动进入“正在回答”模式。
- 显示当前需要回答的问题。
- placeholder 说明会接着原请求继续判断。
- 发送按钮显示“提交补充”。
- `/` 命令、模板推荐和 `@` 成员下拉在回答模式下不会抢占用户输入。
- 切换群聊会清理当前回答目标，避免跨群提交。
- 刷新后会从历史消息恢复仍未回答的澄清请求。

提交字段：

```json
{
  "clarification_request_id": "澄清请求 ID",
  "clarification_message_id": "问题消息 ID",
  "resolve_clarification": true,
  "source": "group_web_clarification_response",
  "message_mode": "原消息模式"
}
```

### 3. 同一请求继续判断

服务端校验请求属于当前群聊且仍为 pending 后，向主 Agent 组织以下内部上下文：

```text
[原始请求]
修复登录状态恢复逻辑，完成修改、测试和最终总结。

[此前需要确认]
这次是只改前端入口，还是也要补后端接口？

[用户补充]
前后端都改

[接续要求]
这是对同一请求的补充回答，请继续原请求，不要把简短回答当成独立新任务。
```

用户历史中仍只显示“前后端都改”，不会重复显示整段内部恢复上下文。

### 4. 目标、计划和追踪保持

- 新任务标题从合并后的原始需求提取，不会命名成“前后端都改”。
- `business_goal`、执行前计划、任务说明和执行成员指令包含原始需求与补充范围。
- 新任务沿用原澄清 Trace ID。
- `workflow_meta.intake` 记录澄清请求、问题消息、回答消息和原 Trace。
- 只有主 Agent 成功生成任务卡或后续回复后，旧澄清才标记为 resolved；处理中断不会吞掉用户答案。
- 已 resolved 的澄清不能再次回答。

## 用户展示

- 追问前不显示 Todo 或任务卡。
- 回答后旧澄清卡显示“已补充”。
- 用户简短回答作为普通用户消息显示。
- 如果合并后的需求需要执行，随后显示原始任务标题、完整目标和 Todo 计划。
- 澄清请求 ID、Trace、恢复 prompt 等技术内容默认不可见。
- 技术详情继续默认折叠。

## 主要文件

- `backend/modules/collaboration/group-live-routes.ts`
- `frontend/src/components/collaboration/GroupChat.vue`
- `frontend/src/composables/useGroupTaskCardActions.js`
- `frontend/visual-regression/main-agent-display-fixture.js`
- `scripts/main-agent-decision-ui-selftest.mjs`
- `scripts/main-agent-render-regression.mjs`

## 验证

已通过：

- 后端 TypeScript `--noEmit`。
- 前端生产构建。
- `runGroupClarificationContinuationSelfTest()`：
  - 精确选择指定 pending 问题。
  - 忽略 resolved 问题。
  - 保留原始请求。
  - 同时携带问题与回答。
  - 防止简短回答成为独立新任务。
- `runGlobalAgentLoopSelfTest()`：全局既有澄清恢复链继续通过。
- `node scripts/main-agent-decision-ui-selftest.mjs`。
- `npm run test:chat-experience`。
- `npm run test:replay-regression`：4 张历史回放截图。
- `npm run test:render-regression`：36 张真实浏览器截图。
- `git diff --check`。

新增截图：

- `scratch/render-regression/05c-group-clarification-resumed.png`
  - 旧问题已补充。
  - 用户回答为“前后端都改”。
  - 新任务标题仍为“修复登录状态恢复逻辑”。
  - Todo 明确包含前后端计划和 TestAgent 复核。
  - 技术详情默认折叠。

## 并行工作区边界

- 本轮没有修改或回退 `backend/test-agent/**`。
- TestAgent 内部流程继续由并行 Agent 维护；本轮只保证主 Agent 在澄清完成后能把完整需求送入后续执行、复核和总结链。
- 没有提交 Git，后续按用户要求统一提交。
