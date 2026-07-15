# 群聊主 Agent 内部工作循环 5.0

目标：把群聊主 Agent 从“单次判断 + 派发”升级成稳定的内部工作循环，减少误派发、重复创建任务、验收失败后不知道下一步的问题。

## 循环阶段

固定为：

1. Observe：观察上下文
   - 读取群聊上下文
   - 只读项目代码快照
   - 查询知识库
   - 查看任务状态
2. Think：判断意图
   - 普通问答
   - 项目分析
   - 开发任务
   - 高风险治理
   - 续跑/返工
3. Plan：形成计划
   - Todo
   - Plan Mode
   - 子 Agent 工作单边界
   - 风险和权限判断
4. Act：执行动作
   - 创建任务
   - 派发子 Agent
   - 执行任务治理
   - 高风险动作必须等待确认
5. Monitor：跟踪执行
   - 读取任务状态
   - 读取子 Agent 回执
   - 读取 Diff / 文件变更
   - 读取验证结果
6. Reflect：复盘返工
   - 验收不通过时重新规划
   - 缺 Diff、缺验证、缺回执时生成返工方向
   - 子 Agent blocked 时追问或转人工确认
7. Respond：回复用户
   - 普通问答直接回复
   - 任务执行中回复进度
   - 完成后回复交付报告
   - 缺口未补齐时不能宣称完成

## 实现位置

- 后端循环模型：`buildGroupMainAgentInternalLoop()`
- 阶段定义：`GROUP_MAIN_AGENT_LOOP_STAGES`
- 普通 decision 接入：`buildMainAgentDecisionChain()`
- live 任务卡 decision 接入：`buildLiveMainAgentDecisionForTask()`
- 前端展示：`MainAgentDecisionCard.vue` 的“内部工作循环”

## 设计原则

- 普通问答：Observe / Think / Respond，Act 跳过。
- 项目分析：Observe 会读取项目快照和知识库，Act 跳过。
- 开发任务：Observe → Think → Plan → Act → Monitor → Reflect → Respond。
- 高风险治理：Act 阶段进入 `needs_confirmation`。
- 验收失败：Reflect 阶段进入 `in_progress`，提示返工或补证据。

## 用户可见效果

主 Agent 决策卡会显示轻量循环条：

- Observe
- Think
- Plan
- Act
- Monitor
- Reflect
- Respond

普通用户只看状态；技术细节仍折叠在“循环细节”和技术详情里。

## 自测覆盖

- 普通对话不进入 Act。
- 项目分析只读项目快照，Act 跳过。
- 开发任务会进入 Act / Monitor。
- 未授权任务治理会在 Act 阶段等待确认。
- 所有主 Agent decision 都带 `internal_loop`。
