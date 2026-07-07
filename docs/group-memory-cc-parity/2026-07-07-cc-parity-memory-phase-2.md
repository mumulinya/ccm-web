# CCM 记忆系统对齐 Claude Code 长期目标：Phase 2

日期：2026-07-07

## 本阶段目标

在 Phase 1 的 micro-compact、压缩后重注入、pre/post compact hook 之后，本阶段补齐 Claude Code 风格的 `MEMORY.md` 入口索引和类型化 Markdown 记忆层，让群聊 JSON 机器记忆可以同步为可读、可召回、可审计的长期记忆文件。

## 实现

- 新增 `backend/modules/collaboration/group-memory-index.ts`
  - `syncGroupTypedMemoryFromGroupMemory(groupId, memory)`：从群聊 JSON 记忆同步四类 Markdown 记忆。
  - `buildGroupTypedMemoryIndex(groupId)`：生成 `MEMORY.md` 入口索引。
  - `buildGroupTypedMemoryRecall(groupId, query, options)`：按当前任务召回最多 5 条相关记忆。
  - `renderGroupTypedMemoryRecall(recall)`：渲染到子 Agent 上下文。
  - `runGroupTypedMemoryIndexSelfTest()`：验证索引、四类型文档、召回和 ignore-memory 语义。

- 更新 `backend/modules/collaboration/memory.ts`
  - `buildAgentMemoryContextBundle()` 会同步 typed memory 文件，并基于本轮任务召回相关 Markdown 记忆。
  - 子 Agent 记忆包增加“类型化记忆索引”和“类型化长期记忆”段落。
  - 新增 `runGroupTypedMemoryContextSelfTest()`，验证真实 bundle 渲染中能看到召回内容。

## 存储布局

```text
<CCM_DIR>/group-memory-md/<groupId>/
├── MEMORY.md
├── user-requirements.md
├── project-context.md
├── feedback-failures.md
└── reference-artifacts.md
```

四类记忆：

- `user`：用户硬约束、验收要求、群聊目标。
- `feedback`：阻塞、失败、返工、不要重复的协作问题。
- `project`：群聊目标、关键决策、下一步、压缩摘要。
- `reference`：事实锚点、文件线索、技能/工具线索、验证线索。

## 稳定记忆

`MEMORY.md` 只是入口索引，不承载完整记忆内容。完整记忆放在同目录下的类型化 Markdown 文件，每个文件带 frontmatter：`name`、`description`、`type`、`source`、`group_id`、`updated_at`、`checksum`。

子 Agent 每次新会话启动时，平台会把群聊 JSON 记忆同步为 Markdown typed memory，再按当前任务召回相关条目。召回内容仍需遵守漂移防御：如果记忆中提到具体文件、函数或 flag，使用前必须检查当前仓库状态。

如果任务文本明确要求忽略记忆，typed-memory 召回按空 `MEMORY.md` 处理，不注入 recalled docs，并在上下文中声明本轮忽略记忆。

## 验证

```powershell
npm run check
npm run build:backend
node -e "(async()=>{const idx=require('./ccm-package/dist/modules/collaboration/group-memory-index.js').runGroupTypedMemoryIndexSelfTest(); const mem=require('./ccm-package/dist/modules/collaboration/memory.js').runGroupTypedMemoryContextSelfTest(); console.log(JSON.stringify({index:idx.pass, context:mem.pass, indexChecks:idx.checks, contextChecks:mem.checks}, null, 2)); if(!idx.pass||!mem.pass) process.exit(1);})()"
```
