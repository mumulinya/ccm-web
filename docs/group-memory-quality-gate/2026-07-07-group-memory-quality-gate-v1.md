# CCM 群聊记忆质量门禁 v1

日期：2026-07-07

## 目标

本次升级把群聊记忆压缩从“只生成摘要”推进到“摘要必须可评分、可检测漂移、失败可自动降级”。重点保护三类事实：

- 用户硬约束、验收要求、禁止项和哨兵文本不能在压缩后丢失。
- 失败、阻塞、未完成任务不能被模型摘要误写成完成。
- 子 Agent 每次新建第三方 CLI 会话时，拿到的上下文必须带有记忆质量状态。

## 实现

- `backend/modules/collaboration/group-memory-compaction.ts`
  - 新增 `evaluateGroupMemorySummaryQuality()`。
  - 质量报告 schema 为 `ccm-group-memory-quality-v1`。
  - 检查项包括：
    - `fallback_preserved`：结构化保底摘要字段必须被保留。
    - `persistent_requirements_preserved`：持久用户约束必须能从摘要或事实锚点恢复。
    - `blocked_not_marked_completed`：带 task id 的失败/阻塞任务必须留在问题域。
    - `no_ungrounded_completion`：禁止写入无原文支撑的全量完成/上线结论。
    - `summary_not_empty`：有源内容时摘要不能空洞化。
    - `no_completion_over_blockers`：源消息有阻塞时，摘要不能只表现为全量完成。
  - hybrid/model 摘要不通过质量门禁时，自动回退为 `structured-quality-fallback`。
  - 写入 `compaction.quality`、`qualityGateVersion`、`downgradedByQualityGate`、`qualityDowngradeReason`、`driftDetected`。

- `backend/modules/collaboration/memory.ts`
  - 子 Agent 记忆包的 `compaction` 增加质量字段。
  - 渲染文本增加“记忆质量”行，包含分数、状态、漂移和降级原因。
  - 自动压缩自测要求质量门禁通过。

## 稳定记忆

群聊主 Agent 在压缩历史消息时，不能只相信模型摘要。压缩结果必须先经过质量门禁；如果模型摘要丢失保底事实、丢失硬约束、把失败阻塞改写成完成，或者出现无来源的完成/上线结论，就必须自动降级到结构化保底摘要。子 Agent 上下文包必须携带质量分和降级信息，让每一次新建的第三方 Agent 会话都知道当前群聊记忆是否健康。

## 验证

建议验证命令：

```powershell
npm run check
npm run build:backend
node -e "(async()=>{const gm=require('./ccm-package/dist/modules/collaboration/group-memory-compaction.js'); const q=gm.runGroupMemoryQualityGateSelfTest(); const m=require('./ccm-package/dist/modules/collaboration/memory.js'); const auto=await m.runGroupMemoryAutoCompactionSelfTest(); console.log(JSON.stringify({quality:q.pass, autoCompact:auto.pass, q:q.checks, auto:auto.checks}, null, 2)); if(!q.pass||!auto.pass) process.exit(1);})()"
```
