# 计划执行核对 v1

## 目标

参考 Claude Code 的 plan mode / exit-plan 执行链路，让用户确认计划后，不只看到“任务完成”，还能看到主 Agent 是否把最终执行结果与原计划逐项核对。

## 实现

- 群聊任务卡新增 `ccm-main-agent-plan-alignment-v1`，从执行前计划、工作单、真实文件改动、验证记录和主 Agent 验收结果生成“计划执行核对”。
- 前端统一任务卡新增“计划执行核对”区块，展示计划项是否落实、证据是什么、是否还有偏离或待补证据。
- 全局 mission、全局历史 run、项目直连任务卡新增前端兜底推导；当后端没有直接给 `plan_alignment` 时，会从 `plan_mode`、交付报告、文件改动、验证和工作项中推导。
- 技术字段、trace、原始回执仍默认留在技术详情，不进入用户主文本。

## 验证

- 后端协作 UX 自测覆盖完成态已对齐和缺证据态偏离提示。
- 统一聊天体验自测覆盖全局历史、跨项目 mission 和项目直连任务卡的计划核对。
- Playwright 渲染回归覆盖群聊完成卡和全局历史完成卡的“计划执行核对”真实显示。
- 本轮关键截图：`scratch/render-regression/03-technical-details-folded.png`。
