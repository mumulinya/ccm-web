# 全局主 Agent 派发摘要统一化 v1

日期：2026-07-07

## 背景

群聊主 Agent 已经能在任务计划里展示“已派发的工作”，但全局主 Agent 直接把任务交给群聊主 Agent、项目 Agent 或跨项目开发任务时，用户更多只能看到一段文本。这样会让用户不确定：到底派给了谁、派发是否等于完成、后续去哪里看进度。

参考 Claude Code coordinator 的“launch workers 后简短告诉用户已启动哪些工作，但不能伪造成结果”原则，本次把全局主 Agent 的派发也统一成同一套用户可见结构。

## 本次升级

1. 全局运行链路生成 `dispatch_launch_summary`
   - 覆盖 `orchestrate_development`、`send_group_cmd`、`send_project_cmd`、`create_task`。
   - 结构沿用 `ccm-main-agent-dispatch-launch-summary-v1`。
   - 行级信息包含执行目标、角色、任务、派发原因、状态和依赖。

2. 全局 display stream 透出同一份摘要
   - `display_stream.dispatch_launch_summary`
   - `display_stream.main_agent_decision.dispatch_launch_summary`
   - 普通问话不会生成该结构。

3. 终态任务卡增加派发摘要兜底展示
   - 当最终总结已经收起旧执行计划时，如果后端明确设置 `show_when_plan_archived`，仍展示“已派发的工作”。
   - 用于“全局动作已完成，但下游任务还在群聊任务卡继续执行”的场景。

4. 内部协议默认隐藏
   - `CCM_AGENT_RECEIPT`、`task-notification`、`trace_id`、`session_id`、raw payload 等不会出现在用户可见摘要里。
   - 原始工作单、Trace 和排障字段仍归入技术详情。

## 用户可见效果

全局主 Agent 直派后，用户能看到：

- 已派发的工作
- 目标：群聊主 Agent / 项目 Agent
- 任务：本轮具体要做什么
- 状态：已派发、已入队、已进入任务链路或已执行
- 下一步：去群聊任务卡看计划、执行、验收和最终总结

这能避免“已派发”和“已完成”混淆。

## 验证

已补充覆盖点：

- 全局 loop 自测：
  - 全局长期任务派发会生成派发摘要。
  - 全局直接项目指令会生成派发摘要。
  - 普通问话不会生成派发摘要。
  - 派发摘要不泄露内部协议词。
- 静态 UI 自测：
  - 任务卡支持终态收起计划后的派发摘要展示。
  - 全局 display stream 会携带派发摘要和轻量主 Agent decision。
- Playwright 渲染回归：
  - 新增“全局直派已接管”场景。
  - 断言可见“已派发的工作”“群聊主 Agent · dev-group”。
  - 断言不可见 `CCM_AGENT_RECEIPT` 和 `trace_id`。

## 后续

后续可以继续把全局运行中的实时 SSE 事件也补一条“派发摘要已形成”的友好进展，这样用户在等待最终 response 前就能更早看到派发对象。
