# CCM 记忆系统对齐 Claude Code 长期目标：Phase 1

日期：2026-07-07

## 长期目标

CCM 的群聊主 Agent、全局 Agent、项目子 Agent 要逐步拥有接近 Claude Code 的记忆系统成熟度：可压缩、可评分、可恢复、可按当前任务召回，并且每次第三方子 Agent 新会话都能稳定拿到平台记忆上下文。

## 本阶段完成

本阶段对齐 Claude Code compaction 链路中的三块能力：

- Micro-compact：旧的长 Agent 输出不再只靠全量摘要承载，而是保存局部压缩记录、token 释放量、message id、checksum 和首尾内容。
- Post-compact reinjection：压缩后自动提取应重注入的旧文件、技能/工具、验证、阻塞线索，进入子 Agent 记忆包。
- Pre/Post compact hook：提供群聊记忆压缩前后 hook 注册机制，外部模块可注入必须保留的约束和事实锚点，并记录 hook 执行结果。

## 稳定记忆

群聊原始消息 JSON 仍然是最高保真来源，不允许被 micro-compact 直接改写。Micro-compact 只写入 `memory.compaction.microCompact` 和 `compactBoundary.post_compact_restore.microCompact`，用于减少上下文压力和辅助恢复。子 Agent 上下文必须明确提示：旧原文仍可按 message id 回溯。

压缩后重注入候选写入 `memory.compaction.postCompactReinject` 和 `compactBoundary.post_compact_restore.reinjectionPlan`。子 Agent 记忆包渲染时要显示文件、技能、验证、阻塞线索，避免全量摘要把可执行上下文压没。

Pre hook 可返回 `mustKeep`、`persistentRequirements`、`factAnchors`、`anchors`；这些会合并进持久约束和事实锚点。Post hook 会收到 summary、quality、boundary、microCompact、postCompactReinject，可做额外校验并把结果写入 `compaction.hookResults`。

## 后续路线

- Phase 2：MEMORY.md 风格索引与 user/feedback/project/reference 类型化记忆。
- Phase 3：智能召回、alreadySurfaced 去重、近期工具去噪。
- Phase 4：ignore memory 严格语义、partial compact、PTL 紧急降级。
- Phase 5：长期日志蒸馏与跨群聊/全局 Agent 共享记忆治理。

## 验证

```powershell
npm run check
npm run build:backend
node -e "(async()=>{const gm=require('./ccm-package/dist/modules/collaboration/group-memory-compaction.js'); const micro=gm.runGroupMemoryMicroCompactSelfTest(); const hook=await gm.runGroupMemoryCompactionHookSelfTest(); const q=gm.runGroupMemoryQualityGateSelfTest(); const integ=await gm.runGroupMemoryCompactionIntegrationSelfTest(); const m=require('./ccm-package/dist/modules/collaboration/memory.js'); const auto=await m.runGroupMemoryAutoCompactionSelfTest(); console.log(JSON.stringify({micro:micro.pass, hook:hook.pass, quality:q.pass, integration:integ.pass, auto:auto.pass}, null, 2)); if(!micro.pass||!hook.pass||!q.pass||!integ.pass||!auto.pass) process.exit(1);})()"
```
