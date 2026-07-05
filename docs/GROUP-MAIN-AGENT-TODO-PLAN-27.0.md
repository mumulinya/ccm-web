# 群聊主 Agent Todo / Plan 展示 终极版

本轮目标：让群聊主 Agent 像 Codex/Cursor/Claude Code 一样，在回复和执行前展示用户能看懂的计划，而不是只展示内部动作链。

## 参考 Claude Code 的点

参考路径：`D:\claude-code`

- `docs/tools/task-management.mdx`
- `docs/safety/plan-mode.mdx`
- `src/tools/TodoWriteTool/TodoWriteTool.ts`
- `src/utils/todo/types.ts`

核心借鉴：

- Todo 是完整列表，由 Agent 持续维护。
- Todo 状态至少包含 `pending / in_progress / completed`。
- 复杂任务要有验证/验收步骤，避免没有验证就总结。
- Plan Mode 的思想是：先理解和只读探索，再进入执行。
- 用户看到计划和状态，内部工具协议不直接暴露给普通用户。

CCM 没有直接复刻 Claude Code 的 TodoWrite 工具，而是在 `main_agent_decision` 上实现自己的用户级计划结构。

## 后端数据结构

`main_agent_decision` 新增：

```json
{
  "user_plan_steps": [
    {
      "id": "understand_intent",
      "content": "确认用户这句话是普通询问、项目分析还是开发任务",
      "activeForm": "正在判断用户意图",
      "status": "completed",
      "detail": ""
    }
  ],
  "todo_plan": {
    "title": "我准备这样处理",
    "source": "cc-style-todo",
    "strategy": "完整列表替换；普通用户看计划步骤，内部 Action/Trace 折叠",
    "verification_nudge": false,
    "steps": []
  }
}
```

状态：

- `pending`：待执行
- `in_progress`：进行中
- `completed`：已完成
- `skipped`：跳过
- `needs_confirmation`：需要用户确认

## 不同场景的计划

### 普通询问

- 确认意图
- 读取群聊上下文
- 判断是否需要派发：跳过
- 直接回复用户

不会创建任务卡，也不会派发子 Agent。

### 项目分析

- 确认意图
- 读取群聊上下文
- 只读读取项目结构和代码快照
- 查询知识库
- 判断是否派发：跳过
- 整理回复

只读，不修改项目。

### 开发任务

- 确认意图
- 读取群聊上下文
- 确认项目和代码范围
- 创建项目任务卡
- 派发子 Agent
- 等待子 Agent 回执
- 主 Agent 验收并回复

保留验收步骤，避免“派发了就算完成”。

### 任务治理

- 确认意图
- 读取群聊上下文
- 查看任务状态
- 等待用户明确确认停止/取消/归档/删除
- 说明结果

高风险动作不因普通聊天自动执行。

## 前端展示

### 决策卡

`MainAgentDecisionCard.vue` 新增“我准备这样处理”计划区。

普通用户默认看到：

- 每一步做什么
- 当前状态
- 需要确认或跳过的原因

内部字段仍然放在“技术详情”里折叠。

### 群聊顶部

`GroupChat.vue` 的“主 Agent 状态”里新增计划预览：

```text
计划 3/6：派发给 2 个子 Agent 执行
```

用户不用展开详情，也能知道主 Agent 当前卡在哪一步。

## 自测

脚本：

```powershell
node scripts/main-agent-decision-ui-selftest.mjs
```

覆盖：

- 后端生成 `user_plan_steps`
- 后端生成 `todo_plan.source = cc-style-todo`
- 普通对话跳过派发
- 开发任务显示创建任务完成、派发进行中
- 治理动作显示需要确认
- 前端决策卡展示 Todo/Plan
- 群聊顶部展示计划预览

## 后续可增强

- 长任务中根据子 Agent 回执实时更新每个 Todo 的状态。
- 给计划步骤绑定 Trace ID，点击某一步能展开对应技术证据。
- 对复杂任务增加“验收未完成时禁止最终完成”的 UI 提醒。
