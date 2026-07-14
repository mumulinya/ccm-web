# 任务卡改动明细 v1

## 目标

参考 Claude Code 的 diff/任务输出体验，让群聊主 Agent 和全局主 Agent 的任务卡不只显示“改了几个文件”，还要让用户能直接看到每个子 Agent/项目产生了哪些文件改动，并能一键打开代码改动抽屉查看 diff。

## 实现

- 后端群聊任务卡新增 `ccm-main-agent-change-summary-v1`，从 `actual_file_changes`、`file_changes`、子 Agent 回执、工作项和 worker 行里归并文件改动。
- 前端统一任务卡新增“改动明细”区块，展示文件路径、Agent/项目、变更状态和加减行统计。
- 群聊任务卡的“查看改动”动作优先使用 `change_summary.files` 打开 `AgentCodeChangeDrawer`，没有文件数据时才退回协作流。
- 全局主 Agent 的任务卡同样优先使用 `change_summary`，刷新后的全局历史卡也能保留改动入口。
- 同一路径的文件改动在后端、任务卡和代码改动抽屉三层按路径合并，保留更具体的 Agent/项目标签，避免交付报告和改动明细重复展示同一个文件。
- 技术记录、trace、原始回执仍默认放在技术详情，不混进用户主文本。

## 验证

- 后端协作 UX 自测覆盖 `change_summary` 结构和查看改动动作可用性。
- 统一聊天体验自测覆盖全局历史、跨项目 mission 和项目执行卡的改动明细。
- Playwright 渲染回归覆盖群聊任务卡和全局历史任务卡的“改动明细”真实显示。
- Playwright 交互回归会点击群聊任务卡里的文件行，打开 `AgentCodeChangeDrawer`，确认同一路径只展示一次、项目上下文存在、inline diff 可见。
- 本轮真实渲染截图输出包括 `scratch/render-regression/03-technical-details-folded.png` 和 `scratch/render-regression/04-code-change-drawer-open.png`，已确认技术详情默认折叠、改动明细没有重复文件、抽屉能展示代码差异。
