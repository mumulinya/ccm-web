# CCM 记忆系统对齐 Claude Code 长期目标：Phase 3

日期：2026-07-07

## 本阶段目标

在 Phase 2 的 `MEMORY.md` 类型化索引基础上，补齐 Claude Code 风格的智能召回卫生：

- 跨轮 `alreadySurfaced` 去重，避免同一子 Agent 每轮都塞入同一批长期记忆。
- 近期工具去噪诊断，让工具文档类记忆在已使用该工具时降权，而工具警告/失败经验仍可保留。
- 严格 `ignore memory` 语义：用户要求忽略记忆时，子 Agent 记忆包必须按空 `MEMORY.md` 和空群聊记忆处理。

## 实现

- `backend/modules/collaboration/group-memory-index.ts`
  - 新增 `.recall-ledger.json` 召回账本。
  - 新增 `getAlreadySurfacedGroupTypedMemory()`。
  - 新增 `recordGroupTypedMemoryRecall()`。
  - 导出 `shouldIgnoreGroupMemoryRequest()`，作为统一 ignore-memory 检测入口。
  - `buildGroupTypedMemoryRecall()` 增加 `diagnostics`，记录低分、已 surfaced、工具去噪等召回决策信息。

- `backend/modules/collaboration/memory.ts`
  - `buildAgentMemoryContextBundle()` 自动读取召回账本，并把历史 surfaced 文档作为 `alreadySurfaced` 传入 typed-memory recall。
  - 本轮成功召回的 typed-memory 文档会写回账本，供下一轮去重。
  - 任务文本明确要求忽略记忆时，直接返回最小空记忆包，不同步、不召回、不渲染旧目标、摘要、事实锚点、文件线索或 typed memory 内容。

## 稳定记忆

召回账本位置：

```text
<CCM_DIR>/group-memory-md/<groupId>/.recall-ledger.json
```

账本按子 Agent scope 记录 surfaced 文档，字段包括 `firstAt`、`lastAt`、`count`、`lastQueryHash`。每个 scope 最多保留 200 条，防止长期运行无限膨胀。

`ignore memory` 是强语义：如果任务文本出现“忽略记忆 / 不使用 memory / do not use memory”等意图，本轮子 Agent 包只能包含当前任务文本、实时检查边界和回执要求。不能引用、比较、应用或提及历史记忆内容。

## 验证

```powershell
npm run check
npm run build:backend
node -e "(async()=>{const idx=require('./ccm-package/dist/modules/collaboration/group-memory-index.js').runGroupTypedMemoryIndexSelfTest(); const mem=require('./ccm-package/dist/modules/collaboration/memory.js').runGroupTypedMemoryContextSelfTest(); console.log(JSON.stringify({index:idx.pass, context:mem.pass, indexChecks:idx.checks, contextChecks:mem.checks}, null, 2)); if(!idx.pass||!mem.pass) process.exit(1);})()"
```
