# 全局任务会话通知与 Web 直派统一 v1

日期：2026-07-11

## 目标

补齐全局主 Agent 在后台持续执行期间的用户感知链路，并把旧 Web 直派入口统一到已存在的计划、执行、TestAgent、抽查和总结工作链：

`用户需求 -> 持久任务 -> 持续监督 -> 等待/失败/取消/完成通知 -> 会话历史恢复 -> 用户继续处理`

普通问话仍直接回答，不展示 Todo；任务信息展示在用户可读任务卡中，运行 ID、Trace、原始工作单、协议字段和底层执行记录默认放在折叠的技术详情中。

## 原问题

- Web 的旧 `send_project_cmd` 直接调用 `/api/send`，第三方代码 Agent 返回输出后就结束，绕过持久监督、TestAgent 和最终总结。
- Web 的旧 `send_group_cmd` 没有明确标记为项目任务，可能绕过群聊主 Agent 的任务链。
- 全局任务只有完成时追加会话通知；等待用户、失败和取消没有稳定的会话终态。
- 通知没有按任务和状态使用稳定 ID，历史同步或轮询可能产生重复消息。
- 已取消任务在页面重载后可能重新启动轮询。
- 新通知类型虽然写入了历史，但页面模板仍只识别旧 `global_mission_complete`，导致结构化任务卡不显示。

## 对照 Claude Code

参考 `D:\claude-code\src\coordinator\coordinatorMode.ts` 的任务通知约定：执行成员只在明确的 `completed`、`failed`、`killed` 终态发出完成通知，过程进度不能冒充终态。

参考 `D:\claude-code\src\cli\print.ts` 的状态处理：只有带明确终态状态的任务事件才结束当前任务；等待和过程消息继续保留上下文。

参考 `D:\claude-code\src\bridge\bridgeMain.ts` 的完成记录和清理方式：已结束工作需要去重并停止继续跟踪。

本次把这些原则接入 CCM 已有的全局 mission、supervisor、agentic run、历史合并和统一任务卡，没有复制 Claude Code 的界面实现。

## 实现

### 1. 会话通知状态机

- 新增统一状态判定，优先级为：`cancelled -> failed -> waiting_user -> completed -> active`。
- 只有 mission、supervisor 和关联 run 都完成时才生成完成通知，避免子链未收尾就提前宣布完成。
- 等待用户、完成、失败和取消都会写入会话历史。
- 通知 ID 固定为 `global-mission-notification:<mission>:<state>`；同一任务同一状态只更新，不重复追加。
- 后端历史与本地历史合并后仍按稳定 ID 去重。

### 2. 轮询与终态清理

- 等待用户时保留任务跟踪，用户补充后可以继续同一条工作链。
- 完成、失败和取消后停止 mission 轮询。
- 页面恢复历史时，不再为 `done`、`completed`、`failed`、`cancelled` 或 `canceled` 的任务重新启动轮询。
- 取消和失败不再被改写成通用完成文案。

### 3. 旧 Web 入口统一

- `send_project_cmd` 不再调用 `/api/send`，改为创建单项目持续监督 mission。
- 单项目任务要求实际验证、TestAgent 独立复核和主 Agent 完成前抽查；派发成功只表示进入任务链，不表示完成。
- 只读检查或仅运行测试的需求不会被错误标记为必须修改代码。
- `send_group_cmd` 明确携带 `project_task`、`force_task`、`auto_execute` 和全局直派上下文，进入群聊主 Agent 的计划、执行、验收和总结链。
- Web 主文本不再拼接第三方 Agent 的原始输出。

### 4. 用户可见任务卡

- `global_mission_waiting_user` 和 `global_mission_terminal` 进入与运行中任务相同的统一任务卡。
- 等待态直接展示需要补充的登录地址、测试账号或其他具体条件。
- 等待态只保留一个“补充确认”入口，不再同时显示两个含义相近的按钮。
- 等待态使用“当前进展”和“收到信息后继续验证”，不误写成已经完成。
- 取消态使用“任务已停止，未继续验证”和“需要时可以重新发起”，不误写成待补验证。
- supervisor ID、Trace 和协议字段仅存在于折叠技术详情，主文本不可见。

## 验证

- `node scripts/unified-chat-task-experience-selftest.mjs`：通过，覆盖完成信号合取、等待/取消状态、同状态幂等和历史合并去重。
- `node scripts/main-agent-decision-ui-selftest.mjs`：通过，覆盖旧入口统一、通知持久化、统一任务卡和新截图。
- 前端生产构建：通过。
- Playwright 真实渲染回归：32 张截图通过。
- 新增等待通知截图：`scratch/render-regression/07j-global-mission-waiting-user-notification.png`。
- 新增取消通知截图：`scratch/render-regression/07k-global-mission-cancelled-notification.png`。
- 人工检查两张新图：卡片完整、状态和下一步明确、无重复按钮、无内部字段泄漏、技术详情默认折叠。
- 普通问话不显示 Todo 的原有截图和回放门继续保留。

## 边界

- 本轮没有修改 `backend/test-agent/**`；TestAgent 内部实现继续由负责该模块的并行 Agent 维护。
- 当前工作区存在其他并行任务和构建产物修改，本轮不回退、不覆盖，也不提前提交。
