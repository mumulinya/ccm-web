# 主 Agent 恢复接续可见摘要 V1

## 背景

对照 `D:\claude-code` 的 resume / session restore / Todo 恢复机制后，发现本项目虽然已有任务恢复、租约恢复、原生会话续跑和 recovery check，但这些信息更多停留在日志、reasoning loop 或技术详情里。真实使用时，用户需要在任务卡上看懂：主 Agent 是否已经接上上次进度、哪些上下文被保留、还有哪些验收缺口。

## 本轮升级

- 群聊任务卡新增 `recovery_summary`，展示“恢复接续”摘要。
- 运行中 Todo 新增 `restore_task_context` 步骤，恢复时会显示“恢复上次任务上下文和未完成 Todo”。
- 主 Agent 动作注册表新增 `restore_task_context`，内部循环和权限判断能够识别恢复上下文动作。
- 前端统一任务卡渲染“恢复接续”区块，用户可见区只展示目标、状态、验收是否已重新核对，以及剩余缺口。
- 技术详情保留 recovery check 数量、恢复次数、上次状态等排查字段。
- 全局任务卡可从 `resume_count` / recovery checks 派生同一类恢复摘要，避免全局主 Agent 续跑时只有技术数字、没有用户可读解释。

## 用户体验

恢复后的任务卡会明确告诉用户：

- 主 Agent 已接上上次任务上下文。
- 原始目标、当前状态、验收条件是否已重新核对。
- 保留了多少子 Agent 会话上下文或执行队列工作项。
- 还有哪些缺口需要继续处理。

普通问话不会因此展示 Todo 或任务卡；只有已有任务/全局任务恢复证据存在时才显示恢复摘要。

## 验收点

- `runCollaborationUxSelfTest()` 覆盖 `liveTodoRestoresRecoveryContext`。
- `scripts/main-agent-decision-ui-selftest.mjs` 覆盖后端恢复摘要、前端恢复区块和全局卡片派生逻辑。
- 后续截图回归会继续检查普通问话不展示 Todo、任务展示 Todo、技术详情默认折叠等既有行为。
