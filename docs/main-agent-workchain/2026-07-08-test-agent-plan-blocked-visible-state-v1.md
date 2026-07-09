# TestAgent Plan Blocked Visible State V1

日期：2026-07-08

## 背景

TestAgent 的 `--plan-only` 预检可能返回 `valid: false`。这类情况不是普通执行中，而是“主 Agent 需要先修复交接信息，再启动真实复核”。

之前前端实时链路收到 `test_agent_execution_plan_ready` 后，会把任务 runtime 固定为 `in_progress`。用户能看到计划卡，但不容易理解 TestAgent 实际已经被预检拦住。

## 本次升级

- 群聊实时事件 `test_agent_execution_plan_ready` 会根据摘要状态设置 runtime：
  - `ready` / `recorded` -> `in_progress`
  - `blocked` -> `blocked`
- 群聊 runtime 状态标签补齐 `blocked: 受阻`。
- TestAgent plan issue 增加用户可读翻译：
  - `missing_work_dir` -> “缺少项目工作目录，请补齐 TestAgent 交接信息。”
  - 其他常见预检 code 也转成中文说明。
- 渲染回归新增“TestAgent 计划预检受阻”场景，确认用户主文本只看到中文状态和下一步动作。

## 用户可见效果

当 TestAgent plan 预检失败时，用户看到的是：

- “TestAgent 复核计划预检未通过”
- “缺少项目工作目录，请补齐 TestAgent 交接信息”
- “修复 TestAgent 工作单或项目路径后重新生成复核计划”

不会看到：

- `missing_work_dir`
- `report_json`
- `browser_har`
- 本地 artifact 路径

## 边界

这次仍只修改主 Agent / 前端展示连接层，不修改 `backend/test-agent` 的业务流程、计划生成、验证执行或产物格式。
