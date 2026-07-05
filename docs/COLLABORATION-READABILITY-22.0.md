# 群聊协作可理解性 22.0

目标：让群聊多 Agent 开发不再像内部协议日志，而像 AI 编程软件里的任务进度卡。用户重点看到“谁在做、做到哪、改了什么、卡在哪、下一步是什么”，内部 Trace、回执、session、scratchpad 继续放进技术详情。

## 本轮新增

### 0. 任务意图门禁

即使前端进入了“项目任务”模式，后端也会先判断用户消息是否真的需要项目执行：

- “你好”“这个知识库怎么用？”这类普通对话不创建持久任务，不展示任务卡。
- “这个是什么项目”“项目架构怎么样？”这类项目/知识库相关询问进入只读项目分析，不创建任务卡，不派发子 Agent。
- “帮我新增支付接口并改前端页面”“修复登录报错”“检查项目构建失败”这类明确执行需求才进入任务卡。
- 历史上误创建的问候类任务卡会通过 `visible:false` 在群聊中隐藏。

### 0.1 三态输入模式

群聊输入栏支持三种模式：

- `对话`：普通聊天、解释、知识问答；只回复，不创建任务。
- `项目分析`：主 Agent 读取 CCM 已有项目配置、项目记忆、目录摘要和知识库召回，做只读分析；不创建任务、不派发、不修改。
- `项目任务`：只有明确开发/修改/检查/部署/执行类需求才创建任务卡并进入多 Agent 协作。

如果用户在“项目任务”模式里发的是项目询问，后端会自动降级为“项目分析”；如果只是问候，则降级为普通对话。

### 1. 一张持续更新的任务卡

后端 `buildTaskCardView` 继续作为统一任务卡出口，并新增用户级字段：

- `visible`：任务卡展示门禁。普通问候、普通询问、知识解释不会展示任务卡；只有明确开发/修改/检查/部署/执行类需求，或已经产生真实协作/执行证据时才展示。
- `workflow_timeline`：主 Agent / 子 Agent / 验收 / 恢复等自然语言步骤。
- `agent_questions`：子 Agent 向子 Agent 提问、回答、采纳与续跑状态。
- `conflict_warnings`：跨 Agent 潜在文件/范围冲突与系统保护动作。

前端 `TaskExperienceCard` 直接展示这些字段，避免在群聊消息里散落多张内部协议气泡。

### 2. Agent 工作流时间线

将已有 `workflow_timeline` 里的技术事件映射成用户看得懂的阶段：

- 主 Agent 已接收任务
- 主 Agent 已制定协作计划
- 已预判潜在修改冲突
- 已派发给子 Agent
- 子 Agent 开始处理 / 返工
- 子 Agent 提交结果
- 主 Agent 正在验收
- 已检查交付质量

内部词如 `CCM_AGENT_RECEIPT`、`Trace`、`session`、`scratchpad` 不进入用户级时间线。

### 3. Agent 问答可视化

`delivery_summary.agent_qa` 会被归一化为简洁行：

- `from → to`
- 问题摘要
- 回答摘要
- 状态：等待回答 / 已回答 / 已采纳并继续

用户能知道“前端 Agent 在等后端接口字段”这种协作关系，而不是看到大段工具协议。

### 4. 跨 Agent 冲突预判展示

已有 `conflict_plan` 会进入任务卡 `conflict_warnings`：

- 哪些 Agent 可能冲突
- 可能冲突的文件/范围
- 为什么系统改成更安全的顺序或隔离策略

这能解释“为什么没有并行跑”，降低用户误解。

## 修改文件

- `backend/modules/collaboration.ts`
  - 新增 `classifyGroupProjectTaskIntent`
  - 新增 `shouldUseProjectAnalysisMode`
  - 新增 `buildGroupProjectAnalysisContext`
  - `buildTaskCardView` 输出 `visible`，历史误任务卡可隐藏
  - 新增 `buildUserWorkflowTimeline`
  - 新增 `buildUserAgentQuestionRows`
  - 新增 `buildUserConflictWarnings`
  - `buildTaskCardView` 输出三个用户级可视化字段
  - 协作体验自测覆盖工作流、Agent QA、冲突保护

- `frontend/src/components/TaskExperienceCard.vue`
  - 展示协作流程
  - 展示 Agent 问答
  - 展示冲突保护

- `frontend/src/components/GroupChat.vue`
  - 输入栏从“两态”升级为“对话 / 项目分析 / 项目任务”
  - 默认模式改为“对话”，降低误创建任务风险

## 后续建议

1. 群聊任务卡增加“查看代码改动”内联 diff 摘要。
2. Agent 问答支持用户手动仲裁：采纳 / 驳回 / 要求补证据。
3. 冲突保护继续增强为文件级锁和自动排队策略。
4. 对真实 E2E 群聊任务做截图验收，检查用户是否一眼能读懂状态。
