# 全局 Mission 状态追问强验收展示 v1

日期：2026-07-09

## 背景

全局 mission 的执行门禁已经要求强验收证据，但用户问“现在进展怎么样”时，状态面板仍可能读取旧的 `mission_summary.completed` 或 `all_passed` 字段。旧数据如果曾经把“验收结论：已通过”当成完成，就可能让用户看到乐观的完成状态。

## 改动

- `backend/modules/global/global-agent.ts`
  - 新增 `globalMissionStatusCounts`，从子任务、子任务摘要行和强验收状态重新计算全局 mission 状态。
  - 新增 `globalMissionDisplayStatus`，当父 mission 是 done 但子任务缺少强验收证据时，用户可见状态降级为“验收中”。
  - 状态追问里的全局任务进度改为显示“已通过验收”计数，而不是直接显示旧摘要里的“已完成”。
  - 弱验收 mission 的下一步会提示补齐真实验证或复核证据，再给最终交付总结。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加静态守卫，防止状态追问重新只依赖旧摘要字段。

## 用户可见效果

- 用户普通问“进展怎么样”时，不会因为旧摘要写了 `all_passed=true` 就看到“已完成”。
- 如果子任务只有裸验收结论，状态会显示“验收中”。
- 下一步会明确说明：补齐真实验证或复核证据，通过验收后再给最终交付总结。

## 自测覆盖

- `globalStatusWeakMissionStaysReviewing`
  - 父 mission 旧摘要声称完成。
  - 子任务只有“验收结论：已通过”。
  - 状态追问输出保持“验收中”，并提示补齐真实验证或复核证据。
