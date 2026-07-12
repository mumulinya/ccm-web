# 全局任务等待补充后同任务接续 v1

日期：2026-07-12

## 目标

补齐全局任务进入“等待用户补充”后的真实接续链路：

`任务等待条件 -> 用户在主输入框补充 -> 写入同一会话 -> 继续同一 mission/执行成员 -> 重新验证与验收 -> 单次最终总结`

本轮重点是保证“补充测试地址、账号、环境条件”等信息不会被误判为目标变更，不会停止旧执行轮，也不会创建一个脱离原计划和验收证据的新任务。

## 原问题

- 等待卡的“补充确认”使用浏览器弹窗，不是在主对话输入框中完成。
- 提交时只传拼接后的 `business_goal` 和“继续修改”原因，后端分类器可能判为 `revise_goal`。
- 一次条件补充可能触发停止旧执行、重新规划，而用户只是想提供测试条件。
- 补充内容没有稳定作为用户消息写入全局会话历史。
- supervisor 的旧 `waiting_user` incident 没有解决标记，恢复后任务卡仍可能读取旧等待原因。
- supervisor 恢复后，关联 global run 没有在控制接口响应中立即同步。
- 测试地址或账号内容会被重复拼进业务目标和恢复任务卡。

## 对照 Claude Code

参考 `D:\claude-code\src\coordinator\coordinatorMode.ts`：已有执行成员需要继续处理时，使用 `send_message` 向原 worker 发送 follow-up；只有独立工作才创建新 worker。主 Agent 需要先理解补充内容，再决定继续原 worker 还是创建新工作。

参考 `D:\claude-code\src\cli\print.ts` 的输入队列：长任务期间积累的 prompt 会作为后续轮次接入当前上下文，不应被拆成互不相关的多个任务。

本次把这一语义映射到 CCM 的 mission、supervisor、child task、global run 和会话历史，没有复制 Claude Code 的内部实现。

## 实现

### 1. 主输入框接收补充条件

- 点击等待卡“补充确认”后，聚焦全局聊天主输入框。
- 输入框显示“补充当前任务需要的信息，发送后会继续原任务”。
- 提交按钮显示“提交并继续”。
- 补充期间禁用附件入口，避免附件被误发成独立新任务。
- 切换会话会清理尚未提交的任务接续目标，防止跨会话误投。

### 2. 固定为同任务 supplement

- 请求明确携带 `continuation_kind: supplement`。
- 明确携带 `resolve_waiting_user: true` 和 `interrupt_current_run: false`。
- 沿用原 mission ID、supervisor ID、业务目标和验收标准。
- 原始补充通过 `message` 传入原 child task 的 follow-up，不拼进长期业务目标。
- 控制结果为失败时不清除等待态，也不伪装为已恢复。

### 3. 会话与运行状态同步

- 补充内容先作为 `global_mission_user_input` 用户消息写入当前会话。
- 后端控制接口使用相同时间戳写入服务端全局历史，历史合并后不会丢失。
- supervisor 从 `waiting_user` 回到 `monitoring`。
- 关联 global run 同步回到持续监督状态，并随 API 响应返回前端。
- 同一 mission 的历史任务卡一起刷新，等待通知转回活动任务卡。

### 4. 等待事件解决与隐私边界

- 未解决的 `waiting_user` incident 才参与当前等待原因展示。
- 条件补充成功后，旧 incident 写入 `resolved_at`、解决来源和通用解决说明。
- 恢复卡显示“任务条件已补充”“用户已补充任务所需条件”。
- 测试地址、账号或其他具体条件只保留在用户自己的消息和执行上下文中，不重复显示在业务目标或恢复卡摘要里。
- Trace、supervisor ID、请求 ID 和原始控制字段继续放在折叠技术详情中。

## 验证

- 后端 TypeScript `--noEmit`：通过。
- `runGlobalMissionSupervisorAsyncSelfTest()`：通过。
- 异步自测覆盖：同一 mission ID、supplement、不重新规划、不停止当前轮、旧等待 incident 已解决、最终验收通过、最终通知仅一次。
- `node scripts/unified-chat-task-experience-selftest.mjs`：通过。
- `node scripts/main-agent-decision-ui-selftest.mjs`：通过。
- 前端生产构建：通过。
- Playwright 真实渲染回归扩展为 33 张截图。
- 新截图：`scratch/render-regression/07l-global-mission-waiting-user-resumed.png`。
- 点击式场景覆盖：等待卡 -> 补充确认 -> 主输入框 -> 提交并继续 -> 用户消息入历史 -> 原任务恢复 -> 无重新规划文案。

## 边界

- 本轮没有修改 `backend/test-agent/**`；该目录仍由负责 TestAgent 的并行 Agent 维护。
- 工作区存在其他并行修改和构建产物，本轮不回退、不覆盖，也不提交代码。
