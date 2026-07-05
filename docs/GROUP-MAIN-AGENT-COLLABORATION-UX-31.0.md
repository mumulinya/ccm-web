# 群聊主 Agent 协作体验增强 31.0

目标：让群聊主 Agent 和子 Agent 的协作过程更像 Codex / Cursor 这类 AI 编程软件，而不是把内部协议直接暴露给用户。

## 1. 子 Agent 工作单预览

任务卡新增 `work_order_preview`。

用户可以看到：

- 准备派给哪个子 Agent
- 每个子 Agent 的目标
- 允许修改范围
- 禁止事项
- 验收标准
- 当前状态：计划中、待确认、已派发、执行中、完成、失败等

这块来自：

- 主 Agent 派发证据 `assignment_evidence`
- 沙盘演练 `sandbox_rehearsal.agent_plan`
- Plan Mode 的影响范围 `plan_mode.impact_scope`

如果还没真正派发，也会展示“准备派发的工作单”，让用户在确认前知道主 Agent 打算怎么分工。

## 2. 多 Agent 执行过程展示

任务卡新增 `execution_story`，走轻量的 Cursor/Codex 风格状态线：

1. 读取项目和上下文
2. 准备子 Agent 工作单
3. 派发给子 Agent
4. 修改文件
5. 运行验证
6. 处理依赖/返工
7. 主 Agent 验收

每一步只展示用户能理解的摘要。Trace、session、receipt 原文仍在技术详情里折叠。

## 3. 主 Agent 硬验收

任务卡新增 `acceptance_review`。

用户能看到主 Agent 为什么能/不能说完成：

- 派发工作单是否存在
- 子 Agent 是否有 done 回执
- 是否有真实文件 Diff
- 是否有已执行验证
- 目标是否被主 Agent 最终复盘覆盖
- 验证来源是否可信

系统门禁也加强：

- `buildAcceptanceGate()` 新增“目标覆盖”检查。
- `canCompleteDailyDevFromDeliverySummary()` 会显式要求 `acceptance_gate.pass === true`。
- 手动标记完成时，如果 `acceptance_gate.pass !== true` 会被拒绝。

## 自测覆盖

- 任务卡能展示工作单预览。
- 任务卡能展示执行过程。
- 任务卡能展示硬验收区。
- 没有真实文件 Diff / 没有已执行验证时，验收区会显示缺口，不能宣布完成。

## 用户体验边界

- 普通问答不显示这些开发任务区块。
- 项目分析仍然只读回答。
- 开发任务才显示工作单、执行过程和验收区。
- 内部协议不直接展示给普通用户。
