# Work Item ActiveForm Visible V1

## 背景

参考 `D:\claude-code\docs\tools\task-management.mdx` 和 `D:\claude-code\src\components\Spinner.tsx`，CC 的任务模型会把 `activeForm` 作为进行时文案展示；缺省时回退到 `subject`。这个细节能让用户等待时看到“正在做什么”，而不是只看到“要做什么”。

本项目后端工作项已经规范化了 `activeForm/active_form`，但群聊主 Agent 和全局主 Agent 的共享任务卡只显示工作项标题、状态和证据，缺少稳定的进行时说明。

## 本次升级

- `TaskExperienceCard.vue` 增加 `workItemActiveForm`，优先读取 `activeForm/active_form/current_focus`。
- 当工作项缺少进行时文案时，根据状态提供友好兜底：
  - 执行中：`正在处理：...`
  - 等待中：`等待处理：...`
  - 已完成：`已完成：...`
  - 受阻/失败：`需要处理：...`
- 执行队列中的每个工作项现在会显示 `当前：...`。
- “下一步可派发”中的已解锁工作项也会显示 `当前：...`，让用户知道主 Agent 接下来会派发什么。
- 展示文案继续经过 `sanitizeUserFacingAgentText`，内部协议、路径、id 等技术信息仍默认隐藏或放入技术详情。

## 回归覆盖

- 群聊任务卡：断言执行队列可见 `已完成 owner 筛选接口`、`等待接入 owner 筛选 UI`。
- 群聊任务卡：断言“下一步可派发”区域可见 `等待接入 owner 筛选 UI`。
- 全局主 Agent 流卡片：断言执行队列可见 `正在修复登录状态恢复`。
- 全局主 Agent 流卡片：断言“下一步可派发”区域可见 `等待接入 owner 筛选 UI`。
- Playwright 截图回归新增：
  - `03f-group-work-item-active-form.png`
  - `07c-global-work-item-active-form.png`

## 边界

- 本次只连接主 Agent 展示链路，不修改 `backend/test-agent` 的业务流程。
- 普通问话仍不展示 Todo/工作项计划。
- 技术详情仍默认折叠，用户可读区域只展示友好状态文案。
